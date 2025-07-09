import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { EarlyPaymentConfig, DiscountTier } from '../entities/early-payment-config.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { User } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../shared/services/notification.service';

// Enhanced interfaces for early payment functionality
export interface EarlyPaymentOptions {
  fullPayment: {
    available: boolean;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    savings: number;
    tier?: DiscountTier | null;
  };
  partialPayments: {
    available: boolean;
    payments: {
      paymentId: string;
      installmentNumber: number;
      amount: number;
      dueDate: Date;
      discountAmount: number;
      finalAmount: number;
      savings: number;
      tier?: DiscountTier | null;
    }[];
  };
  restrictions: {
    minAmount?: number;
    maxAmount?: number;
    requiresApproval: boolean;
    reasonsNotAvailable: string[];
  };
}

export interface PartialPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  processedPayments: {
    paymentId: string;
    amount: number;
    discountApplied: number;
    finalAmount: number;
  }[];
  remainingPayments: {
    paymentId: string;
    amount: number;
    dueDate: Date;
  }[];
  totalSavings: number;
  recalculatedSchedule?: boolean;
}

export interface EarlyPaymentCalculation {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  discountRate: number;
  tier: DiscountTier | null;
  savings: number;
  interestSaved?: number;
  timeToOriginalDue: number; // days
  beneficialToUser: boolean;
}

@Injectable()
export class EarlyPaymentService {
  private readonly logger = new Logger(EarlyPaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(EarlyPaymentConfig)
    private earlyPaymentConfigRepository: Repository<EarlyPaymentConfig>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private notificationService: NotificationService,
  ) {}

  // Get all early payment options for a transaction
  async getEarlyPaymentOptions(
    transactionId: string,
    userId: string,
  ): Promise<EarlyPaymentOptions> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['payments', 'user', 'merchant'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const merchantConfig = await this.getMerchantEarlyPaymentConfig(transaction.merchantId);
    const pendingPayments = transaction.payments.filter(
      (payment) => payment.status === PaymentStatus.SCHEDULED,
    );

    if (pendingPayments.length === 0) {
      return {
        fullPayment: {
          available: false,
          totalAmount: 0,
          discountAmount: 0,
          finalAmount: 0,
          savings: 0,
        },
        partialPayments: {
          available: false,
          payments: [],
        },
        restrictions: {
          requiresApproval: false,
          reasonsNotAvailable: ['No pending payments'],
        },
      };
    }

    // Calculate full payment option
    const totalAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const fullPaymentCalculation = await this.calculateEarlyPaymentDiscount(
      totalAmount,
      merchantConfig,
      this.getDaysBeforeFirstDue(pendingPayments),
    );

    // Check if full payment is allowed
    const fullPaymentEligibility = merchantConfig?.canProcessEarlyPayment(
      totalAmount,
      0, // payment count - would need to track this
      transaction.user.tier,
      transaction.paymentMethodType,
    ) || { allowed: true };

    // Calculate partial payment options
    const partialPaymentOptions = [];
    const partialPaymentsAllowed = merchantConfig?.allowPartialPayments !== false;

    if (partialPaymentsAllowed) {
      for (const payment of pendingPayments) {
        const daysBeforeDue = this.getDaysBeforeDue(payment.dueDate);
        const calculation = await this.calculateEarlyPaymentDiscount(
          Number(payment.amount),
          merchantConfig,
          daysBeforeDue,
        );

        partialPaymentOptions.push({
          paymentId: payment.id,
          installmentNumber: payment.installmentNumber || 0,
          amount: Number(payment.amount),
          dueDate: payment.dueDate,
          discountAmount: calculation.discountAmount,
          finalAmount: calculation.finalAmount,
          savings: calculation.savings,
          tier: calculation.tier,
        });
      }
    }

    return {
      fullPayment: {
        available: fullPaymentEligibility.allowed,
        totalAmount,
        discountAmount: fullPaymentCalculation.discountAmount,
        finalAmount: fullPaymentCalculation.finalAmount,
        savings: fullPaymentCalculation.savings,
        tier: fullPaymentCalculation.tier,
      },
      partialPayments: {
        available: partialPaymentsAllowed && fullPaymentEligibility.allowed,
        payments: partialPaymentOptions,
      },
      restrictions: {
        minAmount: merchantConfig?.minimumEarlyPaymentAmount,
        maxAmount: merchantConfig?.maximumEarlyPaymentAmount,
        requiresApproval: merchantConfig?.requireMerchantApproval || false,
        reasonsNotAvailable: fullPaymentEligibility.allowed
          ? []
          : [fullPaymentEligibility.reason || 'Unknown restriction'],
      },
    };
  }

  // Process full early payment (all remaining installments)
  async processFullEarlyPayment(transactionId: string, userId: string, paymentMethodId?: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['payments', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const merchantConfig = await this.getMerchantEarlyPaymentConfig(transaction.merchantId);
    const pendingPayments = transaction.payments.filter(
      (payment) => payment.status === PaymentStatus.SCHEDULED,
    );

    if (pendingPayments.length === 0) {
      throw new BadRequestException('No pending payments to process early');
    }

    const totalAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Validate early payment eligibility
    const eligibility = merchantConfig?.canProcessEarlyPayment(
      totalAmount,
      0,
      transaction.user.tier,
      transaction.paymentMethodType,
    ) || { allowed: true };

    if (!eligibility.allowed) {
      throw new BadRequestException(eligibility.reason || 'Early payment not allowed');
    }

    // Calculate discount
    const calculation = await this.calculateEarlyPaymentDiscount(
      totalAmount,
      merchantConfig,
      this.getDaysBeforeFirstDue(pendingPayments),
    );

    // Create payment intent for the discounted amount
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: calculation.finalAmount,
      currency: 'usd',
      customerId: transaction.user.stripeCustomerId!,
      metadata: {
        transactionId,
        type: 'early_payment_full',
        paymentIds: pendingPayments.map((p) => p.id).join(','),
        originalAmount: totalAmount.toString(),
        discountAmount: calculation.discountAmount.toString(),
        savings: calculation.savings.toString(),
      },
    });

    this.logger.log(
      `Created full early payment intent for transaction ${transactionId}: ${calculation.finalAmount} (saved ${calculation.savings})`,
    );

    return {
      paymentIntentId: paymentIntent.paymentIntentId,
      clientSecret: paymentIntent.clientSecret,
      originalAmount: totalAmount,
      discountAmount: calculation.discountAmount,
      finalAmount: calculation.finalAmount,
      savings: calculation.savings,
      pendingPayments: pendingPayments.length,
    };
  }

  // Process partial early payment (specific installments)
  async processPartialEarlyPayment(
    transactionId: string,
    paymentIds: string[],
    userId: string,
    paymentMethodId?: string,
  ): Promise<PartialPaymentResult> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['payments', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const merchantConfig = await this.getMerchantEarlyPaymentConfig(transaction.merchantId);

    if (!merchantConfig?.allowPartialPayments) {
      throw new BadRequestException('Partial payments not allowed for this merchant');
    }

    // Validate payment IDs belong to this transaction
    const paymentsToProcess = transaction.payments.filter(
      (payment) => paymentIds.includes(payment.id) && payment.status === PaymentStatus.SCHEDULED,
    );

    if (paymentsToProcess.length === 0) {
      throw new BadRequestException('No valid payments found to process early');
    }

    const totalAmount = paymentsToProcess.reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Validate early payment eligibility
    const eligibility = merchantConfig.canProcessEarlyPayment(
      totalAmount,
      0,
      transaction.user.tier,
      transaction.paymentMethodType,
    );

    if (!eligibility.allowed) {
      throw new BadRequestException(eligibility.reason || 'Early payment not allowed');
    }

    // Calculate discounts for each payment
    const processedPayments = [];
    let totalDiscountAmount = 0;
    let totalFinalAmount = 0;

    for (const payment of paymentsToProcess) {
      const daysBeforeDue = this.getDaysBeforeDue(payment.dueDate);
      const calculation = await this.calculateEarlyPaymentDiscount(
        Number(payment.amount),
        merchantConfig,
        daysBeforeDue,
      );

      processedPayments.push({
        paymentId: payment.id,
        amount: Number(payment.amount),
        discountApplied: calculation.discountAmount,
        finalAmount: calculation.finalAmount,
      });

      totalDiscountAmount += calculation.discountAmount;
      totalFinalAmount += calculation.finalAmount;
    }

    // Create payment intent for the total discounted amount
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: totalFinalAmount,
      currency: 'usd',
      customerId: transaction.user.stripeCustomerId!,
      metadata: {
        transactionId,
        type: 'early_payment_partial',
        paymentIds: paymentIds.join(','),
        originalAmount: totalAmount.toString(),
        discountAmount: totalDiscountAmount.toString(),
        savings: totalDiscountAmount.toString(),
      },
    });

    // Get remaining payments
    const remainingPayments = transaction.payments
      .filter(
        (payment) => !paymentIds.includes(payment.id) && payment.status === PaymentStatus.SCHEDULED,
      )
      .map((payment) => ({
        paymentId: payment.id,
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
      }));

    this.logger.log(
      `Created partial early payment intent for transaction ${transactionId}: ${processedPayments.length} payments, saved ${totalDiscountAmount}`,
    );

    return {
      success: true,
      paymentIntentId: paymentIntent.paymentIntentId,
      clientSecret: paymentIntent.clientSecret,
      processedPayments,
      remainingPayments,
      totalSavings: totalDiscountAmount,
      recalculatedSchedule: false, // Would implement interest recalculation in advanced version
    };
  }

  // Enhanced confirm early payment with analytics tracking
  async confirmEarlyPayment(paymentIntentId: string) {
    const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not succeeded');
    }

    const metadata = paymentIntent.metadata;
    const transactionId = metadata.transactionId;
    const paymentIds = metadata.paymentIds?.split(',') || [];
    const originalAmount = Number(metadata.originalAmount || 0);
    const discountAmount = Number(metadata.discountAmount || 0);
    const savings = Number(metadata.savings || 0);

    // Mark all specified payments as completed
    const completedPayments = [];
    for (const paymentId of paymentIds) {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.paymentDate = new Date();
        payment.stripePaymentIntentId = paymentIntentId;
        await this.paymentRepository.save(payment);
        completedPayments.push(payment);
      }
    }

    // Get transaction and update analytics
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user'],
    });

    if (transaction) {
      // Update merchant early payment analytics
      await this.updateMerchantAnalytics(transaction.merchantId, {
        amount: originalAmount,
        discountProvided: discountAmount,
        timeRange: this.getTimeRangeForAnalytics(completedPayments),
      });

      // Send enhanced notification with savings information
      await this.notificationService.sendEarlyPaymentConfirmation(
        transaction.user,
        transaction,
        originalAmount,
        {
          discountAmount,
          finalAmount: Number(paymentIntent.amount) / 100,
          savings,
          paymentsCompleted: completedPayments.length,
        },
      );

      this.logger.log(
        `Early payment confirmed for transaction ${transactionId}: ${completedPayments.length} payments, $${savings} saved`,
      );
    }

    return {
      message: 'Early payment processed successfully',
      transactionId,
      completedPayments: completedPayments.length,
      originalAmount,
      finalAmount: Number(paymentIntent.amount) / 100,
      savings,
      discountAmount,
    };
  }

  // Enhanced discount calculation with merchant configuration
  async calculateEarlyPaymentDiscount(
    amount: number,
    merchantConfig: EarlyPaymentConfig | null,
    daysBeforeOriginalDue: number,
  ): Promise<EarlyPaymentCalculation> {
    // Fallback to simple 1% discount if no merchant config
    if (!merchantConfig || !merchantConfig.enabled) {
      const simpleDiscount = amount * 0.01;
      return {
        originalAmount: amount,
        discountAmount: simpleDiscount,
        finalAmount: amount - simpleDiscount,
        discountRate: 0.01,
        tier: null,
        savings: simpleDiscount,
        timeToOriginalDue: daysBeforeOriginalDue,
        beneficialToUser: simpleDiscount >= 1, // Beneficial if saves at least $1
      };
    }

    // Use merchant configuration for advanced calculation
    const discountResult = merchantConfig.calculateEarlyPaymentDiscount(
      amount,
      daysBeforeOriginalDue,
    );
    const beneficial = merchantConfig.isEarlyPaymentBeneficial(amount, daysBeforeOriginalDue);

    return {
      originalAmount: amount,
      discountAmount: discountResult.discountAmount,
      finalAmount: amount - discountResult.discountAmount,
      discountRate: discountResult.discountRate,
      tier: discountResult.tier,
      savings: discountResult.savings,
      timeToOriginalDue: daysBeforeOriginalDue,
      beneficialToUser: beneficial,
    };
  }

  // Calculate savings for a specific transaction
  async calculateEarlyPaymentSavings(
    transactionId: string,
    userId: string,
  ): Promise<{
    fullPaymentSavings: number;
    partialPaymentSavings: { paymentId: string; savings: number }[];
    totalPossibleSavings: number;
  }> {
    const options = await this.getEarlyPaymentOptions(transactionId, userId);

    const partialPaymentSavings = options.partialPayments.payments.map((payment) => ({
      paymentId: payment.paymentId,
      savings: payment.savings,
    }));

    const totalPartialSavings = partialPaymentSavings.reduce(
      (sum, payment) => sum + payment.savings,
      0,
    );

    return {
      fullPaymentSavings: options.fullPayment.savings,
      partialPaymentSavings,
      totalPossibleSavings: Math.max(options.fullPayment.savings, totalPartialSavings),
    };
  }

  // Merchant configuration management
  async getMerchantEarlyPaymentConfig(merchantId: string): Promise<EarlyPaymentConfig | null> {
    return this.earlyPaymentConfigRepository.findOne({
      where: { merchantId, enabled: true },
    });
  }

  async createMerchantEarlyPaymentConfig(
    merchantId: string,
    config: Partial<EarlyPaymentConfig>,
  ): Promise<EarlyPaymentConfig> {
    // Check if config already exists
    const existingConfig = await this.earlyPaymentConfigRepository.findOne({
      where: { merchantId },
    });

    if (existingConfig) {
      throw new BadRequestException('Early payment configuration already exists for this merchant');
    }

    // Create new configuration with defaults
    const defaultConfig = EarlyPaymentConfig.createDefaultConfig(merchantId);
    const newConfig = this.earlyPaymentConfigRepository.create({
      ...defaultConfig,
      ...config,
    });

    // Validate configuration
    const validationErrors = newConfig.validateConfiguration();
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Invalid configuration: ${validationErrors.join(', ')}`);
    }

    return this.earlyPaymentConfigRepository.save(newConfig);
  }

  async updateMerchantEarlyPaymentConfig(
    merchantId: string,
    updates: Partial<EarlyPaymentConfig>,
  ): Promise<EarlyPaymentConfig> {
    const config = await this.getMerchantEarlyPaymentConfig(merchantId);

    if (!config) {
      throw new NotFoundException('Early payment configuration not found for this merchant');
    }

    // Update configuration
    Object.assign(config, updates);

    // Validate updated configuration
    const validationErrors = config.validateConfiguration();
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Invalid configuration: ${validationErrors.join(', ')}`);
    }

    return this.earlyPaymentConfigRepository.save(config);
  }

  // Helper methods
  private getDaysBeforeDue(dueDate: Date): number {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  private getDaysBeforeFirstDue(payments: Payment[]): number {
    const earliestDue = payments.reduce((earliest, payment) => {
      return payment.dueDate < earliest ? payment.dueDate : earliest;
    }, payments[0].dueDate);

    return this.getDaysBeforeDue(earliestDue);
  }

  private getTimeRangeForAnalytics(payments: Payment[]): string {
    const averageDays =
      payments.reduce((sum, payment) => {
        return sum + this.getDaysBeforeDue(payment.dueDate);
      }, 0) / payments.length;

    if (averageDays <= 7) return '0-7days';
    if (averageDays <= 14) return '8-14days';
    if (averageDays <= 30) return '15-30days';
    return '31+days';
  }

  private async updateMerchantAnalytics(
    merchantId: string,
    data: { amount: number; discountProvided: number; timeRange: string },
  ): Promise<void> {
    try {
      const config = await this.getMerchantEarlyPaymentConfig(merchantId);
      if (config) {
        config.updateAnalytics(data);
        await this.earlyPaymentConfigRepository.save(config);
      }
    } catch (error) {
      this.logger.error(`Failed to update merchant analytics for ${merchantId}:`, error);
      // Don't throw error as analytics failure shouldn't fail the payment
    }
  }

  // Administrative methods
  async getEarlyPaymentStatistics(merchantId?: string): Promise<{
    totalEarlyPayments: number;
    totalSavingsProvided: number;
    averageDiscountRate: number;
    adoptionRate: number;
    popularTimeRanges: { range: string; count: number }[];
  }> {
    const configs = merchantId
      ? await this.earlyPaymentConfigRepository.find({ where: { merchantId } })
      : await this.earlyPaymentConfigRepository.find();

    const stats = configs.reduce(
      (acc, config) => {
        if (config.analytics) {
          acc.totalEarlyPayments += config.analytics.totalEarlyPayments;
          acc.totalSavingsProvided += config.analytics.totalSavingsProvided;
          acc.averageDiscountRate += config.analytics.averageDiscountRate;
        }
        return acc;
      },
      { totalEarlyPayments: 0, totalSavingsProvided: 0, averageDiscountRate: 0 },
    );

    if (configs.length > 0) {
      stats.averageDiscountRate = stats.averageDiscountRate / configs.length;
    }

    return {
      ...stats,
      adoptionRate: 0, // Would calculate from transaction data
      popularTimeRanges: [], // Would aggregate from analytics data
    };
  }

  async disableEarlyPaymentForMerchant(merchantId: string): Promise<void> {
    const config = await this.getMerchantEarlyPaymentConfig(merchantId);
    if (config) {
      config.enabled = false;
      await this.earlyPaymentConfigRepository.save(config);
    }
  }

  async enableEarlyPaymentForMerchant(merchantId: string): Promise<void> {
    const config = await this.getMerchantEarlyPaymentConfig(merchantId);
    if (config) {
      config.enabled = true;
      await this.earlyPaymentConfigRepository.save(config);
    }
  }
}
