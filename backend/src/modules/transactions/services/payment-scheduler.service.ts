import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Transaction, PaymentPlan } from '../entities/transaction.entity';
import { PaymentConfigService } from '../../payments/services/payment-config.service';
import { StripeService } from '../../payments/services/stripe.service';

export interface PaymentSchedule {
  amount: number;
  dueDate: Date;
  installmentNumber: number;
}

@Injectable()
export class PaymentSchedulerService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paymentConfigService: PaymentConfigService,
    private stripeService: StripeService,
  ) {}

  async calculatePaymentSchedule(
    amount: number,
    paymentPlan: PaymentPlan,
    merchantId?: string,
    startDate: Date = new Date(),
  ): Promise<PaymentSchedule[]> {
    // Use default config if no merchantId provided
    const config = merchantId
      ? await this.paymentConfigService.getConfigForMerchant(merchantId)
      : {
          paymentInterval: 'biweekly',
          gracePeriodDays: 3,
          lateFeeAmount: 25,
          maxRetries: 3,
        };
    const installments = this.getInstallmentCount(paymentPlan);
    const installmentAmount = this.calculateInstallmentAmount(amount, installments);
    const schedule: PaymentSchedule[] = [];

    // Create payments with temporary numbering first
    for (let i = 0; i < installments; i++) {
      const dueDate = this.paymentConfigService.calculateDueDate(
        i,
        startDate,
        config.paymentInterval,
      );

      // Adjust the last payment to account for rounding
      const paymentAmount =
        i === installments - 1
          ? amount - installmentAmount * (installments - 1)
          : installmentAmount;

      schedule.push({
        amount: paymentAmount,
        dueDate,
        installmentNumber: 0, // Temporary - will be assigned after sorting
      });
    }

    // CRITICAL: Sort by due date first, then assign correct installment numbers
    const sortedSchedule = schedule.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    // Reassign installment numbers based on chronological order
    sortedSchedule.forEach((payment, index) => {
      payment.installmentNumber = index + 1;
    });

    return sortedSchedule;
  }

  async createPaymentSchedule(transaction: Transaction): Promise<Payment[]> {
    // Schedule is already sorted chronologically with correct installment numbers
    const schedule = await this.calculatePaymentSchedule(
      transaction.amount,
      transaction.paymentPlan,
      transaction.merchantId,
    );

    const payments: Payment[] = [];

    // Create payments using the correctly ordered schedule
    for (const scheduledPayment of schedule) {
      const payment = new Payment();
      payment.amount = scheduledPayment.amount;
      payment.dueDate = scheduledPayment.dueDate;
      payment.installmentNumber = scheduledPayment.installmentNumber; // Already correctly assigned
      payment.transactionId = transaction.id;
      payment.transaction = transaction;

      // CRITICAL: Process first payment immediately if due now or in the past
      const now = new Date();
      if (scheduledPayment.installmentNumber === 1 && scheduledPayment.dueDate <= now) {
        payment.status = PaymentStatus.PROCESSING;
        // First payment will be processed immediately after saving
      } else {
        payment.status = PaymentStatus.SCHEDULED;
      }

      payments.push(payment);
    }

    const savedPayments = await this.paymentRepository.save(payments);

    // Process first payment immediately if it's due now
    const firstPayment = savedPayments.find((p) => p.installmentNumber === 1);
    if (firstPayment && firstPayment.status === PaymentStatus.PROCESSING) {
      await this.processFirstPaymentImmediately(firstPayment);
    }

    return savedPayments;
  }

  async schedulePayments(transaction: Transaction): Promise<Payment[]> {
    return this.createPaymentSchedule(transaction);
  }

  async getUpcomingPayments(userId: string, daysAhead: number = 7): Promise<Payment[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('payment.status = :status', { status: PaymentStatus.SCHEDULED })
      .andWhere('payment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('payment.dueDate', 'ASC')
      .getMany();
  }

  async getOverduePayments(userId?: string): Promise<Payment[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('payment.status = :status', { status: PaymentStatus.SCHEDULED })
      .andWhere('payment.dueDate < :currentDate', { currentDate: new Date() });

    if (userId) {
      queryBuilder.andWhere('user.id = :userId', { userId });
    }

    return queryBuilder.orderBy('payment.dueDate', 'ASC').getMany();
  }

  async recalculatePaymentSchedule(
    transaction: Transaction,
    remainingAmount: number,
  ): Promise<Payment[]> {
    // Remove existing scheduled payments
    await this.paymentRepository.delete({
      transactionId: transaction.id,
      status: PaymentStatus.SCHEDULED,
    });

    // Create new schedule for remaining amount
    const schedule = await this.calculatePaymentSchedule(
      remainingAmount,
      transaction.paymentPlan,
      transaction.merchantId,
    );

    const payments: Payment[] = [];

    for (const scheduledPayment of schedule) {
      const payment = new Payment();
      payment.amount = scheduledPayment.amount;
      payment.dueDate = scheduledPayment.dueDate;
      payment.status = PaymentStatus.SCHEDULED;
      payment.transactionId = transaction.id;
      payment.transaction = transaction;

      payments.push(payment);
    }

    return this.paymentRepository.save(payments);
  }

  private getInstallmentCount(paymentPlan: PaymentPlan): number {
    switch (paymentPlan) {
      case PaymentPlan.PAY_IN_2:
        return 2;
      case PaymentPlan.PAY_IN_3:
        return 3;
      case PaymentPlan.PAY_IN_4:
        return 4;
      default:
        throw new Error(`Unsupported payment plan: ${paymentPlan}`);
    }
  }

  private calculateInstallmentAmount(totalAmount: number, installments: number): number {
    // Round to 2 decimal places
    return Math.round((totalAmount / installments) * 100) / 100;
  }

  async getPaymentPlanInfo(paymentPlan: PaymentPlan, merchantId?: string) {
    // Use default config if no merchantId provided
    const config = merchantId
      ? await this.paymentConfigService.getConfigForMerchant(merchantId)
      : {
          paymentInterval: 'biweekly',
          gracePeriodDays: 3,
          lateFeeAmount: 25,
          maxRetries: 3,
          firstPaymentDelayHours: 0,
        };
    const installments = this.getInstallmentCount(paymentPlan);
    const intervalDescription = this.paymentConfigService.getIntervalDescription(config);

    return {
      installments,
      description: `Pay in ${installments} installments`,
      frequency: intervalDescription,
      firstPaymentDue:
        config.firstPaymentDelayHours === 0
          ? 'Immediately upon approval'
          : `${config.firstPaymentDelayHours} hours after approval`,
      config,
    };
  }

  /**
   * Process the first payment immediately for better cash flow
   */
  private async processFirstPaymentImmediately(payment: Payment): Promise<void> {
    try {
      console.log(`💳 Processing first payment immediately: ${payment.id} - $${payment.amount}`);

      // If transaction uses Stripe (insufficient credit), process through Stripe
      if (
        payment.transaction?.paymentMethod === 'stripe' &&
        payment.transaction?.stripePaymentIntentId
      ) {
        await this.stripeService.processInstallmentPayment(payment);
        console.log(`✅ First payment processed via Stripe: ${payment.id}`);
      } else {
        // For credit-based payments, mark as completed since credit was already deducted
        await this.paymentRepository.update(payment.id, {
          status: PaymentStatus.COMPLETED,
          paymentDate: new Date(),
        });
        console.log(`✅ First payment completed via credit: ${payment.id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process first payment immediately: ${payment.id}`, error);
      // Mark as failed but don't throw to prevent transaction creation failure
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        failureReason: `Immediate processing failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
