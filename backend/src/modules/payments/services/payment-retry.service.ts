import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentConfigService } from './payment-config.service';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable()
export class PaymentRetryService {
  private readonly logger = new Logger(PaymentRetryService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paymentConfigService: PaymentConfigService,
    private stripeService: StripeService,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processFailedPayments(): Promise<void> {
    this.logger.log('Starting failed payment retry process');

    try {
      const failedPayments = await this.getRetryableFailedPayments();

      for (const payment of failedPayments) {
        await this.retryPayment(payment);
      }

      this.logger.log(`Processed ${failedPayments.length} failed payments`);
    } catch (error) {
      this.logger.error('Error processing failed payments:', error);
    }
  }

  async retryPayment(payment: Payment): Promise<boolean> {
    try {
      if (!payment.transaction) {
        throw new Error('Payment transaction not found');
      }

      // Use default config if no merchantId provided
      const config = payment.transaction.merchantId
        ? await this.paymentConfigService.getConfigForMerchant(payment.transaction.merchantId)
        : {
            paymentInterval: 'biweekly',
            gracePeriodDays: 3,
            lateFeeAmount: 25,
            maxRetries: 3,
          };

      // Check if we've exceeded max retries
      if (payment.retryCount >= config.maxRetries) {
        this.logger.warn(`Payment ${payment.id} exceeded max retries (${config.maxRetries})`);

        // Mark as permanently failed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'Maximum retry attempts exceeded';
        await this.paymentRepository.save(payment);

        return false;
      }

      // Check if enough time has passed since last retry
      const lastRetryDate = payment.lastRetryAt || payment.updatedAt;
      const daysSinceLastRetry = Math.floor(
        (Date.now() - lastRetryDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastRetry < config.retryDelayDays) {
        this.logger.debug(
          `Payment ${payment.id} not ready for retry (${daysSinceLastRetry}/${config.retryDelayDays} days)`,
        );
        return false;
      }

      this.logger.log(
        `Retrying payment ${payment.id} (attempt ${payment.retryCount + 1}/${config.maxRetries})`,
      );

      // Attempt payment
      const result = await this.attemptPayment(payment);

      // Update payment record
      payment.retryCount++;
      payment.lastRetryAt = new Date();

      if (result.success) {
        payment.status = PaymentStatus.COMPLETED;
        payment.paymentDate = new Date();
        payment.stripePaymentIntentId = result.paymentIntentId;

        this.logger.log(`Payment ${payment.id} retry successful`);
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = result.error;

        this.logger.warn(`Payment ${payment.id} retry failed: ${result.error}`);
      }

      await this.paymentRepository.save(payment);
      return result.success;
    } catch (error) {
      this.logger.error(`Error retrying payment ${payment.id}:`, error);

      // Update retry count even on error
      payment.retryCount++;
      payment.lastRetryAt = new Date();
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Retry process error';
      await this.paymentRepository.save(payment);

      return false;
    }
  }

  private async getRetryableFailedPayments(): Promise<Payment[]> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .where('payment.status = :status', { status: PaymentStatus.FAILED })
      .andWhere('payment.dueDate <= :now', { now: new Date() })
      .andWhere('payment.retryCount < :maxRetries', { maxRetries: 10 })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();
  }

  private async attemptPayment(
    payment: Payment,
  ): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
    try {
      if (!payment.transaction) {
        throw new Error('Payment transaction not found');
      }

      // For Stripe payments
      if (payment.transaction.stripePaymentIntentId) {
        const result = await this.stripeService.createPaymentIntent({
          amount: payment.amount,
          currency: 'usd',
          customerId: payment.transaction.user.stripeCustomerId,
          metadata: {
            paymentId: payment.id,
            transactionId: payment.transaction.id,
            retryAttempt: payment.retryCount + 1,
          },
        });

        return {
          success: true,
          paymentIntentId: result.paymentIntentId,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getPaymentRetryStatus(paymentId: string): Promise<{
    canRetry: boolean;
    nextRetryDate?: Date;
    retriesRemaining: number;
  }> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['transaction'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.transaction) {
      throw new Error('Payment transaction not found');
    }

    // Use default config if no merchantId provided
    const config = payment.transaction.merchantId
      ? await this.paymentConfigService.getConfigForMerchant(payment.transaction.merchantId)
      : {
          paymentInterval: 'biweekly',
          gracePeriodDays: 3,
          lateFeeAmount: 25,
          maxRetries: 3,
        };

    const retriesRemaining = Math.max(0, config.maxRetries - payment.retryCount);
    const canRetry = retriesRemaining > 0 && payment.status === PaymentStatus.FAILED;

    let nextRetryDate: Date | undefined;
    if (canRetry) {
      const lastRetryDate = payment.lastRetryAt || payment.updatedAt;
      nextRetryDate = new Date(lastRetryDate);
      nextRetryDate.setDate(nextRetryDate.getDate() + config.retryDelayDays);
    }

    return {
      canRetry,
      nextRetryDate,
      retriesRemaining,
    };
  }
}
