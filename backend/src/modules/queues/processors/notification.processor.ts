import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from '../../payments/services/notification.service';
import { NotificationJob } from '../services/queue.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private notificationService: NotificationService) {}

  @Process('send-notification')
  async handleNotification(job: Job<NotificationJob>): Promise<void> {
    const { type, recipient, template, data } = job.data;
    
    this.logger.log(`Processing notification: ${type} to ${recipient}, template: ${template}`);

    try {
      switch (type) {
        case 'email':
          await this.sendEmail(recipient, template, data);
          break;
        case 'sms':
          await this.sendSMS(recipient, template, data);
          break;
        case 'push':
          await this.sendPushNotification(recipient, template, data);
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      this.logger.log(`Successfully sent ${type} notification to ${recipient}`);

    } catch (error) {
      this.logger.error(`Failed to send notification to ${recipient}:`, error);
      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }

  private async sendEmail(recipient: string, template: string, data: any): Promise<void> {
    // Generate email content based on template
    const emailTemplate = this.generateEmailTemplate(template, data);
    
    // Use the notification service to send email
    // Note: This is a simplified implementation
    // In reality, you'd call the appropriate method on notificationService
    this.logger.log(`Sending email to ${recipient} with template ${template}`);
    
    // For demo purposes, just log the email content
    this.logger.debug(`Email content: Subject: ${emailTemplate.subject}, Body: ${emailTemplate.htmlContent.substring(0, 100)}...`);
  }

  private async sendSMS(recipient: string, template: string, data: any): Promise<void> {
    const message = this.generateSMSMessage(template, data);
    
    this.logger.log(`Sending SMS to ${recipient}: ${message}`);
    
    // Integration with SMS service would go here
    // For demo purposes, just log
  }

  private async sendPushNotification(recipient: string, template: string, data: any): Promise<void> {
    const notification = this.generatePushNotification(template, data);
    
    this.logger.log(`Sending push notification to ${recipient}: ${notification.title}`);
    
    // Integration with push notification service would go here
    // For demo purposes, just log
  }

  private generateEmailTemplate(template: string, data: any): { subject: string; htmlContent: string; textContent: string } {
    switch (template) {
      case 'payment-reminder':
        return {
          subject: 'Payment Reminder - Scalapay',
          htmlContent: `
            <h2>Payment Reminder</h2>
            <p>Your payment of $${data.amount} is due on ${new Date(data.dueDate).toLocaleDateString()}.</p>
            <p>Payment ID: ${data.paymentId}</p>
          `,
          textContent: `Payment Reminder: Your payment of $${data.amount} is due on ${new Date(data.dueDate).toLocaleDateString()}.`,
        };
      
      case 'payment-success':
        return {
          subject: 'Payment Successful - Scalapay',
          htmlContent: `
            <h2>Payment Successful!</h2>
            <p>Your payment of $${data.amount} has been processed successfully.</p>
            <p>Payment ID: ${data.paymentId}</p>
          `,
          textContent: `Payment Successful! Your payment of $${data.amount} has been processed.`,
        };
      
      case 'payment-failed':
        return {
          subject: 'Payment Failed - Scalapay',
          htmlContent: `
            <h2>Payment Failed</h2>
            <p>Your payment of $${data.amount} could not be processed.</p>
            <p>Reason: ${data.reason}</p>
            <p>Payment ID: ${data.paymentId}</p>
          `,
          textContent: `Payment Failed: Your payment of $${data.amount} could not be processed. Reason: ${data.reason}`,
        };
      
      case 'welcome':
        return {
          subject: 'Welcome to Scalapay!',
          htmlContent: `
            <h2>Welcome to Scalapay!</h2>
            <p>Thank you for joining us, ${data.name}!</p>
            <p>Your account is now set up and ready to use.</p>
          `,
          textContent: `Welcome to Scalapay! Thank you for joining us, ${data.name}!`,
        };
      
      default:
        return {
          subject: 'Notification from Scalapay',
          htmlContent: '<p>You have a new notification.</p>',
          textContent: 'You have a new notification.',
        };
    }
  }

  private generateSMSMessage(template: string, data: any): string {
    switch (template) {
      case 'payment-reminder':
        return `Scalapay: Payment of $${data.amount} due ${new Date(data.dueDate).toLocaleDateString()}. ID: ${data.paymentId}`;
      
      case 'payment-success':
        return `Scalapay: Payment of $${data.amount} successful. ID: ${data.paymentId}`;
      
      case 'payment-failed':
        return `Scalapay: Payment of $${data.amount} failed. We'll retry automatically. ID: ${data.paymentId}`;
      
      default:
        return 'You have a new notification from Scalapay.';
    }
  }

  private generatePushNotification(template: string, data: any): { title: string; body: string } {
    switch (template) {
      case 'payment-reminder':
        return {
          title: 'Payment Due Soon',
          body: `Your payment of $${data.amount} is due on ${new Date(data.dueDate).toLocaleDateString()}`,
        };
      
      case 'payment-success':
        return {
          title: 'Payment Successful',
          body: `Your payment of $${data.amount} has been processed successfully`,
        };
      
      case 'payment-failed':
        return {
          title: 'Payment Failed',
          body: `Your payment could not be processed. We'll retry automatically.`,
        };
      
      default:
        return {
          title: 'Scalapay Notification',
          body: 'You have a new notification',
        };
    }
  }
}