import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentMethod, PaymentMethodStatus } from '../entities/payment-method.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { MerchantSettings } from '../../merchants/entities/merchant-settings.entity';
import { StripeService } from './stripe.service';
import { PaymentRetryService } from './payment-retry.service';
import { NotificationService } from './notification.service';
import { PaymentConfigService } from './payment-config.service';
import { CreditCheckService } from '../../integrations/services/credit-check.service';
import { FraudDetectionService } from '../../integrations/services/fraud-detection.service';

export interface PaymentProcessingResult {
  success: boolean;
  paymentId: string;
  amount: number;
  error?: string;
  requiresRetry: boolean;
  retryDelay?: number;
  stripePaymentIntentId?: string;
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  errors: Array<{ paymentId: string; error: string }>;
  processingTime: number;
}

export interface PaymentProcessingOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

@Injectable()
export class AutomatedPaymentProcessorService {
  private readonly logger = new Logger(AutomatedPaymentProcessorService.name);
  private isProcessing = false;
  private readonly maxConcurrentPayments = 10;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MerchantSettings)
    private merchantSettingsRepository: Repository<MerchantSettings>,
    private stripeService: StripeService,
    private paymentRetryService: PaymentRetryService,
    private notificationService: NotificationService,
    private paymentConfigService: PaymentConfigService,
    private creditCheckService: CreditCheckService,
    private fraudDetectionService: FraudDetectionService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Scheduled job to process due payments daily at 9 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processScheduledPayments(): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      this.logger.warn('Payment processing already in progress, skipping scheduled run');
      return this.createEmptyResult();
    }

    this.logger.log('Starting scheduled payment processing');
    return await this.processDuePayments({
      enableNotifications: true,
      batchSize: 50,
    });
  }

  /**
   * Process all due payments
   */
  async processDuePayments(
    options: PaymentProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    this.isProcessing = true;
    
    const {
      maxRetries = 3,
      enableNotifications = true,
      dryRun = false,
      batchSize = 100,
    } = options;

    try {
      // Get all due payments
      const duePayments = await this.getDuePayments();
      
      if (duePayments.length === 0) {
        this.logger.log('No due payments found');
        return this.createEmptyResult();
      }

      this.logger.log(`Found ${duePayments.length} due payments to process`);

      // Process payments in batches
      const results = await this.processBatchPayments(
        duePayments,
        {
          maxRetries,
          enableNotifications,
          dryRun,
          batchSize,
        }
      );

      const processingTime = Date.now() - startTime;
      
      // Emit batch processing event
      this.eventEmitter.emit('payment.batch.completed', {
        results,
        processingTime,
        timestamp: new Date(),
      });

      this.logger.log(
        `Completed payment processing: ${results.successCount} successful, ` +
        `${results.failureCount} failed, ${results.retryCount} scheduled for retry`
      );

      return results;

    } catch (error) {
      this.logger.error('Error during payment processing', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single payment
   */
  async processPayment(
    paymentId: string,
    options: PaymentProcessingOptions = {}
  ): Promise<PaymentProcessingResult> {
    const { enableNotifications = true, dryRun = false } = options;

    try {
      // Get payment with relations
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['transaction', 'transaction.user'],
      });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      if (payment.status !== PaymentStatus.SCHEDULED) {
        return {
          success: false,
          paymentId,
          amount: Number(payment.amount),
          error: `Payment status is ${payment.status}, expected SCHEDULED`,
          requiresRetry: false,
        };
      }

      // Check if payment is due
      if (new Date(payment.dueDate) > new Date()) {
        return {
          success: false,
          paymentId,
          amount: Number(payment.amount),
          error: 'Payment is not yet due',
          requiresRetry: false,
        };
      }

      // Get user's default payment method
      if (!payment.transaction?.user?.id) {
        throw new Error('Payment transaction or user not found');
      }
      const paymentMethod = await this.getValidPaymentMethod(payment.transaction.user.id);
      if (!paymentMethod) {
        return await this.handleNoPaymentMethod(payment, enableNotifications);
      }

      // Process payment via Stripe
      if (dryRun) {
        this.logger.log(`DRY RUN: Would process payment ${paymentId} for $${payment.amount}`);
        return {
          success: true,
          paymentId,
          amount: Number(payment.amount),
          requiresRetry: false,
        };
      }

      const result = await this.chargePaymentMethod(payment, paymentMethod);
      
      // Update payment status
      if (result.success) {
        await this.handleSuccessfulPayment(payment, result.stripePaymentIntentId!, enableNotifications);
      } else {
        await this.handleFailedPayment(payment, result.error!, enableNotifications);
      }

      return result;

    } catch (error) {
      this.logger.error(`Error processing payment ${paymentId}`, error);
      return {
        success: false,
        paymentId,
        amount: 0,
        error: error instanceof Error ? error.message : String(error),
        requiresRetry: true,
        retryDelay: 3600000, // 1 hour
      };
    }
  }

  /**
   * Get all due payments
   */
  private async getDuePayments(): Promise<Payment[]> {
    const now = new Date();
    
    return await this.paymentRepository.find({
      where: {
        status: PaymentStatus.SCHEDULED,
        dueDate: LessThanOrEqual(now),
      },
      relations: ['transaction', 'transaction.user'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Process payments in batches
   */
  private async processBatchPayments(
    payments: Payment[],
    options: PaymentProcessingOptions
  ): Promise<BatchProcessingResult> {
    const { batchSize = 10 } = options;
    let successCount = 0;
    let failureCount = 0;
    let retryCount = 0;
    const errors: Array<{ paymentId: string; error: string }> = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const batchPromises = batch.map(payment => 
        this.processPayment(payment.id, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const paymentResult = result.value;
          if (paymentResult.success) {
            successCount++;
          } else if (paymentResult.requiresRetry) {
            retryCount++;
          } else {
            failureCount++;
          }
          
          if (paymentResult.error) {
            errors.push({
              paymentId: paymentResult.paymentId,
              error: paymentResult.error,
            });
          }
        } else {
          failureCount++;
          errors.push({
            paymentId: 'unknown',
            error: result.reason?.message || 'Unknown error',
          });
        }
      }

      // Add delay between batches
      if (i + batchSize < payments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      totalProcessed: payments.length,
      successCount,
      failureCount,
      retryCount,
      errors,
      processingTime: 0, // Will be set by caller
    };
  }

  /**
   * Get valid payment method for user
   */
  private async getValidPaymentMethod(userId: string): Promise<PaymentMethod | null> {
    const paymentMethods = await this.paymentMethodRepository.find({
      where: {
        userId,
        status: In([PaymentMethodStatus.ACTIVE]),
      },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    // Find a usable payment method
    for (const paymentMethod of paymentMethods) {
      if (paymentMethod.canBeUsed()) {
        return paymentMethod;
      }
    }

    return null;
  }

  /**
   * Charge payment method via Stripe
   */
  private async chargePaymentMethod(
    payment: Payment,
    paymentMethod: PaymentMethod
  ): Promise<PaymentProcessingResult> {
    try {
      const paymentIntent = await this.stripeService.chargeStoredPaymentMethod(
        paymentMethod.stripeCustomerId,
        paymentMethod.stripePaymentMethodId,
        Number(payment.amount),
        {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          installmentNumber: payment.installmentNumber,
          automaticCharge: true,
          processedAt: new Date().toISOString(),
        }
      );

      // Update payment method usage
      paymentMethod.incrementUsage();
      await this.paymentMethodRepository.save(paymentMethod);

      return {
        success: true,
        paymentId: payment.id,
        amount: Number(payment.amount),
        requiresRetry: false,
        stripePaymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      this.logger.error(`Failed to charge payment method for payment ${payment.id}`, error);
      
      // Update payment method failure count
      paymentMethod.incrementFailure();
      await this.paymentMethodRepository.save(paymentMethod);

      const isRetryable = this.isRetryableError(error);
      
      return {
        success: false,
        paymentId: payment.id,
        amount: Number(payment.amount),
        error: error instanceof Error ? error.message : String(error),
        requiresRetry: isRetryable,
        retryDelay: isRetryable ? this.calculateRetryDelay(payment.retryCount) : undefined,
      };
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(
    payment: Payment,
    stripePaymentIntentId: string,
    enableNotifications: boolean
  ): Promise<void> {
    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.paymentDate = new Date();
    payment.stripePaymentIntentId = stripePaymentIntentId;
    payment.retryCount = 0;
    payment.failureReason = undefined;
    
    await this.paymentRepository.save(payment);

    // Send success notification
    if (enableNotifications) {
      await this.notificationService.sendPaymentSuccessNotification(payment);
    }

    // Emit payment success event
    this.eventEmitter.emit('payment.completed', {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      amount: payment.amount,
      timestamp: new Date(),
    });

    this.logger.log(`Payment ${payment.id} completed successfully`);
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(
    payment: Payment,
    error: string,
    enableNotifications: boolean
  ): Promise<void> {
    const retryCount = payment.retryCount + 1;
    const maxRetries = 3;

    if (retryCount <= maxRetries && this.isRetryableError(error)) {
      // Schedule retry
      payment.status = PaymentStatus.FAILED;
      payment.retryCount = retryCount;
      payment.lastRetryAt = new Date();
      payment.nextRetryAt = new Date(Date.now() + this.calculateRetryDelay(retryCount));
      payment.failureReason = error;
      
      await this.paymentRepository.save(payment);
      
      // Payment retry will be handled by the scheduled retry service
      this.logger.log(`Payment ${payment.id} will be retried automatically by scheduled job`);

      if (enableNotifications) {
        await this.notificationService.sendPaymentFailureNotification(payment);
      }

      this.logger.warn(`Payment ${payment.id} failed, scheduled for retry ${retryCount}/${maxRetries}`);

    } else {
      // Final failure
      payment.status = PaymentStatus.FAILED;
      payment.retryCount = retryCount;
      payment.lastRetryAt = new Date();
      payment.failureReason = error;
      
      await this.paymentRepository.save(payment);

      if (enableNotifications) {
        await this.notificationService.sendPaymentFailureNotification(payment);
      }

      // Emit payment failure event
      this.eventEmitter.emit('payment.failed', {
        paymentId: payment.id,
        transactionId: payment.transactionId,
        error,
        finalFailure: true,
        timestamp: new Date(),
      });

      this.logger.error(`Payment ${payment.id} failed permanently after ${retryCount} attempts`);
    }
  }

  /**
   * Handle case where user has no valid payment method
   */
  private async handleNoPaymentMethod(
    payment: Payment,
    enableNotifications: boolean
  ): Promise<PaymentProcessingResult> {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason = 'No valid payment method available';
    await this.paymentRepository.save(payment);

    if (enableNotifications) {
      await this.notificationService.sendPaymentFailureNotification(payment);
    }

    return {
      success: false,
      paymentId: payment.id,
      amount: Number(payment.amount),
      error: 'No valid payment method available',
      requiresRetry: false,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (typeof error === 'string') {
      return error.includes('insufficient_funds') || 
             error.includes('card_declined') ||
             error.includes('processing_error');
    }
    
    if (error instanceof Error) {
      return error.message.includes('insufficient_funds') ||
             error.message.includes('card_declined') ||
             error.message.includes('processing_error');
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 1 hour, 4 hours, 24 hours
    const delays = [3600000, 14400000, 86400000]; // in milliseconds
    return delays[Math.min(retryCount - 1, delays.length - 1)] || 86400000;
  }

  /**
   * Create empty batch processing result
   */
  private createEmptyResult(): BatchProcessingResult {
    return {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      errors: [],
      processingTime: 0,
    };
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    scheduledPayments: number;
    overduePayments: number;
    failedPayments: number;
    totalValue: number;
    averageAmount: number;
  }> {
    const now = new Date();
    
    const [scheduledPayments, overduePayments, failedPayments] = await Promise.all([
      this.paymentRepository.count({
        where: { status: PaymentStatus.SCHEDULED },
      }),
      this.paymentRepository.count({
        where: {
          status: PaymentStatus.SCHEDULED,
          dueDate: LessThanOrEqual(now),
        },
      }),
      this.paymentRepository.count({
        where: { status: PaymentStatus.FAILED },
      }),
    ]);

    const scheduledPaymentAmounts = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .addSelect('AVG(payment.amount)', 'average')
      .where('payment.status = :status', { status: PaymentStatus.SCHEDULED })
      .getRawOne();

    return {
      scheduledPayments,
      overduePayments,
      failedPayments,
      totalValue: parseFloat(scheduledPaymentAmounts?.total || '0'),
      averageAmount: parseFloat(scheduledPaymentAmounts?.average || '0'),
    };
  }
}