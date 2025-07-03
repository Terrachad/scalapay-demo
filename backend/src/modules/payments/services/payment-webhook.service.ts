import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from './notification.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.requires_action':
          await this.handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'setup_intent.succeeded':
          await this.handleSetupSucceeded(event.data.object as Stripe.SetupIntent);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Handle subscription events if needed for recurring payments
          this.logger.log(`Received subscription event: ${event.type}`);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle Stripe event ${event.type}:`, error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transactionId = paymentIntent.metadata?.transactionId;
    if (!transactionId) {
      this.logger.warn(`Payment intent ${paymentIntent.id} missing transactionId in metadata`);
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user', 'merchant'],
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found: ${transactionId}`);
      return;
    }

    // Update transaction status to approved since Stripe payment succeeded
    transaction.status = TransactionStatus.APPROVED;
    await this.transactionRepository.save(transaction);

    this.logger.log(`Stripe payment succeeded for transaction: ${transactionId}, amount: $${paymentIntent.amount_received / 100}`);

    // Send success notification
    await this.notificationService.sendTransactionCompletionNotification(transaction);

    // Emit event for other services
    this.eventEmitter.emit('payment.completed', {
      paymentIntentId: paymentIntent.id,
      transactionId: transaction.id,
      userId: transaction.user?.id,
      amount: paymentIntent.amount_received / 100,
    });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transactionId = paymentIntent.metadata?.transactionId;
    if (!transactionId) {
      this.logger.warn(`Payment intent ${paymentIntent.id} missing transactionId in metadata`);
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user', 'merchant'],
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found: ${transactionId}`);
      return;
    }

    // Update transaction status to failed
    transaction.status = TransactionStatus.FAILED;
    await this.transactionRepository.save(transaction);

    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    this.logger.warn(`Stripe payment failed for transaction: ${transactionId} - ${failureReason}`);

    // For now, we'll create a simple payment record to send the notification
    // In a real implementation, you might want to handle this differently
    const payment = new Payment();
    payment.amount = paymentIntent.amount / 100;
    payment.failureReason = failureReason;
    payment.transaction = transaction;
    
    await this.notificationService.sendPaymentFailureNotification(payment);

    // Emit event for retry logic
    this.eventEmitter.emit('payment.failed', {
      paymentIntentId: paymentIntent.id,
      transactionId: transaction.id,
      userId: transaction.user?.id,
      failureReason,
    });
  }

  private async handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata?.paymentId;
    if (!paymentId) return;

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['transaction', 'transaction.user'],
    });

    if (!payment) return;

    // Send notification to user for required action
    await this.notificationService.sendPaymentActionRequiredNotification(payment, paymentIntent);

    this.logger.log(`Payment requires action: ${paymentId}`);
  }

  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata?.paymentId;
    if (!paymentId) return;

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['transaction'],
    });

    if (!payment) return;

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = 'Payment was canceled';
    await this.paymentRepository.save(payment);

    this.logger.log(`Payment canceled: ${paymentId}`);
  }

  private async handleSetupSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
    const customerId = setupIntent.customer as string;
    const paymentMethodId = setupIntent.payment_method as string;

    // Find user by Stripe customer ID and update their default payment method
    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (user) {
      // You might want to store the payment method ID in user profile
      this.logger.log(
        `Setup intent succeeded for user ${user.id}, payment method: ${paymentMethodId}`,
      );

      this.eventEmitter.emit('payment_method.setup_completed', {
        userId: user.id,
        customerId,
        paymentMethodId,
      });
    }
  }

  private async checkTransactionCompletion(transaction: Transaction): Promise<void> {
    const allPayments = await this.paymentRepository.find({
      where: { transactionId: transaction.id },
    });

    const allCompleted = allPayments.every((payment) => payment.status === PaymentStatus.COMPLETED);

    if (allCompleted && transaction.status !== TransactionStatus.COMPLETED) {
      transaction.status = TransactionStatus.COMPLETED;
      await this.transactionRepository.save(transaction);

      this.logger.log(`Transaction completed: ${transaction.id}`);

      // Send transaction completion notification
      await this.notificationService.sendTransactionCompletionNotification(transaction);

      this.eventEmitter.emit('transaction.completed', {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
      });
    }
  }

  async handlePaymentReminder(paymentId: string, reminderType: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['transaction', 'transaction.user'],
    });

    if (!payment) {
      this.logger.warn(`Payment not found for reminder: ${paymentId}`);
      return;
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Skipping reminder for completed payment: ${paymentId}`);
      return;
    }

    switch (reminderType) {
      case 'upcoming':
        await this.notificationService.sendUpcomingPaymentReminder(payment);
        break;
      case 'overdue':
        await this.notificationService.sendOverduePaymentReminder(payment);
        break;
      default:
        this.logger.warn(`Unknown reminder type: ${reminderType}`);
    }

    this.logger.log(`Sent ${reminderType} reminder for payment: ${paymentId}`);
  }
}
