import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PaymentStatus } from '../../src/modules/payments/entities/payment.entity';

describe('Payment Workflows (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let testUserIds: string[] = [];
  let testPaymentIds: string[] = [];
  let testTransactionIds: string[] = [];

  beforeAll(async () => {
    // Use existing database
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and authenticate user
    const testEmail = `workflow-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'workflow123',
        name: 'Workflow Test User',
      })
      .expect(201);

    userId = registerResponse.body.user.id;
    testUserIds.push(userId);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'workflow123',
      })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    const dataSource = app.get('DataSource');
    
    try {
      // Clean up in reverse dependency order
      if (testPaymentIds.length > 0) {
        await dataSource.query(
          `DELETE FROM payments WHERE id IN (${testPaymentIds.map(() => '?').join(',')})`,
          testPaymentIds
        );
      }

      if (testTransactionIds.length > 0) {
        await dataSource.query(
          `DELETE FROM transactions WHERE id IN (${testTransactionIds.map(() => '?').join(',')})`,
          testTransactionIds
        );
      }

      if (testUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM users WHERE id IN (${testUserIds.map(() => '?').join(',')})`,
          testUserIds
        );
      }
    } catch (error) {
      console.error('Error cleaning up E2E test data:', error);
    }

    await app.close();
  });

  describe('Complete BNPL Purchase Flow', () => {
    it('should complete a full BNPL purchase workflow', async () => {
      // Step 1: Create a transaction (purchase)
      const createTransactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 40000, // $400.00
          currency: 'USD',
          description: 'Test BNPL Purchase',
          metadata: {
            productId: 'product_123',
            merchantId: 'merchant_456',
          },
        })
        .expect(201);

      const transactionId = createTransactionResponse.body.id;
      expect(createTransactionResponse.body.status).toBe('PENDING');

      // Step 2: Process BNPL split (should create 4 scheduled payments)
      const processBnplResponse = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/bnpl`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          installments: 4,
          firstPaymentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        })
        .expect(200);

      expect(processBnplResponse.body.payments).toHaveLength(4);
      expect(processBnplResponse.body.payments[0].amount).toBe(10000); // $100 per installment

      // Step 3: Verify scheduled payments were created
      const paymentsResponse = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: PaymentStatus.SCHEDULED })
        .expect(200);

      expect(paymentsResponse.body.data).toHaveLength(4);

      // Step 4: Process first payment immediately
      const firstPayment = paymentsResponse.body.data[0];
      const processFirstPaymentResponse = await request(app.getHttpServer())
        .post(`/payments/${firstPayment.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(200);

      expect(processFirstPaymentResponse.body.status).toBe(PaymentStatus.COMPLETED);

      // Step 5: Verify transaction status updated
      const updatedTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedTransactionResponse.body.status).toBe('PARTIALLY_PAID');

      // Step 6: Verify user credit was updated
      const userProfileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userProfileResponse.body.availableCredit).toBeLessThan(1000); // Credit reduced
    });
  });

  describe('Payment Retry Workflow', () => {
    it('should handle payment failure and retry workflow', async () => {
      // Step 1: Create a payment that will fail
      const createPaymentResponse = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          currency: 'usd',
          metadata: { testCase: 'retry_workflow' },
        })
        .expect(201);

      const paymentId = createPaymentResponse.body.id;

      // Step 2: Attempt payment with failing card
      const failPaymentResponse = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_card_chargeDeclined',
        })
        .expect(422); // Payment should fail

      // Step 3: Verify payment status is FAILED
      const failedPaymentResponse = await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(failedPaymentResponse.body.status).toBe(PaymentStatus.FAILED);

      // Step 4: Manually retry the failed payment
      const retryPaymentResponse = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(retryPaymentResponse.body.status).toBe(PaymentStatus.SCHEDULED);
      expect(retryPaymentResponse.body.retryCount).toBe(0); // Reset on manual retry

      // Step 5: Process retry with successful payment method
      const successfulRetryResponse = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(200);

      expect(successfulRetryResponse.body.status).toBe(PaymentStatus.COMPLETED);
    });
  });

  describe('Webhook Processing Workflow', () => {
    it('should handle Stripe webhook events end-to-end', async () => {
      // Step 1: Create a payment intent
      const createPaymentResponse = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 7500,
          currency: 'usd',
        })
        .expect(201);

      const paymentIntentId = createPaymentResponse.body.paymentIntentId;

      // Step 2: Simulate Stripe webhook for payment_intent.succeeded
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            amount: 7500,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              userId: userId,
              paymentId: createPaymentResponse.body.id,
            },
          },
        },
      };

      await request(app.getHttpServer())
        .post('/payments/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send(webhookEvent)
        .expect(200);

      // Step 3: Verify payment status was updated
      const updatedPaymentResponse = await request(app.getHttpServer())
        .get(`/payments/${createPaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedPaymentResponse.body.status).toBe(PaymentStatus.COMPLETED);
    });
  });

  describe('Credit Check and Fraud Detection Workflow', () => {
    it('should process credit check and fraud detection for large transactions', async () => {
      // Step 1: Create a large transaction that triggers checks
      const largeTransactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 150000, // $1,500.00 - should trigger checks
          currency: 'USD',
          description: 'Large Purchase - Triggers Checks',
          metadata: {
            requiresApproval: true,
          },
        })
        .expect(201);

      const transactionId = largeTransactionResponse.body.id;

      // Step 2: Check that transaction is in pending approval status
      const pendingTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pendingTransactionResponse.body.status).toBe('PENDING_APPROVAL');

      // Step 3: Wait for background jobs to process (credit check, fraud detection)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 4: Check transaction status after processing
      const processedTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should be either APPROVED or REJECTED based on risk assessment
      expect(['APPROVED', 'REJECTED']).toContain(processedTransactionResponse.body.status);

      // Step 5: If approved, should be able to process BNPL
      if (processedTransactionResponse.body.status === 'APPROVED') {
        const bnplResponse = await request(app.getHttpServer())
          .post(`/transactions/${transactionId}/bnpl`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            installments: 4,
            firstPaymentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })
          .expect(200);

        expect(bnplResponse.body.payments).toHaveLength(4);
      }
    });
  });

  describe('Multi-Payment Transaction Workflow', () => {
    it('should handle transaction with multiple payment installments', async () => {
      // Step 1: Create transaction
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 20000, // $200.00
          currency: 'USD',
          description: 'Multi-Payment Test',
        })
        .expect(201);

      const transactionId = transactionResponse.body.id;

      // Step 2: Set up BNPL with 4 installments
      const bnplResponse = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/bnpl`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          installments: 4,
          firstPaymentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .expect(200);

      const paymentIds = bnplResponse.body.payments.map((p: any) => p.id);

      // Step 3: Process first two payments successfully
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post(`/payments/${paymentIds[i]}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            paymentMethodId: 'pm_card_visa',
          })
          .expect(200);
      }

      // Step 4: Fail third payment
      await request(app.getHttpServer())
        .post(`/payments/${paymentIds[2]}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_card_chargeDeclined',
        })
        .expect(422);

      // Step 5: Verify transaction status
      const partiallyPaidTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(partiallyPaidTransactionResponse.body.status).toBe('PARTIALLY_PAID');

      // Step 6: Get payment summary
      const paymentSummaryResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/payment-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(paymentSummaryResponse.body.totalPaid).toBe(10000); // 2 * $50
      expect(paymentSummaryResponse.body.remainingAmount).toBe(10000);
      expect(paymentSummaryResponse.body.completedPayments).toBe(2);
      expect(paymentSummaryResponse.body.failedPayments).toBe(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle insufficient credit scenario', async () => {
      // Step 1: Check current user credit
      const userProfileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const availableCredit = userProfileResponse.body.availableCredit;

      // Step 2: Try to create transaction exceeding credit limit
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: availableCredit + 10000, // Exceed credit limit
          currency: 'USD',
          description: 'Transaction exceeding credit',
        })
        .expect(400); // Should fail with insufficient credit
    });

    it('should handle payment method attachment failure', async () => {
      const createPaymentResponse = await request(app.getHttpServer())
        .post('/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          currency: 'usd',
        })
        .expect(201);

      // Try to confirm with invalid payment method
      await request(app.getHttpServer())
        .post(`/payments/${createPaymentResponse.body.id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_invalid_method',
        })
        .expect(400);
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent payment requests', async () => {
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        request(app.getHttpServer())
          .post('/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 1000 + index * 100,
            currency: 'usd',
            metadata: { concurrencyTest: index },
          }),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.amount).toBe(1000 + index * 100);
      });
    });
  });
});
