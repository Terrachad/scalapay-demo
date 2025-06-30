import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { ScalaPayWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private wsGateway: ScalaPayWebSocketGateway,
  ) {}

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionRepository.create(data);
    const saved = await this.transactionRepository.save(transaction);
    
    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(saved.user.id, saved);
    
    return saved;
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
    filters: any,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .leftJoinAndSelect('transaction.payments', 'payments');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: filters.status });
    }
    
    if (filters.userId) {
      queryBuilder.andWhere('user.id = :userId', { userId: filters.userId });
    }
    
    if (filters.merchantId) {
      queryBuilder.andWhere('merchant.id = :merchantId', { merchantId: filters.merchantId });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    
    // Order by creation date
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return { transactions, total };
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

  async update(id: string, updateData: Partial<Transaction>): Promise<Transaction> {
    const transaction = await this.findOne(id);
    
    Object.assign(transaction, updateData);
    const updated = await this.transactionRepository.save(transaction);
    
    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(transaction.user.id, updated);
    
    return updated;
  }

  async cancel(id: string): Promise<void> {
    const transaction = await this.findOne(id);
    
    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new Error('Cannot cancel completed transaction');
    }
    
    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new Error('Transaction already cancelled');
    }

    await this.update(id, { status: TransactionStatus.CANCELLED });
  }

  async retryPayment(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    
    if (transaction.status !== TransactionStatus.REJECTED) {
      throw new Error('Can only retry rejected transactions');
    }

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
      paidAt: payment.paidAt,
    }));
  }
}
