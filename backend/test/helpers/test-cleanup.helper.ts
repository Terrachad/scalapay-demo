import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface TestCleanupTracker {
  userIds: string[];
  paymentIds: string[];
  transactionIds: string[];
}

export class TestCleanupHelper {
  private dataSource: DataSource;

  constructor(private app: INestApplication) {
    this.dataSource = this.app.get('DataSource');
  }

  /**
   * Clean up test data in the correct order (respecting foreign key constraints)
   */
  async cleanup(tracker: TestCleanupTracker): Promise<void> {
    try {
      // Clean up payments first (they reference transactions)
      if (tracker.paymentIds.length > 0) {
        await this.batchDelete('payments', tracker.paymentIds);
      }

      // Clean up transactions (they reference users)
      if (tracker.transactionIds.length > 0) {
        await this.batchDelete('transactions', tracker.transactionIds);
      }

      // Clean up users last
      if (tracker.userIds.length > 0) {
        await this.batchDelete('users', tracker.userIds);
      }

      console.log(`Cleaned up test data: ${tracker.userIds.length} users, ${tracker.transactionIds.length} transactions, ${tracker.paymentIds.length} payments`);
    } catch (error) {
      console.error('Error during test cleanup:', error);
      throw error;
    }
  }

  /**
   * Batch delete records for performance
   */
  private async batchDelete(tableName: string, ids: string[], batchSize: number = 100): Promise<void> {
    if (ids.length === 0) return;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');
      
      await this.dataSource.query(
        `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
        batch
      );
    }
  }

  /**
   * Clean up all test data created after a specific timestamp
   */
  async cleanupByTimestamp(cutoffTime: Date): Promise<void> {
    try {
      // Clean up in reverse dependency order
      const queries = [
        `DELETE FROM payments WHERE createdAt >= ?`,
        `DELETE FROM transactions WHERE createdAt >= ?`,
        `DELETE FROM users WHERE createdAt >= ? AND email LIKE '%test%'`,
      ];

      for (const query of queries) {
        await this.dataSource.query(query, [cutoffTime]);
      }

      console.log(`Cleaned up test data created after ${cutoffTime.toISOString()}`);
    } catch (error) {
      console.error('Error during timestamp-based cleanup:', error);
      throw error;
    }
  }

  /**
   * Create a unique test email to avoid conflicts
   */
  static createTestEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  /**
   * Track a resource ID for cleanup
   */
  static trackResource(tracker: TestCleanupTracker, type: 'user' | 'payment' | 'transaction', id: string): void {
    switch (type) {
      case 'user':
        tracker.userIds.push(id);
        break;
      case 'payment':
        tracker.paymentIds.push(id);
        break;
      case 'transaction':
        tracker.transactionIds.push(id);
        break;
    }
  }

  /**
   * Create a new cleanup tracker
   */
  static createTracker(): TestCleanupTracker {
    return {
      userIds: [],
      paymentIds: [],
      transactionIds: [],
    };
  }
}