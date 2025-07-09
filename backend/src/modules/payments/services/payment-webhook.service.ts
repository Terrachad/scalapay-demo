import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../shared/services/notification.service';

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
    // Try to find transaction by payment intent ID first, then by metadata
    let transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
      relations: ['user', 'merchant', 'payments'],
    });

    // Fallback to metadata lookup
    if (!transaction) {
      const transactionId = paymentIntent.metadata?.transactionId;
      if (!transactionId) {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} missing transactionId in metadata and no matching transaction found`,
        );
        return;
      }

      transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
        relations: ['user', 'merchant', 'payments'],
      });
    }

    if (!transaction) {
      this.logger.warn(`Transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update transaction status to approved since Stripe payment succeeded
    transaction.status = TransactionStatus.APPROVED;
    await this.transactionRepository.save(transaction);

    // Create or update payment record for the first installment
    let payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      // Create payment record for the first installment
      payment = new Payment();
      payment.amount = paymentIntent.amount_received / 100;
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentDate = new Date();
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.installmentNumber = 1;
      payment.transaction = transaction;
      payment.transactionId = transaction.id;
      payment.dueDate = new Date(); // First payment due immediately

      await this.paymentRepository.save(payment);
      this.logger.log(`Created payment record for first installment: ${payment.id}`);
    } else {
      // Update existing payment record
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentDate = new Date();
      await this.paymentRepository.save(payment);
      this.logger.log(`Updated payment record: ${payment.id}`);
    }

    this.logger.log(
      `Stripe payment succeeded for transaction: ${transaction.id}, amount: $${paymentIntent.amount_received / 100}`,
    );

    // Create remaining installments if this is a multi-installment plan
    const totalInstallments = parseInt(paymentIntent.metadata?.totalInstallments || '1');
    if (totalInstallments > 1) {
      await this.createRemainingInstallments(transaction, paymentIntent);
    }

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

  private async createRemainingInstallments(
    transaction: Transaction,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const totalInstallments = parseInt(paymentIntent.metadata?.totalInstallments || '1');
      const totalAmount = parseFloat(paymentIntent.metadata?.totalAmount || '0');
      const cardAmount = parseFloat(paymentIntent.metadata?.cardAmount || '0');
      const creditAmount = parseFloat(paymentIntent.metadata?.creditAmount || '0');
      const firstInstallmentCardAmount = paymentIntent.amount_received / 100;

      if (totalInstallments <= 1) return;

      // Calculate remaining card amount after first installment
      const remainingCardAmount = cardAmount - firstInstallmentCardAmount;
      const remainingInstallments = totalInstallments - 1;

      // Each remaining installment has both card and credit portions
      const creditPerInstallment = creditAmount / totalInstallments;
      const cardPerInstallment =
        Math.round((remainingCardAmount / remainingInstallments) * 100) / 100;

      // Get merchant settings for payment intervals
      const config = {
        paymentInterval: 'biweekly',
        gracePeriodDays: 3,
        lateFeeAmount: 25,
        maxRetries: 3,
      };

      // Create remaining payment records
      for (let i = 1; i <= remainingInstallments; i++) {
        const installmentNumber = i + 1;
        const dueDate = new Date();

        // Calculate due date based on payment interval
        if (config.paymentInterval === 'biweekly') {
          dueDate.setDate(dueDate.getDate() + i * 14);
        } else if (config.paymentInterval === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else {
          // Default weekly
          dueDate.setDate(dueDate.getDate() + i * 7);
        }

        // Calculate total payment amount (credit + card)
        const creditPortion = creditPerInstallment;
        const cardPortion =
          i === remainingInstallments
            ? remainingCardAmount - cardPerInstallment * (remainingInstallments - 1)
            : cardPerInstallment;

        const totalPaymentAmount = creditPortion + cardPortion;

        const payment = new Payment();
        payment.amount = totalPaymentAmount;
        payment.status = PaymentStatus.SCHEDULED;
        payment.dueDate = dueDate;
        payment.installmentNumber = installmentNumber;
        payment.transaction = transaction;
        payment.transactionId = transaction.id;

        await this.paymentRepository.save(payment);

        this.logger.log(
          `Created installment ${installmentNumber}/${totalInstallments}: $${totalPaymentAmount} (credit: $${creditPortion}, card: $${cardPortion}) due ${dueDate.toISOString().split('T')[0]}`,
        );
      }

      this.logger.log(
        `Created ${remainingInstallments} remaining installments for transaction ${transaction.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create remaining installments for transaction ${transaction.id}:`,
        error,
      );
    }
  }
}
