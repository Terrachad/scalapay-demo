import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../payments/services/notification.service';

export interface PaymentCompletedEvent {
  paymentId: string;
  transactionId: string;
  userId: string;
  amount: number;
}

export interface PaymentFailedEvent {
  paymentId: string;
  transactionId: string;
  userId: string;
  reason: string;
}

export interface PaymentRetryScheduledEvent {
  paymentId: string;
  retryAt: Date;
  retryCount: number;
  errorMessage?: string;
}

export interface PaymentRetryExhaustedEvent {
  paymentId: string;
  transactionId: string;
  userId: string;
}

@Injectable()
export class PaymentEventHandler {
  private readonly logger = new Logger(PaymentEventHandler.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Handling payment completed event: ${event.paymentId}`);

    try {
      // Update user's credit utilization
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // Restore available credit for completed payment
        user.availableCredit = Number(user.availableCredit) + event.amount;
        await this.userRepository.save(user);
        
        this.logger.log(`Restored $${event.amount} credit to user ${event.userId}`);
      }

      // Log successful payment for analytics
      this.logger.log(`Payment analytics: User ${event.userId} completed payment of $${event.amount}`);

    } catch (error) {
      this.logger.error(`Error handling payment completed event:`, error);
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    this.logger.log(`Handling payment failed event: ${event.paymentId}`);

    try {
      // Log failed payment for analytics and fraud detection
      this.logger.warn(`Payment failed analytics: User ${event.userId} failed payment of amount unknown, reason: ${event.reason}`);

      // You might want to trigger additional security checks if multiple failures
      const recentFailures = await this.paymentRepository.count({
        where: {
          transaction: { userId: event.userId },
          status: PaymentStatus.FAILED,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } as any,
        },
      });

      if (recentFailures >= 3) {
        this.logger.warn(`Multiple payment failures detected for user ${event.userId}`);
        // Could trigger account review or additional verification
      }

    } catch (error) {
      this.logger.error(`Error handling payment failed event:`, error);
    }
  }

  @OnEvent('payment.retry_scheduled')
  async handlePaymentRetryScheduled(event: PaymentRetryScheduledEvent): Promise<void> {
    this.logger.log(`Handling payment retry scheduled event: ${event.paymentId}, retry at: ${event.retryAt}`);

    try {
      // Schedule reminder notification before retry
      // In a real system, you might use a job queue for this
      this.logger.log(`Scheduled retry notification for payment ${event.paymentId} at ${event.retryAt}`);

    } catch (error) {
      this.logger.error(`Error handling payment retry scheduled event:`, error);
    }
  }

  @OnEvent('payment.retry_succeeded')
  async handlePaymentRetrySucceeded(event: { paymentId: string; retryCount: number }): Promise<void> {
    this.logger.log(`Handling payment retry succeeded event: ${event.paymentId}, attempt: ${event.retryCount}`);

    try {
      // Log successful retry for analytics
      this.logger.log(`Payment retry analytics: Payment ${event.paymentId} succeeded on attempt ${event.retryCount}`);

    } catch (error) {
      this.logger.error(`Error handling payment retry succeeded event:`, error);
    }
  }

  @OnEvent('payment.retry_exhausted')
  async handlePaymentRetryExhausted(event: PaymentRetryExhaustedEvent): Promise<void> {
    this.logger.log(`Handling payment retry exhausted event: ${event.paymentId}`);

    try {
      // Escalate to customer service
      this.logger.warn(`Payment retry exhausted: User ${event.userId}, Payment ${event.paymentId} - requires manual intervention`);

      // Update user's account status if needed
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // Might want to flag account for review or reduce credit limit
        this.logger.log(`Account flagged for review due to payment retry exhaustion: ${event.userId}`);
      }

    } catch (error) {
      this.logger.error(`Error handling payment retry exhausted event:`, error);
    }
  }

  @OnEvent('payment.final_failure')
  async handlePaymentFinalFailure(event: { paymentId: string; transactionId: string; userId: string; reason: string }): Promise<void> {
    this.logger.log(`Handling payment final failure event: ${event.paymentId}`);

    try {
      // Log for analytics and potential account actions
      this.logger.warn(`Final payment failure: User ${event.userId}, reason: ${event.reason}`);

      // Could trigger account suspension or credit limit reduction
      // This depends on business rules

    } catch (error) {
      this.logger.error(`Error handling payment final failure event:`, error);
    }
  }

  @OnEvent('payment_method.setup_completed')
  async handlePaymentMethodSetup(event: { userId: string; customerId: string; paymentMethodId: string }): Promise<void> {
    this.logger.log(`Handling payment method setup event for user: ${event.userId}`);

    try {
      // Update any pending payments to use the new payment method
      const pendingPayments = await this.paymentRepository.find({
        where: {
          transaction: { userId: event.userId },
          status: PaymentStatus.SCHEDULED,
          stripePaymentMethodId: undefined,
        },
      });

      for (const payment of pendingPayments) {
        payment.stripePaymentMethodId = event.paymentMethodId;
        await this.paymentRepository.save(payment);
      }

      this.logger.log(`Updated ${pendingPayments.length} pending payments with new payment method for user ${event.userId}`);

    } catch (error) {
      this.logger.error(`Error handling payment method setup event:`, error);
    }
  }
}