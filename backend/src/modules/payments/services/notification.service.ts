import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import Stripe from 'stripe';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async sendPaymentSuccessNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getPaymentSuccessTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment success notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment success notification', error);
    }
  }

  async sendPaymentFailureNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getPaymentFailureTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment failure notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment failure notification', error);
    }
  }

  async sendPaymentActionRequiredNotification(
    payment: Payment,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const user = payment.transaction.user;
      const actionUrl = this.generatePaymentActionUrl(paymentIntent.client_secret!);
      const template = this.getPaymentActionRequiredTemplate(payment, actionUrl);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment action required notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment action required notification', error);
    }
  }

  async sendUpcomingPaymentReminder(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getUpcomingPaymentTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Upcoming payment reminder sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send upcoming payment reminder', error);
    }
  }

  async sendOverduePaymentReminder(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getOverduePaymentTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Overdue payment reminder sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send overdue payment reminder', error);
    }
  }

  async sendPaymentRetrySuccessNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getPaymentRetrySuccessTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment retry success notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment retry success notification', error);
    }
  }

  async sendFinalPaymentFailureNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction.user;
      const template = this.getFinalPaymentFailureTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Final payment failure notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send final payment failure notification', error);
    }
  }

  async sendTransactionCompletionNotification(transaction: Transaction): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: transaction.userId } });
      if (!user) return;

      const template = this.getTransactionCompletionTemplate(transaction);

      await this.sendEmail(user.email, template);

      this.logger.log(`Transaction completion notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send transaction completion notification', error);
    }
  }

  private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    // Integration with email service (SendGrid, AWS SES, etc.)
    // For now, just log the email content
    this.logger.log(`Sending email to ${to}: ${template.subject}`);

    // Example implementation with a hypothetical email service:
    /*
    const emailService = this.configService.get('EMAIL_SERVICE');
    await emailService.send({
      to,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
    });
    */
  }

  private getPaymentSuccessTemplate(payment: Payment): EmailTemplate {
    return {
      subject: 'Payment Successful - Scalapay',
      htmlContent: `
        <h2>Payment Successful!</h2>
        <p>Your payment of $${payment.amount} has been processed successfully.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
        <p>Payment Date: ${new Date().toLocaleDateString()}</p>
        <p>Thank you for using Scalapay!</p>
      `,
      textContent: `Payment Successful! Your payment of $${payment.amount} has been processed successfully. Transaction ID: ${payment.transaction.id}`,
    };
  }

  private getPaymentFailureTemplate(payment: Payment): EmailTemplate {
    return {
      subject: 'Payment Failed - Scalapay',
      htmlContent: `
        <h2>Payment Failed</h2>
        <p>Your payment of $${payment.amount} could not be processed.</p>
        <p>Reason: ${payment.failureReason}</p>
        <p>We will automatically retry this payment. You can also update your payment method in your account.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
      `,
      textContent: `Payment Failed. Your payment of $${payment.amount} could not be processed. Reason: ${payment.failureReason}`,
    };
  }

  private getPaymentActionRequiredTemplate(payment: Payment, actionUrl: string): EmailTemplate {
    return {
      subject: 'Action Required for Your Payment - Scalapay',
      htmlContent: `
        <h2>Action Required</h2>
        <p>Your payment of $${payment.amount} requires additional verification.</p>
        <p><a href="${actionUrl}">Complete Payment Verification</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
      `,
      textContent: `Action Required. Your payment of $${payment.amount} requires additional verification. Complete at: ${actionUrl}`,
    };
  }

  private getUpcomingPaymentTemplate(payment: Payment): EmailTemplate {
    const dueDate = new Date(payment.dueDate).toLocaleDateString();
    return {
      subject: 'Upcoming Payment Reminder - Scalapay',
      htmlContent: `
        <h2>Payment Due Soon</h2>
        <p>Your payment of $${payment.amount} is due on ${dueDate}.</p>
        <p>We'll automatically charge your saved payment method.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
      `,
      textContent: `Payment Due Soon. Your payment of $${payment.amount} is due on ${dueDate}.`,
    };
  }

  private getOverduePaymentTemplate(payment: Payment): EmailTemplate {
    return {
      subject: 'Overdue Payment - Scalapay',
      htmlContent: `
        <h2>Payment Overdue</h2>
        <p>Your payment of $${payment.amount} is now overdue.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
      `,
      textContent: `Payment Overdue. Your payment of $${payment.amount} is now overdue.`,
    };
  }

  private getPaymentRetrySuccessTemplate(payment: Payment): EmailTemplate {
    return {
      subject: 'Payment Retry Successful - Scalapay',
      htmlContent: `
        <h2>Payment Processed Successfully</h2>
        <p>Your payment of $${payment.amount} has been successfully processed after retry.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
        <p>Thank you for your patience!</p>
      `,
      textContent: `Payment Retry Successful. Your payment of $${payment.amount} has been processed.`,
    };
  }

  private getFinalPaymentFailureTemplate(payment: Payment): EmailTemplate {
    return {
      subject: 'Payment Issue - Action Required - Scalapay',
      htmlContent: `
        <h2>Payment Could Not Be Processed</h2>
        <p>We were unable to process your payment of $${payment.amount} after multiple attempts.</p>
        <p>Please contact customer support or update your payment method.</p>
        <p>Transaction ID: ${payment.transaction.id}</p>
      `,
      textContent: `Payment Could Not Be Processed. Please contact support for payment of $${payment.amount}.`,
    };
  }

  private getTransactionCompletionTemplate(transaction: Transaction): EmailTemplate {
    return {
      subject: 'Transaction Complete - Scalapay',
      htmlContent: `
        <h2>Transaction Complete!</h2>
        <p>Your transaction of $${transaction.amount} has been completed successfully.</p>
        <p>All payments have been processed.</p>
        <p>Transaction ID: ${transaction.id}</p>
        <p>Thank you for using Scalapay!</p>
      `,
      textContent: `Transaction Complete! Your transaction of $${transaction.amount} has been completed.`,
    };
  }

  private generatePaymentActionUrl(clientSecret: string): string {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/payment/confirm?payment_intent_client_secret=${clientSecret}`;
  }
}
