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
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
      const template = this.getPaymentSuccessTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment success notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment success notification', error);
    }
  }

  async sendPaymentFailureNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
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
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
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
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
      const template = this.getUpcomingPaymentTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Upcoming payment reminder sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send upcoming payment reminder', error);
    }
  }

  async sendOverduePaymentReminder(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
      const template = this.getOverduePaymentTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Overdue payment reminder sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send overdue payment reminder', error);
    }
  }

  async sendPaymentRetrySuccessNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
      const template = this.getPaymentRetrySuccessTemplate(payment);

      await this.sendEmail(user.email, template);

      this.logger.log(`Payment retry success notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to send payment retry success notification', error);
    }
  }

  async sendFinalPaymentFailureNotification(payment: Payment): Promise<void> {
    try {
      const user = payment.transaction?.user;
      if (!user) {
        this.logger.error('Payment has no associated user');
        return;
      }
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
        <p>Payment Date: ${new Date().toLocaleDateString()}</p>
        <p>Thank you for using Scalapay!</p>
      `,
      textContent: `Payment Successful! Your payment of $${payment.amount} has been processed successfully. Transaction ID: ${payment.transaction?.id}`,
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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
        <p>Transaction ID: ${payment.transaction?.id}</p>
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

  async sendMerchantApprovalEmail(
    email: string,
    name: string,
    details?: { creditLimit?: number; welcomeMessage?: string }
  ): Promise<void> {
    try {
      const template = this.getMerchantApprovalTemplate(name, details);
      await this.sendEmail(email, template);
      this.logger.log(`Merchant approval notification sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send merchant approval email', error);
    }
  }

  async sendMerchantRejectionEmail(
    email: string,
    name: string,
    reason?: string
  ): Promise<void> {
    try {
      const template = this.getMerchantRejectionTemplate(name, reason);
      await this.sendEmail(email, template);
      this.logger.log(`Merchant rejection notification sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send merchant rejection email', error);
    }
  }

  private getMerchantApprovalTemplate(
    name: string, 
    details?: { creditLimit?: number; welcomeMessage?: string }
  ): EmailTemplate {
    const welcomeMessage = details?.welcomeMessage || 'Welcome to Scalapay! Your merchant account has been approved.';
    const creditInfo = details?.creditLimit 
      ? `<p>Your account has been set up with a credit limit of $${details.creditLimit.toLocaleString()}.</p>`
      : '';

    return {
      subject: 'Merchant Account Approved - Welcome to Scalapay!',
      htmlContent: `
        <h2>Congratulations! Your Merchant Account is Approved</h2>
        <p>Dear ${name},</p>
        <p>${welcomeMessage}</p>
        ${creditInfo}
        <p>You can now:</p>
        <ul>
          <li>Create and manage transactions</li>
          <li>Access your merchant dashboard</li>
          <li>View analytics and reports</li>
          <li>Configure your payment settings</li>
        </ul>
        <p>Get started by logging into your dashboard at <a href="${this.getFrontendUrl()}/dashboard/merchant">Merchant Dashboard</a></p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Welcome aboard!</p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Congratulations! Your merchant account has been approved. ${welcomeMessage} Login at ${this.getFrontendUrl()}/dashboard/merchant`,
    };
  }

  private getMerchantRejectionTemplate(name: string, reason?: string): EmailTemplate {
    const rejectionReason = reason 
      ? `<p>Reason for rejection: ${reason}</p>`
      : '<p>Your application did not meet our current approval criteria.</p>';

    return {
      subject: 'Merchant Application Update - Scalapay',
      htmlContent: `
        <h2>Merchant Application Status Update</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest in becoming a Scalapay merchant.</p>
        <p>After careful review, we are unable to approve your application at this time.</p>
        ${rejectionReason}
        <p>You may reapply in the future if your circumstances change. Our approval criteria are designed to ensure the best experience for all users on our platform.</p>
        <p>If you have questions about this decision, please contact our support team.</p>
        <p>Thank you for considering Scalapay.</p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Thank you for your merchant application. We are unable to approve your application at this time. ${reason || 'Please contact support for more information.'}`,
    };
  }

  async sendPaymentMethodExpiredNotification(paymentMethod: any): Promise<void> {
    try {
      const user = paymentMethod.user;
      if (!user) {
        this.logger.error('Payment method has no associated user');
        return;
      }
      const template = this.getPaymentMethodExpiredTemplate(paymentMethod);
      await this.sendEmail(user.email, template);
      this.logger.log(`Payment method expired notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send payment method expired email', error);
    }
  }

  async sendPaymentMethodExpiringNotification(paymentMethod: any): Promise<void> {
    try {
      const user = paymentMethod.user;
      if (!user) {
        this.logger.error('Payment method has no associated user');
        return;
      }
      const template = this.getPaymentMethodExpiringTemplate(paymentMethod);
      await this.sendEmail(user.email, template);
      this.logger.log(`Payment method expiring notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send payment method expiring email', error);
    }
  }

  private getPaymentMethodExpiredTemplate(paymentMethod: any): EmailTemplate {
    return {
      subject: 'Payment Method Expired - Update Required',
      htmlContent: `
        <h2>Payment Method Expired</h2>
        <p>Your payment method ending in ${paymentMethod.cardDetails?.last4} has expired.</p>
        <p>To continue using Scalapay services, please add a new payment method to your account.</p>
        <p><a href="${this.getFrontendUrl()}/dashboard/payment-methods">Update Payment Methods</a></p>
        <p>If you have any questions, please contact our support team.</p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Your payment method ending in ${paymentMethod.cardDetails?.last4} has expired. Please update your payment methods at ${this.getFrontendUrl()}/dashboard/payment-methods`,
    };
  }

  private getPaymentMethodExpiringTemplate(paymentMethod: any): EmailTemplate {
    const expiryDate = paymentMethod.expiresAt ? new Date(paymentMethod.expiresAt).toLocaleDateString() : 'soon';
    return {
      subject: 'Payment Method Expiring Soon',
      htmlContent: `
        <h2>Payment Method Expiring Soon</h2>
        <p>Your payment method ending in ${paymentMethod.cardDetails?.last4} will expire on ${expiryDate}.</p>
        <p>To avoid payment interruptions, please add a new payment method to your account before it expires.</p>
        <p><a href="${this.getFrontendUrl()}/dashboard/payment-methods">Update Payment Methods</a></p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Your payment method ending in ${paymentMethod.cardDetails?.last4} will expire on ${expiryDate}. Please update your payment methods at ${this.getFrontendUrl()}/dashboard/payment-methods`,
    };
  }

  private getFrontendUrl(): string {
    return this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  private generatePaymentActionUrl(clientSecret: string): string {
    const frontendUrl = this.getFrontendUrl();
    return `${frontendUrl}/payment/confirm?payment_intent_client_secret=${clientSecret}`;
  }
}
