import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { StripeService } from '../../payments/services/stripe.service';
import { PaymentProcessingJob } from '../services/queue.service';

@Processor('payment-processing')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private stripeService: StripeService,
  ) {}

  @Process('process-payment')
  async handlePaymentProcessing(job: Job<PaymentProcessingJob>): Promise<void> {
    const { paymentId, type, metadata } = job.data;

    this.logger.log(`Processing payment job: ${paymentId}, type: ${type}`);

    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['transaction', 'transaction.user'],
      });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      switch (type) {
        case 'charge':
          await this.processCharge(payment);
          break;
        case 'retry':
          await this.processRetry(payment, metadata?.retryCount || 0);
          break;
        case 'refund':
          await this.processRefund(payment, metadata?.amount);
          break;
        default:
          throw new Error(`Unknown payment processing type: ${type}`);
      }

      this.logger.log(`Successfully processed payment: ${paymentId}, type: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to process payment ${paymentId}:`, error);

      // Update payment status on failure
      await this.handlePaymentFailure(paymentId, (error as Error).message);

      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }

  private async processCharge(payment: Payment): Promise<void> {
    if (!payment.transaction) {
      throw new Error('Payment transaction is required');
    }
    
    const user = payment.transaction.user;

    if (!user.stripeCustomerId || !payment.stripePaymentMethodId) {
      throw new Error('Missing Stripe customer ID or payment method');
    }

    // Update payment status to processing
    payment.status = PaymentStatus.PROCESSING;
    await this.paymentRepository.save(payment);

    // Charge the stored payment method
    const paymentIntent = await this.stripeService.chargeStoredPaymentMethod(
      user.stripeCustomerId,
      payment.stripePaymentMethodId,
      Number(payment.amount),
      {
        paymentId: payment.id,
        transactionId: payment.transaction!.id,
      },
    );

    // Update payment with result
    payment.stripePaymentIntentId = paymentIntent.id;
    payment.status = this.stripeService.mapStripeStatusToPaymentStatus(paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
      payment.paymentDate = new Date();
    }

    await this.paymentRepository.save(payment);
  }

  private async processRetry(payment: Payment, retryCount: number): Promise<void> {
    this.logger.log(`Processing payment retry: ${payment.id}, attempt: ${retryCount + 1}`);

    // Update retry count
    payment.retryCount = retryCount + 1;
    payment.nextRetryAt = undefined; // Clear next retry time

    // Process as regular charge
    await this.processCharge(payment);
  }

  private async processRefund(payment: Payment, amount?: number): Promise<void> {
    if (!payment.stripePaymentIntentId) {
      throw new Error('No Stripe payment intent ID for refund');
    }

    const refund = await this.stripeService.refundPayment(payment.stripePaymentIntentId, amount);

    this.logger.log(`Processed refund: ${refund.id} for payment: ${payment.id}`);

    // You might want to update payment status or create a refund record
    // This depends on your business logic
  }

  private async handlePaymentFailure(paymentId: string, errorMessage: string): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = errorMessage;
        await this.paymentRepository.save(payment);
      }
    } catch (error) {
      this.logger.error(`Failed to update payment failure status:`, error);
    }
  }
}
