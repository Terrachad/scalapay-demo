import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import Stripe from 'stripe';
import { Payment } from '@/modules/payments/entities/payment.entity';

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
    details?: { creditLimit?: number; welcomeMessage?: string },
  ): Promise<void> {
    try {
      const template = this.getMerchantApprovalTemplate(name, details);
      await this.sendEmail(email, template);
      this.logger.log(`Merchant approval notification sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send merchant approval email', error);
    }
  }

  async sendMerchantRejectionEmail(email: string, name: string, reason?: string): Promise<void> {
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
    details?: { creditLimit?: number; welcomeMessage?: string },
  ): EmailTemplate {
    const welcomeMessage =
      details?.welcomeMessage || 'Welcome to Scalapay! Your merchant account has been approved.';
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
    const expiryDate = paymentMethod.expiresAt
      ? new Date(paymentMethod.expiresAt).toLocaleDateString()
      : 'soon';
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

  // MFA-related notification methods
  async sendSMSVerificationCode(phoneNumber: string, code: string): Promise<void> {
    try {
      // Integration with SMS service (Twilio, AWS SNS, etc.)
      // For now, just log the SMS
      this.logger.log(`Sending SMS verification code ${code} to ${phoneNumber}`);

      // Example implementation with a hypothetical SMS service:
      /*
      const smsService = this.configService.get('SMS_SERVICE');
      await smsService.send({
        to: phoneNumber,
        message: `Your Scalapay verification code is: ${code}. This code will expire in 10 minutes.`,
      });
      */
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async sendEmailVerificationCode(email: string, code: string): Promise<void> {
    try {
      const template = this.getEmailVerificationTemplate(code);
      await this.sendEmail(email, template);
      this.logger.log(`Email verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${email}:`, error);
      throw error;
    }
  }

  private getEmailVerificationTemplate(code: string): EmailTemplate {
    return {
      subject: 'Scalapay Verification Code',
      htmlContent: `
        <h2>Email Verification</h2>
        <p>Your Scalapay verification code is:</p>
        <h1 style="font-size: 32px; font-weight: bold; text-align: center; color: #007bff;">${code}</h1>
        <p>This code will expire in 10 minutes for security purposes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Your Scalapay verification code is: ${code}. This code will expire in 10 minutes.`,
    };
  }

  // GDPR-related notification methods
  async sendConsentWithdrawalConfirmation(user: User, purpose?: string): Promise<void> {
    try {
      const template = this.getConsentWithdrawalTemplate(purpose);
      await this.sendEmail(user.email, template);
      this.logger.log(`Consent withdrawal confirmation sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send consent withdrawal confirmation to ${user.email}:`, error);
      throw error;
    }
  }

  private getConsentWithdrawalTemplate(purpose?: string): EmailTemplate {
    const purposeText = purpose ? ` for ${purpose}` : '';
    const purposeDetail = purpose
      ? `<p>Specifically, you have withdrawn consent${purposeText}.</p>`
      : '<p>You have withdrawn all consent for data processing.</p>';

    return {
      subject: 'Consent Withdrawal Confirmation - Scalapay',
      htmlContent: `
        <h2>Consent Withdrawal Confirmed</h2>
        <p>This email confirms that we have received your request to withdraw consent${purposeText}.</p>
        ${purposeDetail}
        <p>Your request has been processed and will take effect immediately.</p>
        <p>If you have any questions about your data rights, please contact our privacy team.</p>
        <p>The Scalapay Team</p>
      `,
      textContent: `Consent withdrawal confirmed${purposeText}. Your request has been processed and will take effect immediately.`,
    };
  }

  // Payment method-related notification methods
  async sendPaymentMethodAdded(user: User, paymentMethod: any): Promise<void> {
    try {
      const template = this.getPaymentMethodAddedTemplate(paymentMethod);
      await this.sendEmail(user.email, template);
      this.logger.log(`Payment method added notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment method added notification to ${user.email}:`,
        error,
      );
      throw error;
    }
  }

  private getPaymentMethodAddedTemplate(paymentMethod: any): EmailTemplate {
    const methodDescription = paymentMethod.cardDetails
      ? `Card ending in ${paymentMethod.cardDetails.last4}`
      : 'New payment method';

    return {
      subject: 'New Payment Method Added - Scalapay',
      htmlContent: `
        <h2>New Payment Method Added</h2>
        <p>${methodDescription} has been successfully added to your account.</p>
        <p>You can now use this payment method for your Scalapay transactions.</p>
        <p>If you didn't add this payment method, please contact our support team immediately.</p>
        <p><a href="${this.getFrontendUrl()}/dashboard/payment-methods">Manage Payment Methods</a></p>
        <p>The Scalapay Team</p>
      `,
      textContent: `${methodDescription} has been added to your account. If you didn't add this, please contact support.`,
    };
  }

  // Card auto-update notification methods
  async sendCardUpdateNotification(
    user: User,
    paymentMethod: any,
    updateResult: any,
  ): Promise<void> {
    try {
      const template = this.getCardUpdateNotificationTemplate(paymentMethod, updateResult);
      await this.sendEmail(user.email, template);
      this.logger.log(`Card update notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send card update notification to ${user.email}:`, error);
      throw error;
    }
  }

  private getCardUpdateNotificationTemplate(paymentMethod: any, updateResult: any): EmailTemplate {
    const cardDescription = paymentMethod.cardDetails
      ? `Card ending in ${paymentMethod.cardDetails.last4}`
      : 'Your payment method';

    const updateMessage = updateResult.success
      ? 'has been automatically updated with new expiration information'
      : 'could not be automatically updated';

    return {
      subject: updateResult.success
        ? 'Card Information Updated - Scalapay'
        : 'Card Update Failed - Scalapay',
      htmlContent: `
        <h2>Card Update ${updateResult.success ? 'Successful' : 'Failed'}</h2>
        <p>${cardDescription} ${updateMessage}.</p>
        ${
          updateResult.success
            ? '<p>Your payments will continue to process normally.</p>'
            : '<p>Please update your payment method to avoid payment interruptions.</p>'
        }
        <p><a href="${this.getFrontendUrl()}/dashboard/payment-methods">Manage Payment Methods</a></p>
        <p>The Scalapay Team</p>
      `,
      textContent: `${cardDescription} ${updateMessage}. ${updateResult.success ? 'No action needed.' : 'Please update your payment method.'}`,
    };
  }

  async sendCardUpdateSummary(adminEmails: string[], updateResult: any): Promise<void> {
    try {
      const template = this.getCardUpdateSummaryTemplate(updateResult);
      for (const email of adminEmails) {
        await this.sendEmail(email, template);
      }
      this.logger.log(`Card update summary sent to ${adminEmails.length} administrators`);
    } catch (error) {
      this.logger.error('Failed to send card update summary to administrators:', error);
      throw error;
    }
  }

  private getCardUpdateSummaryTemplate(updateResult: any): EmailTemplate {
    return {
      subject: 'Card Auto-Update Summary - Scalapay Admin',
      htmlContent: `
        <h2>Card Auto-Update Process Summary</h2>
        <p>The automated card update process has completed.</p>
        <h3>Summary:</h3>
        <ul>
          <li>Total cards processed: ${updateResult.totalProcessed || 0}</li>
          <li>Successful updates: ${updateResult.successCount || 0}</li>
          <li>Failed updates: ${updateResult.failureCount || 0}</li>
          <li>Processing time: ${updateResult.processingTime || 'N/A'}</li>
        </ul>
        <p>For detailed information, please check the admin dashboard.</p>
        <p>The Scalapay System</p>
      `,
      textContent: `Card Auto-Update Summary: ${updateResult.successCount || 0} successful, ${updateResult.failureCount || 0} failed out of ${updateResult.totalProcessed || 0} processed.`,
    };
  }

  // Enhanced early payment confirmation with savings details
  async sendEarlyPaymentConfirmation(
    user: User,
    transaction: Transaction,
    originalAmount: number,
    savingsDetails: {
      discountAmount: number;
      finalAmount: number;
      savings: number;
      paymentsCompleted: number;
    },
  ): Promise<void> {
    try {
      const template = this.getEnhancedEarlyPaymentConfirmationTemplate(
        transaction,
        originalAmount,
        savingsDetails,
      );
      await this.sendEmail(user.email, template);
      this.logger.log(`Enhanced early payment confirmation sent to ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send enhanced early payment confirmation', error);
    }
  }

  private getEnhancedEarlyPaymentConfirmationTemplate(
    transaction: Transaction,
    originalAmount: number,
    savingsDetails: {
      discountAmount: number;
      finalAmount: number;
      savings: number;
      paymentsCompleted: number;
    },
  ): EmailTemplate {
    return {
      subject: 'Early Payment Processed - You Saved Money! - Scalapay',
      htmlContent: `
        <h2>Early Payment Processed Successfully!</h2>
        <p>Congratulations! Your early payment has been processed and you've saved money.</p>
        
        <h3>Payment Summary:</h3>
        <ul>
          <li>Original Amount: $${originalAmount.toFixed(2)}</li>
          <li>Discount Applied: $${savingsDetails.discountAmount.toFixed(2)}</li>
          <li>Final Amount Paid: $${savingsDetails.finalAmount.toFixed(2)}</li>
          <li><strong>Total Savings: $${savingsDetails.savings.toFixed(2)}</strong></li>
          <li>Payments Completed: ${savingsDetails.paymentsCompleted}</li>
        </ul>
        
        <p>Transaction ID: ${transaction.id}</p>
        <p>All remaining installments have been paid off.</p>
        <p>Thank you for using Scalapay's early payment feature!</p>
      `,
      textContent: `Early Payment Processed! You saved $${savingsDetails.savings.toFixed(2)}. Final amount paid: $${savingsDetails.finalAmount.toFixed(2)}. Transaction ID: ${transaction.id}`,
    };
  }
}
