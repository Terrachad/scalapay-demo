import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Transaction, TransactionStatus, PaymentPlan } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

@Injectable()
export class BusinessRulesService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async validateTransactionCreation(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const merchant = await this.merchantRepository.findOne({
      where: { id: createTransactionDto.merchantId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!merchant) {
      throw new BadRequestException('Merchant not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is inactive');
    }

    if (!merchant.isActive) {
      throw new BadRequestException('Merchant account is inactive');
    }

    // Validate transaction amount
    this.validateTransactionAmount(createTransactionDto.amount);

    // Validate credit limit
    await this.validateCreditLimit(user, createTransactionDto.amount);

    // Validate items match total amount
    this.validateItemsTotal(createTransactionDto.items, createTransactionDto.amount);

    // Validate payment plan
    this.validatePaymentPlan(createTransactionDto.paymentPlan, createTransactionDto.amount);

    // Check for duplicate transactions
    await this.checkDuplicateTransaction(userId, createTransactionDto);
  }

  async validateStatusTransition(
    transaction: Transaction,
    newStatus: TransactionStatus,
  ): Promise<void> {
    const validTransitions = this.getValidStatusTransitions(transaction.status);

    if (!validTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${transaction.status} to ${newStatus}`,
      );
    }

    // Additional validation based on new status
    if (newStatus === TransactionStatus.APPROVED) {
      await this.validateApprovalConditions(transaction);
    }

    if (newStatus === TransactionStatus.COMPLETED) {
      await this.validateCompletionConditions(transaction);
    }
  }

  private validateTransactionAmount(amount: number): void {
    const MIN_AMOUNT = 1;
    const MAX_AMOUNT = 50000;

    if (amount < MIN_AMOUNT) {
      throw new BadRequestException(`Minimum transaction amount is $${MIN_AMOUNT}`);
    }

    if (amount > MAX_AMOUNT) {
      throw new BadRequestException(`Maximum transaction amount is $${MAX_AMOUNT}`);
    }

    // Validate decimal places
    if (Number((amount % 1).toFixed(2)) !== Number((amount % 1).toFixed(2))) {
      throw new BadRequestException('Amount can have maximum 2 decimal places');
    }
  }

  private async validateCreditLimit(user: User, amount: number): Promise<void> {
    if (user.availableCredit < amount) {
      throw new BadRequestException(
        `Insufficient credit. Available: $${user.availableCredit}, Required: $${amount}`,
      );
    }

    // Check for pending transactions that might affect available credit
    const pendingTransactions = await this.transactionRepository.find({
      where: {
        userId: user.id,
        status: TransactionStatus.PENDING,
      },
    });

    const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const effectiveAvailableCredit = user.availableCredit - pendingAmount;

    if (effectiveAvailableCredit < amount) {
      throw new BadRequestException(
        `Insufficient credit considering pending transactions. Available: $${effectiveAvailableCredit}, Required: $${amount}`,
      );
    }
  }

  private validateItemsTotal(
    items: Array<{ name: string; price: number; quantity: number }>,
    expectedTotal: number,
  ): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('Transaction must have at least one item');
    }

    const calculatedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Allow for small rounding differences
    const tolerance = 0.01;
    if (Math.abs(calculatedTotal - expectedTotal) > tolerance) {
      throw new BadRequestException(
        `Items total ($${calculatedTotal}) does not match transaction amount ($${expectedTotal})`,
      );
    }

    // Validate individual items
    items.forEach((item, index) => {
      if (!item.name || item.name.trim().length === 0) {
        throw new BadRequestException(`Item ${index + 1} must have a name`);
      }

      if (item.price <= 0) {
        throw new BadRequestException(`Item ${index + 1} price must be positive`);
      }

      if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new BadRequestException(`Item ${index + 1} quantity must be a positive integer`);
      }
    });
  }

  private validatePaymentPlan(paymentPlan: PaymentPlan, amount: number): void {
    const MIN_AMOUNT_FOR_INSTALLMENTS = 50;

    if (amount < MIN_AMOUNT_FOR_INSTALLMENTS) {
      throw new BadRequestException(
        `Minimum amount for installment payments is $${MIN_AMOUNT_FOR_INSTALLMENTS}`,
      );
    }

    // Validate minimum installment amount
    const installmentCount = this.getInstallmentCount(paymentPlan);
    const minInstallmentAmount = 10;
    const installmentAmount = amount / installmentCount;

    if (installmentAmount < minInstallmentAmount) {
      throw new BadRequestException(
        `Each installment must be at least $${minInstallmentAmount}`,
      );
    }
  }

  private async checkDuplicateTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const duplicateTransaction = await this.transactionRepository.findOne({
      where: {
        userId,
        merchantId: createTransactionDto.merchantId,
        amount: createTransactionDto.amount,
        createdAt: { $gte: fiveMinutesAgo } as any,
      },
    });

    if (duplicateTransaction) {
      throw new BadRequestException(
        'Duplicate transaction detected. Please wait before creating a similar transaction.',
      );
    }
  }

  private async validateApprovalConditions(transaction: Transaction): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: transaction.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.availableCredit < Number(transaction.amount)) {
      throw new BadRequestException('Insufficient credit for approval');
    }
  }

  private async validateCompletionConditions(transaction: Transaction): Promise<void> {
    // Load transaction with payments
    const transactionWithPayments = await this.transactionRepository.findOne({
      where: { id: transaction.id },
      relations: ['payments'],
    });

    if (!transactionWithPayments?.payments) {
      throw new BadRequestException('No payment schedule found for transaction');
    }

    const allPaymentsCompleted = transactionWithPayments.payments.every(
      (payment) => payment.status === 'completed',
    );

    if (!allPaymentsCompleted) {
      throw new BadRequestException('All payments must be completed before marking transaction as completed');
    }
  }

  private getValidStatusTransitions(currentStatus: TransactionStatus): TransactionStatus[] {
    const transitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [
        TransactionStatus.APPROVED,
        TransactionStatus.REJECTED,
        TransactionStatus.CANCELLED,
      ],
      [TransactionStatus.APPROVED]: [
        TransactionStatus.COMPLETED,
        TransactionStatus.CANCELLED,
      ],
      [TransactionStatus.REJECTED]: [],
      [TransactionStatus.COMPLETED]: [],
      [TransactionStatus.CANCELLED]: [],
    };

    return transitions[currentStatus] || [];
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
        throw new BadRequestException(`Invalid payment plan: ${paymentPlan}`);
    }
  }
}