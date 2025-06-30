import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';

export interface PaymentProcessingJob {
  paymentId: string;
  type: 'charge' | 'retry' | 'refund';
  metadata?: any;
}

export interface NotificationJob {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  template: string;
  data: any;
}

export interface CreditCheckJob {
  userId: string;
  requestedAmount: number;
  transactionId?: string;
}

export interface FraudCheckJob {
  transactionId: string;
  userId: string;
  amount: number;
  metadata: any;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('payment-processing') 
    private paymentQueue: Queue<PaymentProcessingJob>,
    @InjectQueue('notifications') 
    private notificationQueue: Queue<NotificationJob>,
    @InjectQueue('credit-checks') 
    private creditCheckQueue: Queue<CreditCheckJob>,
    @InjectQueue('fraud-detection') 
    private fraudDetectionQueue: Queue<FraudCheckJob>,
  ) {}

  // Payment Processing Queue Methods
  async schedulePaymentProcessing(
    job: PaymentProcessingJob, 
    delay?: number,
    options?: JobOptions,
  ): Promise<void> {
    try {
      const jobOptions: JobOptions = {
        delay,
        priority: job.type === 'retry' ? 5 : 10, // Higher priority for retries
        ...options,
      };

      await this.paymentQueue.add('process-payment', job, jobOptions);
      
      this.logger.log(`Scheduled payment processing job: ${job.paymentId}, type: ${job.type}`);
    } catch (error) {
      this.logger.error(`Failed to schedule payment processing job:`, error);
      throw error;
    }
  }

  async schedulePaymentRetry(
    paymentId: string, 
    retryAt: Date,
    retryCount: number,
  ): Promise<void> {
    const delay = retryAt.getTime() - Date.now();
    
    await this.schedulePaymentProcessing(
      {
        paymentId,
        type: 'retry',
        metadata: { retryCount },
      },
      delay,
      {
        priority: 15, // High priority for retries
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
  }

  async scheduleRefund(paymentId: string, amount?: number): Promise<void> {
    await this.schedulePaymentProcessing({
      paymentId,
      type: 'refund',
      metadata: { amount },
    });
  }

  // Notification Queue Methods
  async scheduleNotification(
    job: NotificationJob,
    delay?: number,
    options?: JobOptions,
  ): Promise<void> {
    try {
      const jobOptions: JobOptions = {
        delay,
        priority: this.getNotificationPriority(job.type),
        ...options,
      };

      await this.notificationQueue.add('send-notification', job, jobOptions);
      
      this.logger.log(`Scheduled notification: ${job.type} to ${job.recipient}`);
    } catch (error) {
      this.logger.error(`Failed to schedule notification:`, error);
      throw error;
    }
  }

  async scheduleEmail(
    recipient: string,
    template: string,
    data: any,
    delay?: number,
  ): Promise<void> {
    await this.scheduleNotification({
      type: 'email',
      recipient,
      template,
      data,
    }, delay);
  }

  async scheduleReminderEmail(
    recipient: string,
    paymentId: string,
    dueDate: Date,
  ): Promise<void> {
    // Schedule reminder 24 hours before due date
    const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const delay = reminderTime.getTime() - Date.now();

    if (delay > 0) {
      await this.scheduleNotification({
        type: 'email',
        recipient,
        template: 'payment-reminder',
        data: { paymentId, dueDate },
      }, delay);
    }
  }

  // Credit Check Queue Methods
  async scheduleCreditCheck(
    job: CreditCheckJob,
    priority: number = 10,
  ): Promise<void> {
    try {
      await this.creditCheckQueue.add('perform-credit-check', job, {
        priority,
        removeOnComplete: 20,
        removeOnFail: 10,
      });
      
      this.logger.log(`Scheduled credit check for user: ${job.userId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule credit check:`, error);
      throw error;
    }
  }

  async schedulePeriodicCreditReview(userId: string): Promise<void> {
    // Schedule monthly credit review
    const monthFromNow = new Date();
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    
    await this.creditCheckQueue.add(
      'periodic-credit-review',
      { userId, requestedAmount: 0 },
      {
        delay: monthFromNow.getTime() - Date.now(),
        repeat: { cron: '0 0 1 * *' }, // First day of every month
      },
    );
  }

  // Fraud Detection Queue Methods
  async scheduleFraudCheck(
    job: FraudCheckJob,
    priority: number = 15, // High priority for fraud checks
  ): Promise<void> {
    try {
      await this.fraudDetectionQueue.add('fraud-analysis', job, {
        priority,
        removeOnComplete: 30,
        removeOnFail: 15,
      });
      
      this.logger.log(`Scheduled fraud check for transaction: ${job.transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule fraud check:`, error);
      throw error;
    }
  }

  async scheduleRiskAssessment(
    userId: string,
    transactionId: string,
    amount: number,
    metadata: any,
  ): Promise<void> {
    await this.scheduleFraudCheck({
      transactionId,
      userId,
      amount,
      metadata,
    }, 20); // Very high priority
  }

  // Queue Management Methods
  async getQueueStats(): Promise<{
    payments: any;
    notifications: any;
    creditChecks: any;
    fraudDetection: any;
  }> {
    const [paymentsStats, notificationsStats, creditStats, fraudStats] = await Promise.all([
      this.paymentQueue.getJobCounts(),
      this.notificationQueue.getJobCounts(),
      this.creditCheckQueue.getJobCounts(),
      this.fraudDetectionQueue.getJobCounts(),
    ]);

    return {
      payments: paymentsStats,
      notifications: notificationsStats,
      creditChecks: creditStats,
      fraudDetection: fraudStats,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    try {
      switch (queueName) {
        case 'payments':
          await this.paymentQueue.pause();
          break;
        case 'notifications':
          await this.notificationQueue.pause();
          break;
        case 'credit-checks':
          await this.creditCheckQueue.pause();
          break;
        case 'fraud-detection':
          await this.fraudDetectionQueue.pause();
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }
      
      this.logger.log(`Paused queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    try {
      switch (queueName) {
        case 'payments':
          await this.paymentQueue.resume();
          break;
        case 'notifications':
          await this.notificationQueue.resume();
          break;
        case 'credit-checks':
          await this.creditCheckQueue.resume();
          break;
        case 'fraud-detection':
          await this.fraudDetectionQueue.resume();
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }
      
      this.logger.log(`Resumed queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  async clearQueue(queueName: string): Promise<void> {
    try {
      switch (queueName) {
        case 'payments':
          await this.paymentQueue.empty();
          break;
        case 'notifications':
          await this.notificationQueue.empty();
          break;
        case 'credit-checks':
          await this.creditCheckQueue.empty();
          break;
        case 'fraud-detection':
          await this.fraudDetectionQueue.empty();
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }
      
      this.logger.log(`Cleared queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to clear queue ${queueName}:`, error);
      throw error;
    }
  }

  private getNotificationPriority(type: string): number {
    switch (type) {
      case 'sms':
        return 20; // Highest priority
      case 'push':
        return 15;
      case 'email':
        return 10;
      default:
        return 5;
    }
  }
}