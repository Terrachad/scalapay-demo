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
import { EnterprisePaymentSchedulerService } from '../payments/services/enterprise-payment-scheduler.service';
import { UnifiedPaymentSortingService } from '../payments/services/unified-payment-sorting.service';
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
    private enterprisePaymentSchedulerService: EnterprisePaymentSchedulerService,
    private unifiedPaymentSortingService: UnifiedPaymentSortingService,
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

    // Determine payment method from user preference or default logic
    const paymentPreference = createTransactionDto.paymentMethodPreference;
    let creditAmount = 0;
    let cardAmount = 0;
    let paymentMethod = 'credit';

    if (paymentPreference) {
      // User explicitly chose payment method
      creditAmount = paymentPreference.creditAmount || 0;
      cardAmount = paymentPreference.cardAmount || 0;
      paymentMethod = paymentPreference.type === 'split' ? 'hybrid' : paymentPreference.type;
    } else {
      // Default logic: use credit if available, otherwise card
      if (user.availableCredit >= createTransactionDto.amount) {
        creditAmount = createTransactionDto.amount;
        cardAmount = 0;
        paymentMethod = 'credit';
      } else {
        creditAmount = user.availableCredit;
        cardAmount = createTransactionDto.amount - user.availableCredit;
        paymentMethod = creditAmount > 0 ? 'hybrid' : 'stripe';
      }
    }

    // Validate amounts
    creditAmount = Math.min(creditAmount, user.availableCredit, createTransactionDto.amount);
    cardAmount = createTransactionDto.amount - creditAmount;

    console.log('💰 Payment calculation debug:');
    console.log('  User available credit:', user.availableCredit);
    console.log('  Transaction amount:', createTransactionDto.amount);
    console.log('  Credit amount:', creditAmount);
    console.log('  Card amount:', cardAmount);
    console.log('  Payment method:', paymentMethod);

    // Calculate risk score for automatic approval decision
    const riskScore = await this.calculateRiskScore(createTransactionDto);

    // Determine initial status based on risk assessment
    const initialStatus = riskScore <= 30 ? TransactionStatus.APPROVED : TransactionStatus.PENDING;

    let stripePaymentIntentId: string | undefined;
    let stripeClientSecret: string | undefined;

    // Create Stripe payment intent if card payment is required
    if (cardAmount > 0) {
      // Create Stripe customer if doesn't exist
      if (!user.stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user.email, user.name);
        user.stripeCustomerId = customer.id;
        await this.userRepository.save(user);
      }

      // Calculate first installment amount for BNPL
      const installments = this.getInstallmentCount(createTransactionDto.paymentPlan);
      const firstInstallmentCardAmount =
        installments > 1 ? Math.round((cardAmount / installments) * 100) / 100 : cardAmount;

      console.log('📊 Installment calculation debug:');
      console.log('  Payment plan:', createTransactionDto.paymentPlan);
      console.log('  Total installments:', installments);
      console.log('  Card amount:', cardAmount);
      console.log('  First installment card amount:', firstInstallmentCardAmount);

      // Create payment intent for FIRST INSTALLMENT CARD AMOUNT ONLY
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: firstInstallmentCardAmount,
        currency: 'usd',
        customerId: user.stripeCustomerId,
        description: `ScalaPay BNPL Payment - Installment 1/${installments}`,
        statementDescriptor: 'BNPL', // Max 10 chars for statement_descriptor_suffix
        receiptEmail: user.email,
        setupFutureUsage: installments > 1 ? 'off_session' : undefined, // Save payment method for future installments
        metadata: {
          userId: createTransactionDto.userId,
          merchantId: createTransactionDto.merchantId,
          paymentPlan: createTransactionDto.paymentPlan,
          totalAmount: createTransactionDto.amount.toString(),
          cardAmount: cardAmount.toString(),
          creditAmount: creditAmount.toString(),
          installmentNumber: '1',
          totalInstallments: installments.toString(),
          firstInstallmentCardAmount: firstInstallmentCardAmount.toString(),
          paymentMethod: paymentMethod,
          transactionType: 'bnpl_first_installment',
          businessName: 'ScalaPay Demo Store',
        },
      });

      stripePaymentIntentId = paymentIntent.paymentIntentId;
      stripeClientSecret = paymentIntent.clientSecret;
    }

    // Create transaction
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      status: initialStatus,
      riskScore, // Store risk score for admin review
      stripePaymentIntentId, // Store Stripe payment intent if created
      paymentMethod, // Track payment method (credit/stripe/hybrid)
      creditAmount, // Store credit amount used
      cardAmount, // Store card amount used
    });

    const saved = await this.transactionRepository.save(transaction);

    // Handle approved transactions
    if (initialStatus === TransactionStatus.APPROVED) {
      // Deduct credit amount immediately if any credit is used
      if (creditAmount > 0) {
        await this.updateUserCredit(createTransactionDto.userId!, -Number(creditAmount));
      }

      // Create payment schedule using enterprise scheduler for maximum reliability
      // Pure credit transactions get full schedule, Stripe transactions get scheduled in webhook
      if (cardAmount === 0) {
        // Pure credit transaction - use enterprise payment scheduler for bulletproof scheduling
        await this.enterprisePaymentSchedulerService.createEnterprisePaymentSchedule(saved);
      }
    }

    // Load complete transaction with relations but keep dynamic fields
    const completeTransaction = await this.findOne(saved.id);

    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(completeTransaction.user.id, completeTransaction);

    console.log('🔧 Final transaction return debug:');
    console.log('  - stripeClientSecret:', stripeClientSecret ? 'Present' : 'Missing');
    console.log('  - cardAmount:', cardAmount);
    console.log('  - Will include payment fields:', !!stripeClientSecret);

    // Return transaction with clientSecret if card payment is required
    // IMPORTANT: Build response directly with payment fields to avoid losing them
    const responseData = {
      ...completeTransaction,
      // Always include payment fields when card payment is required
      requiresPayment: !!stripeClientSecret,
      clientSecret: stripeClientSecret,
      firstInstallmentCardAmount: stripeClientSecret
        ? Math.round(
            (cardAmount / this.getInstallmentCount(createTransactionDto.paymentPlan)) * 100,
          ) / 100
        : undefined,
      paymentBreakdown: stripeClientSecret
        ? {
            creditAmount,
            cardAmount,
            totalAmount: createTransactionDto.amount,
          }
        : undefined,
    };

    console.log('🚀 Returning transaction data:', {
      hasRequiresPayment: 'requiresPayment' in responseData,
      hasClientSecret: 'clientSecret' in responseData,
      hasFirstInstallment: 'firstInstallmentCardAmount' in responseData,
      requiresPaymentValue: responseData.requiresPayment,
      clientSecretExists: !!responseData.clientSecret,
      firstInstallmentValue: responseData.firstInstallmentCardAmount,
    });

    // Additional debug: log the exact response structure being returned
    console.log(
      '📤 Full response object being returned:',
      JSON.stringify(
        {
          id: responseData.id,
          amount: responseData.amount,
          requiresPayment: responseData.requiresPayment,
          clientSecret: responseData.clientSecret ? '[CLIENT_SECRET_PRESENT]' : undefined,
          firstInstallmentCardAmount: responseData.firstInstallmentCardAmount,
          paymentBreakdown: responseData.paymentBreakdown,
        },
        null,
        2,
      ),
    );

    return responseData;
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['merchant', 'payments'],
      order: { createdAt: 'DESC' },
    });

    // Use enterprise-grade unified payment sorting for consistent results
    return this.unifiedPaymentSortingService.sortTransactionsWithPayments(transactions, {
      sortBy: 'hybrid',
      order: 'ASC',
      validateSequence: true,
      repairSequence: false, // Don't auto-repair in read operations
    });
  }

  async findByMerchant(merchantId: string): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.find({
      where: { merchant: { id: merchantId } },
      relations: ['user', 'payments'],
      order: { createdAt: 'DESC' },
    });

    // Use enterprise-grade unified payment sorting for consistent results
    return this.unifiedPaymentSortingService.sortTransactionsWithPayments(transactions, {
      sortBy: 'hybrid',
      order: 'ASC',
      validateSequence: true,
      repairSequence: false, // Don't auto-repair in read operations
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

  private getInstallmentCount(paymentPlan: string): number {
    switch (paymentPlan) {
      case 'pay_in_2':
        return 2;
      case 'pay_in_3':
        return 3;
      case 'pay_in_4':
        return 4;
      default:
        return 1;
    }
  }
}
