import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, any>;
  description?: string;
  statementDescriptor?: string;
  receiptEmail?: string;
  setupFutureUsage?: 'on_session' | 'off_session';
}

export interface StripePaymentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required but not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'scalapay_bnpl',
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for ${email}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new Error('Failed to create payment customer');
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<StripePaymentResult> {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(dto.amount * 100), // Convert to cents
        currency: dto.currency.toLowerCase(),
        customer: dto.customerId,
        description: dto.description || 'ScalaPay BNPL Payment',
        receipt_email: dto.receiptEmail,
        statement_descriptor_suffix: dto.statementDescriptor || 'BNPL', // Top-level for API version 2025-05-28.basil
        metadata: {
          ...dto.metadata,
          service: 'scalapay_bnpl',
          created_at: new Date().toISOString(),
        },
        payment_method_types: ['card'], // Explicitly specify card payments only
        // Enable proper billing details collection
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic', // Use 3D Secure when required
          },
        },
        // Set up for future payments if needed
        setup_future_usage: dto.setupFutureUsage || 'off_session',
      } as any; // Type assertion for newer API properties

      console.log(
        '💳 Creating Stripe PaymentIntent with data:',
        JSON.stringify(paymentIntentData, null, 2),
      );

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.log(`Created payment intent: ${paymentIntent.id} for $${dto.amount}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      this.logger.log(
        `Confirmed payment intent: ${paymentIntentId}, status: ${paymentIntent.status}`,
      );
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent: ${paymentIntentId}`, error);
      throw new Error('Failed to confirm payment');
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent: ${paymentIntentId}`, error);
      throw new Error('Failed to retrieve payment information');
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      this.logger.log(`Created refund: ${refund.id} for payment: ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to refund payment: ${paymentIntentId}`, error);
      throw new Error('Failed to process refund');
    }
  }

  async processInstallmentPayment(payment: Payment): Promise<StripePaymentResult> {
    try {
      const transaction = payment.transaction;
      if (!transaction) {
        throw new Error('Transaction not found for payment');
      }
      const user = transaction.user;

      // Create customer if not exists
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(user.email, user.name);
        customerId = customer.id;
        // Note: You would need to update the user entity with stripeCustomerId
      }

      const paymentIntent = await this.createPaymentIntent({
        amount: Number(payment.amount),
        currency: 'usd',
        customerId,
        metadata: {
          paymentId: payment.id,
          transactionId: transaction.id,
          installmentNumber: payment.installmentNumber || 1,
        },
      });

      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to process installment payment: ${payment.id}`, error);
      throw new Error('Failed to process installment payment');
    }
  }

  async setupFuturePayment(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      this.logger.log(`Created setup intent: ${setupIntent.id} for customer: ${customerId}`);
      return setupIntent;
    } catch (error) {
      this.logger.error(`Failed to setup future payment for customer: ${customerId}`, error);
      throw new Error('Failed to setup future payment');
    }
  }

  async chargeStoredPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirmation_method: 'automatic',
        confirm: true,
        off_session: true,
        metadata: {
          ...metadata,
          service: 'scalapay_bnpl',
        },
      });

      this.logger.log(`Charged stored payment method: ${paymentMethodId} for $${amount}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to charge stored payment method: ${paymentMethodId}`, error);
      throw error;
    }
  }

  mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.SCHEDULED;
      case 'canceled':
      case 'requires_capture':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.SCHEDULED;
    }
  }

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      this.logger.log(`Created setup intent: ${setupIntent.id} for customer: ${customerId}`);
      return setupIntent;
    } catch (error) {
      this.logger.error(`Failed to create setup intent for customer: ${customerId}`, error);
      throw new Error('Failed to create setup intent');
    }
  }

  async retrieveSetupIntent(setupIntentId: string): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.retrieve(setupIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve setup intent: ${setupIntentId}`, error);
      throw new Error('Failed to retrieve setup intent');
    }
  }

  async retrievePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      this.logger.error(`Failed to retrieve payment method: ${paymentMethodId}`, error);
      throw new Error('Failed to retrieve payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      this.logger.log(`Detached payment method: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to detach payment method: ${paymentMethodId}`, error);
      throw new Error('Failed to detach payment method');
    }
  }

  async constructWebhookEvent(body: any, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required but not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event', error);
      throw new Error('Invalid webhook signature');
    }
  }
}
