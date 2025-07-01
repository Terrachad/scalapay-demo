import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { ScalaPayWebSocketGateway } from '../websocket/websocket.gateway';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TransactionRepository } from './repositories/transaction.repository';
import { BusinessRulesService } from './services/business-rules.service';
import { PaymentSchedulerService } from './services/payment-scheduler.service';
import { TransactionStateMachineService } from './services/transaction-state-machine.service';
import { StripeService } from '../payments/services/stripe.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private customTransactionRepository: TransactionRepository,
    private businessRulesService: BusinessRulesService,
    private paymentSchedulerService: PaymentSchedulerService,
    private stateMachineService: TransactionStateMachineService,
    private wsGateway: ScalaPayWebSocketGateway,
    private stripeService: StripeService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: createTransactionDto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Get user to check credit availability
    const user = await this.userRepository.findOne({
      where: { id: createTransactionDto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate business rules (this now allows insufficient credit)
    await this.businessRulesService.validateTransactionCreation(
      createTransactionDto,
      createTransactionDto.userId!,
    );

    // Check if user has sufficient credit
    const hasInsufficientCredit = user.availableCredit < createTransactionDto.amount;

    // Calculate risk score for automatic approval decision
    const riskScore = await this.calculateRiskScore(createTransactionDto);

    // Determine initial status based on risk assessment
    const initialStatus = riskScore <= 30 ? TransactionStatus.APPROVED : TransactionStatus.PENDING;

    let stripePaymentIntentId: string | undefined;

    // If credit is insufficient, create Stripe Payment Intent
    if (hasInsufficientCredit) {
      // Create Stripe customer if doesn't exist
      if (!user.stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        user.stripeCustomerId = customer.id;
        await this.userRepository.save(user);
      }

      // Create payment intent for the full amount
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: createTransactionDto.amount,
        currency: 'usd',
        customerId: user.stripeCustomerId,
        metadata: {
          userId: createTransactionDto.userId,
          merchantId: createTransactionDto.merchantId,
          paymentPlan: createTransactionDto.paymentPlan,
        },
      });

      stripePaymentIntentId = paymentIntent.paymentIntentId;
    }

    // Create transaction
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      status: initialStatus,
      riskScore, // Store risk score for admin review
      stripePaymentIntentId, // Store Stripe payment intent if created
      paymentMethod: hasInsufficientCredit ? 'stripe' : 'credit', // Track payment method
    });

    const saved = await this.transactionRepository.save(transaction);

    // Only create payment schedule and deduct credit if using credit and automatically approved
    if (initialStatus === TransactionStatus.APPROVED) {
      await this.paymentSchedulerService.createPaymentSchedule(saved);
      
      if (!hasInsufficientCredit) {
        // Only deduct credit if user has sufficient credit
        await this.updateUserCredit(
          createTransactionDto.userId!,
          -Number(createTransactionDto.amount),
        );
      }
    }

    // Load complete transaction with relations
    const completeTransaction = await this.findOne(saved.id);

    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(completeTransaction.user.id, completeTransaction);

    return completeTransaction;
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['merchant', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByMerchant(merchantId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { merchant: { id: merchantId } },
      relations: ['user', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = status;
    const updated = await this.transactionRepository.save(transaction);

    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(transaction.user.id, updated);

    return updated;
  }

  async findAll(
    filters: TransactionFilterDto,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    return this.customTransactionRepository.findWithFilters(filters, page, limit);
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user', 'merchant', 'payments'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(id: string, updateData: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.findOne(id);

    // Validate status transition if status is being updated
    if (updateData.status && updateData.status !== transaction.status) {
      await this.businessRulesService.validateStatusTransition(transaction, updateData.status);

      // Use state machine for transition
      await this.stateMachineService.transition(transaction.status, updateData.status, {
        transaction,
        user: transaction.user,
        payments: transaction.payments,
      });
    }

    Object.assign(transaction, updateData);
    const updated = await this.transactionRepository.save(transaction);

    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(transaction.user.id, updated);

    return updated;
  }

  async cancel(id: string): Promise<void> {
    const transaction = await this.findOne(id);

    // Validate cancellation using state machine
    const canCancel = await this.stateMachineService.canTransition(
      transaction.status,
      TransactionStatus.CANCELLED,
      { transaction, payments: transaction.payments },
    );

    if (!canCancel) {
      throw new Error(`Cannot cancel transaction in ${transaction.status} status`);
    }

    await this.update(id, { status: TransactionStatus.CANCELLED });

    // Restore user's credit
    await this.updateUserCredit(transaction.userId, Number(transaction.amount));
  }

  async retryPayment(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);

    if (transaction.status !== TransactionStatus.REJECTED) {
      throw new Error('Can only retry rejected transactions');
    }

    // Validate if user still has sufficient credit
    await this.businessRulesService.validateTransactionCreation(
      {
        amount: Number(transaction.amount),
        merchantId: transaction.merchantId,
        paymentPlan: transaction.paymentPlan,
        items: transaction.items,
        userId: transaction.userId,
      },
      transaction.userId,
    );

    // Reset status to pending for retry
    return await this.update(id, { status: TransactionStatus.PENDING });
  }

  async getPaymentSchedule(id: string): Promise<any[]> {
    const transaction = await this.findOne(id);

    return transaction.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      dueDate: payment.dueDate,
      status: payment.status,
      paidAt: payment.paymentDate,
    }));
  }

  private async updateUserCredit(userId: string, creditChange: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.availableCredit = Number(user.availableCredit) + creditChange;
      await this.userRepository.save(user);
    }
  }

  async approveTransaction(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Update transaction status to approved and process it
    transaction.status = TransactionStatus.APPROVED;
    const savedTransaction = await this.transactionRepository.save(transaction);

    // Schedule payment processing
    await this.paymentSchedulerService.schedulePayments(transaction);

    // Emit WebSocket event
    this.wsGateway.emitTransactionUpdate(savedTransaction.userId, savedTransaction);

    return savedTransaction;
  }

  async rejectTransaction(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Update transaction status to failed (rejected)
    transaction.status = TransactionStatus.FAILED;
    const savedTransaction = await this.transactionRepository.save(transaction);

    // Restore user credit if it was deducted
    await this.updateUserCredit(transaction.user.id, Number(transaction.amount));

    // Emit WebSocket event
    this.wsGateway.emitTransactionUpdate(savedTransaction.userId, savedTransaction);

    return savedTransaction;
  }

  private async calculateRiskScore(createTransactionDto: CreateTransactionDto): Promise<number> {
    let riskScore = 0;

    try {
      // Get user's transaction history
      const user = await this.userRepository.findOne({
        where: { id: createTransactionDto.userId },
      });

      if (!user) {
        return 80; // High risk for unknown user
      }

      const userTransactions = await this.transactionRepository.find({
        where: { user: { id: createTransactionDto.userId } },
        order: { createdAt: 'DESC' },
      });

      // Risk factors:

      // 1. New user (no transaction history)
      if (userTransactions.length === 0) {
        riskScore += 25;
      }

      // 2. High transaction amount relative to credit limit
      const amountRatio = Number(createTransactionDto.amount) / Number(user.creditLimit);
      if (amountRatio > 0.8) {
        riskScore += 30;
      } else if (amountRatio > 0.5) {
        riskScore += 15;
      }

      // 3. Recent failed transactions
      const recentFailedTransactions = userTransactions
        .filter((t) => t.status === TransactionStatus.FAILED)
        .filter((t) => {
          const daysDiff =
            (new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24);
          return daysDiff <= 30; // Last 30 days
        });

      riskScore += recentFailedTransactions.length * 10;

      // 4. Insufficient available credit
      if (Number(user.availableCredit) < Number(createTransactionDto.amount)) {
        riskScore += 40;
      }

      // 5. Multiple transactions in short period
      const todayTransactions = userTransactions.filter((t) => {
        const daysDiff =
          (new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24);
        return daysDiff < 1;
      });

      if (todayTransactions.length >= 3) {
        riskScore += 20;
      }

      // 6. Large payment plan (higher risk for longer terms)
      if (createTransactionDto.paymentPlan === 'pay_in_4') {
        riskScore += 5;
      } else if (createTransactionDto.paymentPlan === 'pay_in_3') {
        riskScore += 3;
      }

      // Cap at 100
      return Math.min(riskScore, 100);
    } catch (error) {
      // If risk calculation fails, default to medium-high risk
      return 70;
    }
  }
}
