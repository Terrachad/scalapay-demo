#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import { Transaction } from '../../src/modules/transactions/entities/transaction.entity';

/**
 * Cleanup script for test data
 * This script removes test data from the database based on email patterns and timestamps
 */
async function cleanupTestData() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'scalapay_demo',
    entities: [User, Payment, Transaction],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database for cleanup...');

    // Get timestamp for cleanup (e.g., data older than 1 hour)
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);

    // Clean up test users (identifiable by email patterns)
    const testEmailPatterns = [
      '%test%@example.com',
      '%workflow%@example.com',
      '%loadtest%@example.com',
      '%integration%@example.com',
    ];

    let totalCleaned = 0;

    for (const pattern of testEmailPatterns) {
      // Find test users
      const testUsers = await dataSource.query(
        'SELECT id FROM users WHERE email LIKE ? OR createdAt < ?',
        [pattern, cutoffTime],
      );

      if (testUsers.length > 0) {
        const userIds = testUsers.map((user: any) => user.id);

        // Clean up payments for these users
        const paymentsResult = await dataSource.query(
          `DELETE p FROM payments p 
           INNER JOIN transactions t ON p.transactionId = t.id 
           WHERE t.userId IN (${userIds.map(() => '?').join(',')})`,
          userIds,
        );

        // Clean up transactions for these users
        const transactionsResult = await dataSource.query(
          `DELETE FROM transactions WHERE userId IN (${userIds.map(() => '?').join(',')})`,
          userIds,
        );

        // Clean up users
        const usersResult = await dataSource.query(
          `DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
          userIds,
        );

        console.log(
          `Cleaned up ${usersResult.affectedRows} test users matching pattern: ${pattern}`,
        );
        console.log(`  - ${paymentsResult.affectedRows} payments`);
        console.log(`  - ${transactionsResult.affectedRows} transactions`);

        totalCleaned += usersResult.affectedRows;
      }
    }

    // Clean up orphaned test data based on metadata
    const orphanedPayments = await dataSource.query(
      `DELETE FROM payments WHERE JSON_EXTRACT(metadata, '$.loadTest') = true 
       OR JSON_EXTRACT(metadata, '$.testCase') IS NOT NULL
       OR createdAt < ?`,
      [cutoffTime],
    );

    console.log(`Cleaned up ${orphanedPayments.affectedRows} orphaned test payments`);

    console.log(`\nTotal cleanup summary:`);
    console.log(`- ${totalCleaned} test users cleaned`);
    console.log(`- ${orphanedPayments.affectedRows} orphaned payments cleaned`);
    console.log(`- Cutoff time: ${cutoffTime.toISOString()}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('Cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupTestData };
