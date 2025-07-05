import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction, PaymentPlan } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { StripeService } from './stripe.service';
import { PaymentConfigService } from './payment-config.service';
import { MerchantSettings, SettingType } from '../../merchants/entities/merchant-settings.entity';

export interface PaymentScheduleConfig {
  startDate?: Date;
  enableValidation?: boolean;
  enableRepair?: boolean;
  timezone?: string;
}

export interface PaymentScheduleResult {
  success: boolean;
  payments: Payment[];
  errors: string[];
  warnings: string[];
  scheduleId: string;
  totalAmount: number;
  installmentCount: number;
}

export interface PaymentScheduleValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

@Injectable()
export class EnterprisePaymentSchedulerService {
  private readonly logger = new Logger(EnterprisePaymentSchedulerService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(MerchantSettings)
    private merchantSettingsRepository: Repository<MerchantSettings>,
    private dataSource: DataSource,
    private stripeService: StripeService,
    private paymentConfigService: PaymentConfigService,
  ) {}

  /**
   * Create enterprise-grade payment schedule with bulletproof reliability
   */
  async createEnterprisePaymentSchedule(
    transaction: Transaction,
    config: PaymentScheduleConfig = {}
  ): Promise<PaymentScheduleResult> {
    const scheduleId = `schedule_${transaction.id}_${Date.now()}`;
    
    this.logger.log(`Creating enterprise payment schedule for transaction: ${transaction.id}`);
    
    // Start database transaction for atomic operations
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate transaction
      const validation = await this.validateTransaction(transaction);
      if (!validation.isValid) {
        throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
      }

      // Calculate payment schedule
      const schedule = await this.calculateEnterprisePaymentSchedule(transaction, config);
      
      // Create payment records atomically
      const payments = await this.createPaymentRecords(transaction, schedule, queryRunner);
      
      // Store payment methods for future installments
      await this.setupFuturePaymentMethods(transaction, queryRunner);
      
      // Validate created schedule
      if (config.enableValidation !== false) {
        const scheduleValidation = await this.validatePaymentSchedule(payments);
        if (!scheduleValidation.isValid) {
          throw new Error(`Payment schedule validation failed: ${scheduleValidation.errors.join(', ')}`);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();
      
      const result: PaymentScheduleResult = {
        success: true,
        payments,
        errors: [],
        warnings: validation.warnings,
        scheduleId,
        totalAmount: Number(transaction.amount),
        installmentCount: schedule.length,
      };

      this.logger.log(`Successfully created payment schedule: ${scheduleId} with ${payments.length} payments`);
      return result;

    } catch (error) {
      // Rollback transaction
      await queryRunner.rollbackTransaction();
      
      this.logger.error(`Failed to create payment schedule for transaction ${transaction.id}`, error);
      
      return {
        success: false,
        payments: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        scheduleId,
        totalAmount: Number(transaction.amount),
        installmentCount: 0,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate bulletproof payment schedule with enterprise-grade date handling
   */
  private async calculateEnterprisePaymentSchedule(
    transaction: Transaction,
    config: PaymentScheduleConfig
  ): Promise<Array<{ amount: number; dueDate: Date; installmentNumber: number }>> {
    const installmentCount = this.getInstallmentCount(transaction.paymentPlan);
    const totalAmount = Number(transaction.amount);
    
    // Get merchant-specific payment configuration
    const merchantConfig = await this.getMerchantPaymentConfig(transaction.merchantId);
    const paymentInterval = merchantConfig.paymentInterval || 'biweekly';
    
    // Calculate base installment amount
    const baseInstallmentAmount = Math.floor((totalAmount * 100) / installmentCount) / 100;
    const remainder = Math.round((totalAmount - (baseInstallmentAmount * installmentCount)) * 100) / 100;
    
    // Use UTC for bulletproof date calculations
    const startDate = config.startDate || new Date();
    const baseDate = new Date(startDate.getTime());
    
    // Set to UTC midnight to avoid timezone issues
    baseDate.setUTCHours(0, 0, 0, 0);
    
    const schedule = [];
    
    for (let i = 0; i < installmentCount; i++) {
      // Calculate due date using configuration-driven intervals
      const dueDate = this.paymentConfigService.calculateDueDate(i, baseDate, paymentInterval);
      
      // Calculate installment amount (add remainder to last installment)
      const installmentAmount = i === installmentCount - 1 
        ? baseInstallmentAmount + remainder 
        : baseInstallmentAmount;
      
      schedule.push({
        amount: installmentAmount,
        dueDate,
        installmentNumber: i + 1,
      });
    }
    
    this.logger.log(
      `Calculated payment schedule: ${schedule.length} installments (${paymentInterval}), total: $${totalAmount}, merchant: ${transaction.merchantId}`
    );
    return schedule;
  }

  /**
   * Get merchant-specific payment configuration
   */
  private async getMerchantPaymentConfig(merchantId: string): Promise<{
    paymentInterval: string;
    gracePeriodDays: number;
    lateFeeAmount: number;
    maxRetries: number;
  }> {
    try {
      // Get merchant-specific settings
      const merchantSettings = await this.merchantSettingsRepository.find({
        where: {
          merchantId,
          settingType: SettingType.PAYMENT,
          isActive: true,
        },
      });

      // Convert settings array to object
      const settingsMap = merchantSettings.reduce((acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      }, {} as any);

      // Get global defaults
      const [
        defaultInterval,
        defaultGracePeriod,
        defaultLateFee,
        defaultMaxRetries,
      ] = await Promise.all([
        this.paymentConfigService.getConfigValue('default.payment.interval'),
        this.paymentConfigService.getConfigValue('default.grace.period.days'),
        this.paymentConfigService.getConfigValue('default.late.fee.amount'),
        this.paymentConfigService.getConfigValue('default.max.retries'),
      ]);

      return {
        paymentInterval: settingsMap.paymentInterval || defaultInterval || 'biweekly',
        gracePeriodDays: parseInt(settingsMap.gracePeriodDays || defaultGracePeriod || '3'),
        lateFeeAmount: parseFloat(settingsMap.lateFeeAmount || defaultLateFee || '25'),
        maxRetries: parseInt(settingsMap.maxRetries || defaultMaxRetries || '3'),
      };
    } catch (error) {
      this.logger.error(`Failed to get merchant payment config for ${merchantId}`, error);
      // Return safe defaults
      return {
        paymentInterval: 'biweekly',
        gracePeriodDays: 3,
        lateFeeAmount: 25,
        maxRetries: 3,
      };
    }
  }

  /**
   * Create payment records with enterprise-grade validation
   */
  private async createPaymentRecords(
    transaction: Transaction,
    schedule: Array<{ amount: number; dueDate: Date; installmentNumber: number }>,
    queryRunner: any
  ): Promise<Payment[]> {
    const payments: Payment[] = [];
    
    for (const installment of schedule) {
      const payment = new Payment();
      payment.amount = installment.amount;
      payment.dueDate = installment.dueDate;
      payment.installmentNumber = installment.installmentNumber;
      payment.status = installment.installmentNumber === 1 ? PaymentStatus.PROCESSING : PaymentStatus.SCHEDULED;
      payment.transactionId = transaction.id;
      payment.transaction = transaction;
      payment.retryCount = 0;
      
      // Save payment record
      const savedPayment = await queryRunner.manager.save(Payment, payment);
      payments.push(savedPayment);
    }
    
    return payments;
  }

  /**
   * Setup payment methods for future installments
   */
  private async setupFuturePaymentMethods(
    transaction: Transaction,
    queryRunner: any
  ): Promise<void> {
    const user = transaction.user;
    
    // Check if user has a default payment method
    const existingPaymentMethod = await queryRunner.manager.findOne(PaymentMethod, {
      where: { userId: user.id, isDefault: true },
    });
    
    if (!existingPaymentMethod && transaction.cardAmount > 0) {
      this.logger.log(`Setting up future payment method for user: ${user.id}`);
      
      // Create Stripe customer if doesn't exist
      if (!user.stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        user.stripeCustomerId = customer.id;
        await queryRunner.manager.save(User, user);
      }
      
      // Create setup intent for future payments
      const setupIntent = await this.stripeService.createSetupIntent(user.stripeCustomerId);
      
      this.logger.log(`Created setup intent: ${setupIntent.id} for user: ${user.id}`);
    }
  }

  /**
   * Validate transaction for payment schedule creation
   */
  private async validateTransaction(transaction: Transaction): Promise<PaymentScheduleValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!transaction.id) {
      errors.push('Transaction ID is required');
    }
    
    if (!transaction.amount || Number(transaction.amount) <= 0) {
      errors.push('Transaction amount must be positive');
    }
    
    if (!transaction.paymentPlan) {
      errors.push('Payment plan is required');
    }
    
    if (!transaction.user) {
      errors.push('Transaction user is required');
    }
    
    // Business rule validation
    const installmentCount = this.getInstallmentCount(transaction.paymentPlan);
    if (installmentCount < 1 || installmentCount > 4) {
      errors.push(`Invalid installment count: ${installmentCount}`);
    }
    
    // Amount validation
    const minAmount = 10; // $10 minimum
    const maxAmount = 10000; // $10,000 maximum
    if (Number(transaction.amount) < minAmount) {
      errors.push(`Amount ${transaction.amount} below minimum ${minAmount}`);
    }
    if (Number(transaction.amount) > maxAmount) {
      warnings.push(`Amount ${transaction.amount} above recommended maximum ${maxAmount}`);
    }
    
    // Check for existing payment schedule
    const existingPayments = await this.paymentRepository.find({
      where: { transactionId: transaction.id },
    });
    
    if (existingPayments.length > 0) {
      errors.push('Payment schedule already exists for this transaction');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate payment schedule integrity
   */
  private async validatePaymentSchedule(payments: Payment[]): Promise<PaymentScheduleValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (payments.length === 0) {
      errors.push('Payment schedule cannot be empty');
      return { isValid: false, errors, warnings, recommendations };
    }

    // Validate installment numbers
    const installmentNumbers = payments.map(p => p.installmentNumber).sort((a, b) => a - b);
    const expectedNumbers = Array.from({ length: payments.length }, (_, i) => i + 1);
    
    if (JSON.stringify(installmentNumbers) !== JSON.stringify(expectedNumbers)) {
      errors.push('Installment numbers must be sequential starting from 1');
    }

    // Validate amounts
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalAmount <= 0) {
      errors.push('Total payment amount must be positive');
    }

    // Validate dates
    const dates = payments.map(p => p.dueDate).sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < dates.length; i++) {
      if (dates[i].getTime() <= dates[i - 1].getTime()) {
        errors.push('Payment due dates must be in ascending order');
        break;
      }
    }

    // Validate first payment status
    const firstPayment = payments.find(p => p.installmentNumber === 1);
    if (firstPayment && firstPayment.status !== PaymentStatus.PROCESSING) {
      warnings.push('First payment should be in PROCESSING status');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  /**
   * Repair corrupted payment schedule
   */
  async repairCorruptedPaymentSchedule(transactionId: string): Promise<PaymentScheduleResult> {
    this.logger.log(`Repairing corrupted payment schedule for transaction: ${transactionId}`);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get existing payments
      const existingPayments = await this.paymentRepository.find({
        where: { transactionId },
        relations: ['transaction'],
      });

      if (existingPayments.length === 0) {
        throw new Error('No existing payments found to repair');
      }

      const transaction = existingPayments[0]?.transaction;
      if (!transaction) {
        throw new Error('Transaction not found in existing payments');
      }
      
      // Delete corrupted payments
      await queryRunner.manager.delete(Payment, { transactionId });
      
      // Recreate payment schedule
      const result = await this.createEnterprisePaymentSchedule(transaction, {
        enableValidation: true,
        enableRepair: false,
      });
      
      await queryRunner.commitTransaction();
      
      this.logger.log(`Successfully repaired payment schedule for transaction: ${transactionId}`);
      return result;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to repair payment schedule for transaction ${transactionId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get installment count from payment plan
   */
  private getInstallmentCount(paymentPlan: PaymentPlan): number {
    switch (paymentPlan) {
      case PaymentPlan.PAY_IN_2:
        return 2;
      case PaymentPlan.PAY_IN_3:
        return 3;
      case PaymentPlan.PAY_IN_4:
        return 4;
      default:
        return 1;
    }
  }

  /**
   * Get payment schedule summary
   */
  async getPaymentScheduleSummary(transactionId: string): Promise<any> {
    const payments = await this.paymentRepository.find({
      where: { transactionId },
      order: { installmentNumber: 'ASC' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paidAmount = payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = totalAmount - paidAmount;

    const nextPayment = payments.find(p => p.status === PaymentStatus.SCHEDULED);

    return {
      totalAmount,
      paidAmount,
      remainingAmount,
      totalInstallments: payments.length,
      completedInstallments: payments.filter(p => p.status === PaymentStatus.COMPLETED).length,
      nextPayment: nextPayment ? {
        amount: nextPayment.amount,
        dueDate: nextPayment.dueDate,
        installmentNumber: nextPayment.installmentNumber,
      } : null,
      schedule: payments.map(p => ({
        installmentNumber: p.installmentNumber,
        amount: p.amount,
        dueDate: p.dueDate,
        status: p.status,
        paidAt: p.paymentDate,
      })),
    };
  }
}