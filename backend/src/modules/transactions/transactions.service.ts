import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { ScalaPayWebSocketGateway } from '../websocket/websocket.gateway';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TransactionRepository } from './repositories/transaction.repository';
import { BusinessRulesService } from './services/business-rules.service';
import { PaymentSchedulerService } from './services/payment-scheduler.service';
import { TransactionStateMachineService } from './services/transaction-state-machine.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private customTransactionRepository: TransactionRepository,
    private businessRulesService: BusinessRulesService,
    private paymentSchedulerService: PaymentSchedulerService,
    private stateMachineService: TransactionStateMachineService,
    private wsGateway: ScalaPayWebSocketGateway,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    // Validate business rules
    await this.businessRulesService.validateTransactionCreation(
      createTransactionDto,
      createTransactionDto.userId!,
    );

    // Create transaction
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      status: TransactionStatus.PENDING,
    });
    
    const saved = await this.transactionRepository.save(transaction);

    // Create payment schedule
    await this.paymentSchedulerService.createPaymentSchedule(saved);

    // Update user's available credit
    await this.updateUserCredit(createTransactionDto.userId!, -Number(createTransactionDto.amount));

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
      await this.stateMachineService.transition(
        transaction.status,
        updateData.status,
        { transaction, user: transaction.user, payments: transaction.payments },
      );
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
    
    return transaction.payments.map(payment => ({
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
}
