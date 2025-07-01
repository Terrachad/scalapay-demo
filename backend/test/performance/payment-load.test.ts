import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Payment System Load Testing', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserIds: string[] = [];
  let testPaymentIds: string[] = [];

  beforeAll(async () => {
    // Use existing database
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate for load testing
    const testEmail = `loadtest-${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: testEmail,
      password: 'loadtest123',
      name: 'Load Test User',
    });

    testUserIds.push(registerResponse.body.user.id);

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: testEmail,
      password: 'loadtest123',
    });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up load test data
    const dataSource = app.get('DataSource');
    
    try {
      // Clean up payments created during load tests
      if (testPaymentIds.length > 0) {
        // Use batch deletion for performance
        const batchSize = 100;
        for (let i = 0; i < testPaymentIds.length; i += batchSize) {
          const batch = testPaymentIds.slice(i, i + batchSize);
          await dataSource.query(
            `DELETE FROM payments WHERE id IN (${batch.map(() => '?').join(',')})`,
            batch
          );
        }
      }

      // Clean up users
      if (testUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM users WHERE id IN (${testUserIds.map(() => '?').join(',')})`,
          testUserIds
        );
      }
    } catch (error) {
      console.error('Error cleaning up load test data:', error);
    }

    await app.close();
  });

  describe('Payment Intent Creation Load Test', () => {
    it('should handle 100 concurrent payment intent creations', async () => {
      const concurrentRequests = 100;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        request(app.getHttpServer())
          .post('/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 1000 + index,
            currency: 'usd',
            metadata: { loadTest: true, requestId: index },
          }),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.amount).toBe(1000 + index);
      });

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(100); // Average response time < 100ms

      console.log(`Load Test Results:
        - Concurrent Requests: ${concurrentRequests}
        - Total Duration: ${duration}ms
        - Average Response Time: ${avgResponseTime}ms
        - Requests per Second: ${(concurrentRequests / (duration / 1000)).toFixed(2)}
      `);
    });

    it('should maintain performance under sustained load', async () => {
      const batchSize = 20;
      const batches = 5;
      const results: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const startTime = Date.now();

        const promises = Array.from({ length: batchSize }, (_, index) =>
          request(app.getHttpServer())
            .post('/payments/intent')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              amount: 2000 + batch * batchSize + index,
              currency: 'usd',
              metadata: { batch, index },
            }),
        );

        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const batchDuration = endTime - startTime;

        // Verify batch success
        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });

        results.push(batchDuration);

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Performance should remain consistent
      const avgBatchTime = results.reduce((a, b) => a + b) / results.length;
      const maxBatchTime = Math.max(...results);
      const variance = maxBatchTime - Math.min(...results);

      expect(avgBatchTime).toBeLessThan(2000); // Average batch time < 2s
      expect(variance).toBeLessThan(1000); // Variance < 1s (consistent performance)

      console.log(`Sustained Load Results:
        - Batches: ${batches} x ${batchSize} requests
        - Average Batch Time: ${avgBatchTime}ms
        - Performance Variance: ${variance}ms
      `);
    });
  });

  describe('Payment Processing Load Test', () => {
    let paymentIntents: string[] = [];

    beforeAll(async () => {
      // Create payment intents for processing test
      const createPromises = Array.from({ length: 50 }, (_, index) =>
        request(app.getHttpServer())
          .post('/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 5000 + index,
            currency: 'usd',
            metadata: { processingTest: true },
          }),
      );

      const responses = await Promise.all(createPromises);
      paymentIntents = responses.map((response) => response.body.paymentIntentId);
    });

    it('should handle concurrent payment confirmations', async () => {
      const startTime = Date.now();

      const confirmPromises = paymentIntents.slice(0, 25).map((paymentIntentId) =>
        request(app.getHttpServer())
          .post(`/payments/${paymentIntentId}/confirm`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            paymentMethodId: 'pm_card_visa',
          }),
      );

      const responses = await Promise.allSettled(confirmPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Count successful confirmations
      const successCount = responses.filter(
        (response) => response.status === 'fulfilled' && (response.value as any).status === 200,
      ).length;

      expect(successCount).toBeGreaterThan(20); // At least 80% success rate
      expect(duration).toBeLessThan(15000); // Complete within 15 seconds

      console.log(`Payment Confirmation Load:
        - Attempted: ${confirmPromises.length}
        - Successful: ${successCount}
        - Success Rate: ${((successCount / confirmPromises.length) * 100).toFixed(2)}%
        - Duration: ${duration}ms
      `);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should handle high-frequency payment queries', async () => {
      const queryCount = 200;
      const startTime = Date.now();

      const queryPromises = Array.from({ length: queryCount }, () =>
        request(app.getHttpServer())
          .get('/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 10 }),
      );

      const responses = await Promise.all(queryPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all queries succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      // Database performance assertions
      expect(duration).toBeLessThan(5000); // Complete within 5 seconds
      const avgQueryTime = duration / queryCount;
      expect(avgQueryTime).toBeLessThan(25); // Average query time < 25ms

      console.log(`Database Query Performance:
        - Queries: ${queryCount}
        - Total Duration: ${duration}ms
        - Average Query Time: ${avgQueryTime}ms
        - Queries per Second: ${(queryCount / (duration / 1000)).toFixed(2)}
      `);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during load testing', async () => {
      const initialMemory = process.memoryUsage();

      // Perform intensive operations
      for (let batch = 0; batch < 10; batch++) {
        const promises = Array.from({ length: 50 }, (_, index) =>
          request(app.getHttpServer())
            .post('/payments/intent')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              amount: 1000 + batch * 50 + index,
              currency: 'usd',
              metadata: { memoryTest: true, batch, index },
            }),
        );

        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Memory increase should be reasonable
      expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase

      console.log(`Memory Usage Analysis:
        - Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)
      `);
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rate under stress', async () => {
      const totalRequests = 300;
      const promises: Promise<any>[] = [];

      // Mix of different request types
      for (let i = 0; i < totalRequests; i++) {
        if (i % 3 === 0) {
          // Payment intent creation
          promises.push(
            request(app.getHttpServer())
              .post('/payments/intent')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: 1000 + i,
                currency: 'usd',
              }),
          );
        } else if (i % 3 === 1) {
          // Payment query
          promises.push(
            request(app.getHttpServer())
              .get('/payments')
              .set('Authorization', `Bearer ${authToken}`)
              .query({ limit: 5 }),
          );
        } else {
          // User profile query
          promises.push(
            request(app.getHttpServer())
              .get('/users/profile')
              .set('Authorization', `Bearer ${authToken}`),
          );
        }
      }

      const results = await Promise.allSettled(promises);

      const successful = results.filter(
        (result) => result.status === 'fulfilled' && (result.value as any).status < 400,
      ).length;

      const errorRate = ((totalRequests - successful) / totalRequests) * 100;

      expect(errorRate).toBeLessThan(5); // Error rate should be < 5%

      console.log(`Stress Test Results:
        - Total Requests: ${totalRequests}
        - Successful: ${successful}
        - Error Rate: ${errorRate.toFixed(2)}%
      `);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should properly throttle requests without crashing', async () => {
      const rapidRequests = 1000;
      const startTime = Date.now();

      const promises = Array.from({ length: rapidRequests }, (_, index) =>
        request(app.getHttpServer())
          .get('/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 1 }),
      );

      const responses = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = responses.filter(
        (response) => response.status === 'fulfilled' && [(response.value as any).status === 200],
      ).length;

      const rateLimited = responses.filter(
        (response) => response.status === 'fulfilled' && (response.value as any).status === 429,
      ).length;

      // Should handle rate limiting gracefully
      expect(successful + rateLimited).toBe(rapidRequests);
      expect(successful).toBeGreaterThan(0); // Some requests should succeed
      expect(rateLimited).toBeGreaterThan(0); // Some should be rate limited

      console.log(`Rate Limiting Test:
        - Total Requests: ${rapidRequests}
        - Successful: ${successful}
        - Rate Limited: ${rateLimited}
        - Duration: ${duration}ms
      `);
    });
  });
});
