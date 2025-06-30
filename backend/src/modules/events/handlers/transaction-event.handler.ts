import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';

export interface TransactionCreatedEvent {
  transactionId: string;
  userId: string;
  merchantId: string;
  amount: number;
  paymentPlan: string;
}

export interface TransactionCompletedEvent {
  transactionId: string;
  userId: string;
  amount: number;
}

export interface TransactionCancelledEvent {
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
}

@Injectable()
export class TransactionEventHandler {
  private readonly logger = new Logger(TransactionEventHandler.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    this.logger.log(`Handling transaction created event: ${event.transactionId}`);

    try {
      // Update analytics and metrics
      this.logger.log(`Transaction analytics: New transaction ${event.transactionId} for $${event.amount} by user ${event.userId}`);

      // Could trigger risk assessment, fraud detection, etc.
      // Update user's transaction history metrics
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // Update user metrics, could track total transaction value, frequency, etc.
        this.logger.log(`User ${event.userId} created transaction of $${event.amount}`);
      }

    } catch (error) {
      this.logger.error(`Error handling transaction created event:`, error);
    }
  }

  @OnEvent('transaction.completed')
  async handleTransactionCompleted(event: TransactionCompletedEvent): Promise<void> {
    this.logger.log(`Handling transaction completed event: ${event.transactionId}`);

    try {
      // Update user's transaction history and potentially credit score
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // Successful completion could improve credit score or limit
        this.logger.log(`User ${event.userId} successfully completed transaction of $${event.amount}`);
        
        // Could trigger credit limit increase logic
        await this.considerCreditLimitIncrease(user, event.amount);
      }

      // Update business analytics
      this.logger.log(`Transaction completion analytics: Transaction ${event.transactionId} completed for $${event.amount}`);

    } catch (error) {
      this.logger.error(`Error handling transaction completed event:`, error);
    }
  }

  @OnEvent('transaction.cancelled')
  async handleTransactionCancelled(event: TransactionCancelledEvent): Promise<void> {
    this.logger.log(`Handling transaction cancelled event: ${event.transactionId}`);

    try {
      // Restore user's available credit
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        user.availableCredit = Number(user.availableCredit) + event.amount;
        await this.userRepository.save(user);
        
        this.logger.log(`Restored $${event.amount} credit to user ${event.userId} due to cancellation`);
      }

      // Log cancellation analytics
      this.logger.log(`Transaction cancellation analytics: Transaction ${event.transactionId} cancelled, reason: ${event.reason}`);

    } catch (error) {
      this.logger.error(`Error handling transaction cancelled event:`, error);
    }
  }

  @OnEvent('transaction.approved')
  async handleTransactionApproved(event: { transactionId: string; userId: string; amount: number }): Promise<void> {
    this.logger.log(`Handling transaction approved event: ${event.transactionId}`);

    try {
      // Update user metrics for successful approval
      this.logger.log(`Transaction approval analytics: Transaction ${event.transactionId} approved for user ${event.userId}`);

      // Could trigger welcome email for first-time users
      const userTransactionCount = await this.transactionRepository.count({
        where: { userId: event.userId },
      });

      if (userTransactionCount === 1) {
        this.logger.log(`First transaction approved for user ${event.userId} - consider sending welcome materials`);
      }

    } catch (error) {
      this.logger.error(`Error handling transaction approved event:`, error);
    }
  }

  @OnEvent('transaction.rejected')
  async handleTransactionRejected(event: { transactionId: string; userId: string; reason: string }): Promise<void> {
    this.logger.log(`Handling transaction rejected event: ${event.transactionId}`);

    try {
      // Log rejection analytics
      this.logger.log(`Transaction rejection analytics: Transaction ${event.transactionId} rejected for user ${event.userId}, reason: ${event.reason}`);

      // Could trigger customer service outreach or credit education materials
      // Multiple rejections might warrant account review

    } catch (error) {
      this.logger.error(`Error handling transaction rejected event:`, error);
    }
  }

  private async considerCreditLimitIncrease(user: User, transactionAmount: number): Promise<void> {
    try {
      // Simple logic for credit limit increase
      const completedTransactions = await this.transactionRepository.count({
        where: { 
          userId: user.id,
          status: 'completed',
        },
      });

      // After 5 successful transactions, consider increasing limit
      if (completedTransactions >= 5 && completedTransactions % 5 === 0) {
        const increaseAmount = Math.min(transactionAmount * 0.1, 500); // 10% of transaction or $500, whichever is smaller
        const newLimit = Number(user.creditLimit) + increaseAmount;
        
        // Cap at reasonable maximum
        if (newLimit <= 15000) {
          user.creditLimit = newLimit;
          user.availableCredit = Number(user.availableCredit) + increaseAmount;
          await this.userRepository.save(user);
          
          this.logger.log(`Increased credit limit for user ${user.id} by $${increaseAmount} to $${newLimit}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error considering credit limit increase:`, error);
    }
  }
}