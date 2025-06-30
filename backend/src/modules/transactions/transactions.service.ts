import { Injectable } from '@nestjs/common';
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
}
