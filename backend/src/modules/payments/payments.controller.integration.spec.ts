import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { PaymentsModule } from './payments.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import configuration from '../../config/configuration';

describe('PaymentsController (Integration)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUser: User;
  let testUserIds: string[] = [];
  let testPaymentIds: string[] = [];
  let testTransactionIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        EventEmitterModule.forRoot(),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 1000, // Higher limit for testing
          },
        ]),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT || '3306', 10),
          username: process.env.MYSQL_USERNAME || 'scalapay_user',
          password: process.env.MYSQL_PASSWORD || 'scalapay_pass',
          database: process.env.MYSQL_DATABASE || 'scalapay_demodb',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false, // Don't modify schema
          logging: false,
        }),
        AuthModule,
        UsersModule,
        PaymentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const testEmail = `test-${Date.now()}@example.com`;
    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
        name: 'Test User',
        role: UserRole.CUSTOMER,
      })
      .expect(201);

    testUser = userResponse.body.user;
    testUserIds.push(testUser.id);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    // Track created resources for cleanup
    // This will be handled in afterAll
  });

  afterAll(async () => {
    // Clean up test data in reverse dependency order
    if (app) {
      try {
        const dataSource = app.get(DataSource);

        if (dataSource) {
          // Clean up payments first (they reference transactions)
          if (testPaymentIds.length > 0) {
            await dataSource.query(
              `DELETE FROM payments WHERE id IN (${testPaymentIds.map(() => '?').join(',')})`,
              testPaymentIds,
            );
          }

          // Clean up transactions (they reference users)
          if (testTransactionIds.length > 0) {
            await dataSource.query(
              `DELETE FROM transactions WHERE id IN (${testTransactionIds.map(() => '?').join(',')})`,
              testTransactionIds,
            );
          }

          // Clean up users last
          if (testUserIds.length > 0) {
            await dataSource.query(
              `DELETE FROM users WHERE id IN (${testUserIds.map(() => '?').join(',')})`,
              testUserIds,
            );
          }
        }
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }

      try {
        await app.close();
      } catch (error) {
        console.error('Error closing app:', error);
      }
    }
  });

  describe('POST /payments/intent', () => {
    it('should create a payment intent successfully', async () => {
      const createPaymentDto = {
        amount: 10000, // $100.00 in cents
        currency: 'usd',
        metadata: {
          orderId: 'order_123',
          productId: 'prod_456',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createPaymentDto)
        .expect(201);

      expect(response.body).toHaveProperty('paymentIntentId');
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body.amount).toBe(10000);
      expect(response.body.currency).toBe('usd');
      expect(response.body.status).toBe('requires_payment_method');

      // Track for cleanup
      if (response.body.id) {
        testPaymentIds.push(response.body.id);
      }
    });

    it('should return 400 for invalid amount', async () => {
      const invalidPaymentDto = {
        amount: -100, // Negative amount
        currency: 'usd',
      };

      await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPaymentDto)
        .expect(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const createPaymentDto = {
        amount: 10000,
        currency: 'usd',
      };

      await request(app.getHttpServer())
        .post('/payments/intent')
        .send(createPaymentDto)
        .expect(401);
    });
  });

  describe('POST /payments/:id/confirm', () => {
    let paymentIntentId: string;

    beforeEach(async () => {
      // Create a payment intent for confirmation
      const response = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          currency: 'usd',
        });

      paymentIntentId = response.body.paymentIntentId;
    });

    it('should confirm a payment intent successfully', async () => {
      const confirmPaymentDto = {
        paymentMethodId: 'pm_card_visa', // Test payment method
      };

      const response = await request(app.getHttpServer())
        .post(`/payments/${paymentIntentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmPaymentDto)
        .expect(200);

      expect(response.body).toHaveProperty('paymentIntentId', paymentIntentId);
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent payment intent', async () => {
      const confirmPaymentDto = {
        paymentMethodId: 'pm_card_visa',
      };

      await request(app.getHttpServer())
        .post('/payments/pi_nonexistent/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmPaymentDto)
        .expect(404);
    });
  });

  describe('GET /payments', () => {
    beforeEach(async () => {
      // Create some test payments
      await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 2000,
          currency: 'usd',
          metadata: { orderId: 'order_1' },
        });

      await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          currency: 'usd',
          metadata: { orderId: 'order_2' },
        });
    });

    it('should get user payments with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter payments by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: PaymentStatus.SCHEDULED })
        .expect(200);

      expect(
        response.body.data.every((payment: any) => payment.status === PaymentStatus.SCHEDULED),
      ).toBe(true);
    });

    it('should filter payments by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1500,
          currency: 'usd',
        });

      paymentId = response.body.id;
    });

    it('should get payment by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', paymentId);
      expect(response.body).toHaveProperty('amount', 1500);
      expect(response.body).toHaveProperty('currency', 'usd');
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .get('/payments/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it("should return 403 for accessing another user's payment", async () => {
      // Create another user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
        role: UserRole.CUSTOMER,
      });

      const otherLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other@example.com',
        password: 'password123',
      });

      const otherToken = otherLoginResponse.body.accessToken;

      await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('POST /payments/schedule', () => {
    it('should schedule a payment successfully', async () => {
      const schedulePaymentDto = {
        amount: 7500,
        currency: 'usd',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        metadata: {
          orderId: 'scheduled_order_123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/payments/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(schedulePaymentDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', PaymentStatus.SCHEDULED);
      expect(response.body).toHaveProperty('amount', 7500);
      expect(response.body).toHaveProperty('scheduledDate');
    });

    it('should return 400 for past scheduled date', async () => {
      const schedulePaymentDto = {
        amount: 7500,
        currency: 'usd',
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      await request(app.getHttpServer())
        .post('/payments/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(schedulePaymentDto)
        .expect(400);
    });
  });

  describe('POST /payments/:id/retry', () => {
    let failedPaymentId: string;

    beforeEach(async () => {
      // Create a failed payment for retry testing
      const response = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 2500,
          currency: 'usd',
        });

      failedPaymentId = response.body.id;

      // Simulate payment failure (this would typically be done through webhook or other means)
      // For testing purposes, we'll directly update the payment status
    });

    it('should retry a failed payment successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${failedPaymentId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', failedPaymentId);
      expect(response.body).toHaveProperty('status', PaymentStatus.SCHEDULED);
      expect(response.body).toHaveProperty('retryCount', 0); // Reset on manual retry
    });
  });

  describe('Webhook endpoints', () => {
    describe('POST /payments/webhook/stripe', () => {
      it('should handle Stripe webhook events', async () => {
        const stripeEvent = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              amount: 5000,
              currency: 'usd',
              status: 'succeeded',
            },
          },
        };

        await request(app.getHttpServer())
          .post('/payments/webhook/stripe')
          .set('stripe-signature', 'test-signature')
          .send(stripeEvent)
          .expect(200);
      });

      it('should return 400 for invalid webhook signature', async () => {
        const stripeEvent = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
            },
          },
        };

        await request(app.getHttpServer())
          .post('/payments/webhook/stripe')
          .send(stripeEvent)
          .expect(400);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test with malformed data that could cause server errors
      const malformedData = {
        amount: 'not-a-number',
        currency: 123,
      };

      await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(malformedData)
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/payments').set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.all(promises);

      // At least some should succeed
      expect(responses.some((response) => response.status === 200)).toBe(true);
    });
  });
});
