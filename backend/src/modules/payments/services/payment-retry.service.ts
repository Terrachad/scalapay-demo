import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from './notification.service';

export interface RetryStrategy {
  maxRetries: number;
  delays: number[]; // in milliseconds
  backoffMultiplier: number;
}

@Injectable()
export class PaymentRetryService {
  private readonly logger = new Logger(PaymentRetryService.name);

  private readonly defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    delays: [
      24 * 60 * 60 * 1000, // 24 hours
      48 * 60 * 60 * 1000, // 48 hours
      72 * 60 * 60 * 1000, // 72 hours
    ],
    backoffMultiplier: 1.5,
  };

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processRetryQueue(): Promise<void> {
    this.logger.log('Processing payment retry queue...');

    const retryablePayments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.SCHEDULED,
        nextRetryAt: LessThan(new Date()),
        retryCount: LessThan(this.defaultRetryStrategy.maxRetries),
      },
      relations: ['transaction', 'transaction.user'],
    });

    this.logger.log(`Found ${retryablePayments.length} payments to retry`);

    for (const payment of retryablePayments) {
      await this.retryPayment(payment);
    }
  }

  async retryPayment(payment: Payment): Promise<boolean> {
    try {
      this.logger.log(`Retrying payment: ${payment.id} (attempt ${payment.retryCount + 1})`);

      const user = payment.transaction.user;

      // Check if user still has a valid payment method
      if (!user.stripeCustomerId) {
        this.logger.warn(`User ${user.id} has no Stripe customer ID, cannot retry payment`);
        await this.markPaymentAsFinalFailure(payment, 'No payment method available');
        return false;
      }

      // Get stored payment method for the user
      const paymentMethodId = payment.stripePaymentMethodId;
      if (!paymentMethodId) {
        this.logger.warn(`Payment ${payment.id} has no stored payment method`);
        await this.markPaymentAsFinalFailure(payment, 'No payment method stored');
        return false;
      }

      // Update retry count and status
      payment.retryCount += 1;
      payment.status = PaymentStatus.PROCESSING;
      await this.paymentRepository.save(payment);

      // Attempt to charge the stored payment method
      const paymentIntent = await this.stripeService.chargeStoredPaymentMethod(
        user.stripeCustomerId,
        paymentMethodId,
        Number(payment.amount),
        {
          paymentId: payment.id,
          transactionId: payment.transaction.id,
          retryAttempt: payment.retryCount,
        },
      );

      // Update payment with new intent ID
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.status = this.stripeService.mapStripeStatusToPaymentStatus(paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        payment.paymentDate = new Date();
        this.logger.log(`Payment retry successful: ${payment.id}`);

        await this.notificationService.sendPaymentRetrySuccessNotification(payment);

        this.eventEmitter.emit('payment.retry_succeeded', {
          paymentId: payment.id,
          retryCount: payment.retryCount,
        });
      } else if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure or other required actions
        await this.notificationService.sendPaymentActionRequiredNotification(
          payment,
          paymentIntent,
        );
      } else {
        // Payment failed again, schedule next retry or mark as final failure
        await this.scheduleNextRetry(payment, paymentIntent.last_payment_error?.message);
      }

      await this.paymentRepository.save(payment);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      this.logger.error(`Payment retry failed for ${payment.id}:`, error);

      await this.scheduleNextRetry(payment, (error as Error).message);
      return false;
    }
  }

  private async scheduleNextRetry(payment: Payment, errorMessage?: string): Promise<void> {
    if (payment.retryCount >= this.defaultRetryStrategy.maxRetries) {
      await this.markPaymentAsFinalFailure(payment, errorMessage || 'Max retries exceeded');
      return;
    }

    const delayIndex = Math.min(payment.retryCount, this.defaultRetryStrategy.delays.length - 1);
    const baseDelay = this.defaultRetryStrategy.delays[delayIndex];
    const jitteredDelay = baseDelay + Math.random() * 0.1 * baseDelay; // Add 10% jitter

    payment.nextRetryAt = new Date(Date.now() + jitteredDelay);
    payment.status = PaymentStatus.SCHEDULED;
    payment.failureReason = errorMessage || 'Payment failed, retry scheduled';

    await this.paymentRepository.save(payment);

    this.logger.log(`Scheduled retry for payment ${payment.id} at ${payment.nextRetryAt}`);

    this.eventEmitter.emit('payment.retry_scheduled', {
      paymentId: payment.id,
      retryAt: payment.nextRetryAt,
      retryCount: payment.retryCount,
      errorMessage,
    });
  }

  private async markPaymentAsFinalFailure(payment: Payment, reason: string): Promise<void> {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason = reason;
    payment.nextRetryAt = undefined;

    await this.paymentRepository.save(payment);

    this.logger.warn(`Payment marked as final failure: ${payment.id} - ${reason}`);

    await this.notificationService.sendFinalPaymentFailureNotification(payment);

    this.eventEmitter.emit('payment.final_failure', {
      paymentId: payment.id,
      transactionId: payment.transaction.id,
      userId: payment.transaction.user.id,
      reason,
    });
  }

  async manualRetryPayment(paymentId: string): Promise<boolean> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['transaction', 'transaction.user'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new Error('Payment already completed');
    }

    if (payment.retryCount >= this.defaultRetryStrategy.maxRetries) {
      throw new Error('Payment has exceeded maximum retry attempts');
    }

    return await this.retryPayment(payment);
  }

  async updatePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    // Update all pending payments for this user with the new payment method
    const pendingPayments = await this.paymentRepository.find({
      where: {
        transaction: { userId },
        status: PaymentStatus.SCHEDULED,
      },
    });

    for (const payment of pendingPayments) {
      payment.stripePaymentMethodId = paymentMethodId;
      await this.paymentRepository.save(payment);
    }

    this.logger.log(
      `Updated payment method for ${pendingPayments.length} pending payments for user ${userId}`,
    );
  }

  async getRetryStatistics(): Promise<{
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    pendingRetries: number;
  }> {
    const [totalRetries] = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(*)', 'count')
      .where('payment.retryCount > 0')
      .getRawOne();

    const [successfulRetries] = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(*)', 'count')
      .where('payment.retryCount > 0 AND payment.status = :status', {
        status: PaymentStatus.COMPLETED,
      })
      .getRawOne();

    const [failedRetries] = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(*)', 'count')
      .where('payment.retryCount > 0 AND payment.status = :status', {
        status: PaymentStatus.FAILED,
      })
      .getRawOne();

    const [pendingRetries] = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(*)', 'count')
      .where('payment.retryCount > 0 AND payment.status = :status', {
        status: PaymentStatus.SCHEDULED,
      })
      .getRawOne();

    return {
      totalRetries: parseInt(totalRetries.count),
      successfulRetries: parseInt(successfulRetries.count),
      failedRetries: parseInt(failedRetries.count),
      pendingRetries: parseInt(pendingRetries.count),
    };
  }
}
