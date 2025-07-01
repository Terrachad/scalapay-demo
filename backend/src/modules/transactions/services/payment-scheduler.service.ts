import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Transaction, PaymentPlan } from '../entities/transaction.entity';

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
  ) {}

  calculatePaymentSchedule(
    amount: number,
    paymentPlan: PaymentPlan,
    startDate: Date = new Date(),
  ): PaymentSchedule[] {
    const installments = this.getInstallmentCount(paymentPlan);
    const installmentAmount = this.calculateInstallmentAmount(amount, installments);
    const schedule: PaymentSchedule[] = [];

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate);

      if (i === 0) {
        // First payment due immediately (or within 24 hours)
        dueDate.setHours(dueDate.getHours() + 24);
      } else {
        // Subsequent payments due every 2 weeks
        dueDate.setDate(dueDate.getDate() + i * 14);
      }

      // Adjust the last payment to account for rounding
      const paymentAmount =
        i === installments - 1
          ? amount - installmentAmount * (installments - 1)
          : installmentAmount;

      schedule.push({
        amount: paymentAmount,
        dueDate,
        installmentNumber: i + 1,
      });
    }

    return schedule;
  }

  async createPaymentSchedule(transaction: Transaction): Promise<Payment[]> {
    const schedule = this.calculatePaymentSchedule(transaction.amount, transaction.paymentPlan);

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
    const schedule = this.calculatePaymentSchedule(remainingAmount, transaction.paymentPlan);

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

  getPaymentPlanInfo(paymentPlan: PaymentPlan) {
    const installments = this.getInstallmentCount(paymentPlan);

    return {
      installments,
      description: `Pay in ${installments} installments`,
      frequency: installments === 2 ? 'Every 2 weeks' : 'Every 2 weeks',
      firstPaymentDue: '24 hours after approval',
    };
  }
}
