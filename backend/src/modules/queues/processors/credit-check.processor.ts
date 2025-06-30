import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { CreditCheckService } from '../../integrations/services/credit-check.service';
import { CreditCheckJob } from '../services/queue.service';

@Processor('credit-checks')
export class CreditCheckProcessor {
  private readonly logger = new Logger(CreditCheckProcessor.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private creditCheckService: CreditCheckService,
  ) {}

  @Process('perform-credit-check')
  async handleCreditCheck(job: Job<CreditCheckJob>): Promise<void> {
    const { userId, requestedAmount, transactionId } = job.data;
    
    this.logger.log(`Processing credit check for user: ${userId}, amount: $${requestedAmount}`);

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Perform credit check
      const creditCheckResult = await this.creditCheckService.performCreditCheck({
        userId,
        requestedAmount,
        email: user.email,
        name: user.name,
      });

      this.logger.log(`Credit check result for user ${userId}: ${creditCheckResult.approved ? 'APPROVED' : 'DENIED'}`);

      // Update transaction if provided
      if (transactionId) {
        await this.updateTransactionWithCreditResult(transactionId, creditCheckResult);
      }

      // Update user's credit information based on result
      await this.updateUserCreditInfo(user, creditCheckResult);

      // Log analytics
      this.logger.log(`Credit check analytics: User ${userId}, Score: ${creditCheckResult.creditScore}, Risk: ${creditCheckResult.riskLevel}`);

    } catch (error) {
      this.logger.error(`Failed to process credit check for user ${userId}:`, error);
      
      // Mark transaction as rejected if provided
      if (transactionId) {
        await this.handleCreditCheckFailure(transactionId, (error as Error).message);
      }
      
      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }

  @Process('periodic-credit-review')
  async handlePeriodicCreditReview(job: Job<{ userId: string }>): Promise<void> {
    const { userId } = job.data;
    
    this.logger.log(`Processing periodic credit review for user: ${userId}`);

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        this.logger.warn(`User not found for periodic review: ${userId}`);
        return;
      }

      // Get user's payment history for the review
      const recentTransactions = await this.transactionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      // Calculate metrics for credit review
      const metrics = this.calculateUserMetrics(recentTransactions);
      
      // Perform credit bureau check
      const bureauReport = await this.creditCheckService.getBureauReport(user);
      
      if (bureauReport) {
        this.logger.log(`Bureau report for user ${userId}: Score ${bureauReport.score}`);
        
        // Update credit limit based on performance and bureau score
        const newLimit = this.calculateNewCreditLimit(user, metrics, bureauReport.score);
        
        if (newLimit !== Number(user.creditLimit)) {
          const oldLimit = Number(user.creditLimit);
          user.creditLimit = newLimit;
          
          // Adjust available credit proportionally
          const creditUtilization = (Number(user.creditLimit) - Number(user.availableCredit)) / Number(user.creditLimit);
          user.availableCredit = newLimit - (newLimit * creditUtilization);
          
          await this.userRepository.save(user);
          
          this.logger.log(`Updated credit limit for user ${userId}: $${oldLimit} -> $${newLimit}`);
        }
      }

    } catch (error) {
      this.logger.error(`Failed to process periodic credit review for user ${userId}:`, error);
      throw error;
    }
  }

  private async updateTransactionWithCreditResult(
    transactionId: string,
    creditResult: any,
  ): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (transaction) {
      if (creditResult.approved) {
        transaction.status = TransactionStatus.APPROVED;
      } else {
        transaction.status = TransactionStatus.REJECTED;
        // Store rejection reason in metadata or separate field
      }

      await this.transactionRepository.save(transaction);
    }
  }

  private async updateUserCreditInfo(user: User, creditResult: any): Promise<void> {
    // Update user's credit information based on the check result
    if (creditResult.creditScore) {
      // You might want to store credit score history
      this.logger.log(`Credit score for user ${user.id}: ${creditResult.creditScore}`);
    }

    // Adjust credit limit if the check suggests changes
    if (creditResult.approved && creditResult.approvedAmount > Number(user.creditLimit)) {
      const increase = Math.min(creditResult.approvedAmount - Number(user.creditLimit), 1000); // Cap increase
      user.creditLimit = Number(user.creditLimit) + increase;
      user.availableCredit = Number(user.availableCredit) + increase;
      
      await this.userRepository.save(user);
      
      this.logger.log(`Increased credit limit for user ${user.id} by $${increase}`);
    }
  }

  private async handleCreditCheckFailure(transactionId: string, errorMessage: string): Promise<void> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });

      if (transaction) {
        transaction.status = TransactionStatus.REJECTED;
        await this.transactionRepository.save(transaction);
      }
    } catch (error) {
      this.logger.error(`Failed to update transaction after credit check failure:`, error);
    }
  }

  private calculateUserMetrics(transactions: Transaction[]): {
    onTimePayments: number;
    totalPayments: number;
    averageAmount: number;
    paymentReliability: number;
  } {
    if (transactions.length === 0) {
      return {
        onTimePayments: 0,
        totalPayments: 0,
        averageAmount: 0,
        paymentReliability: 0,
      };
    }

    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const totalAmount = completedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      onTimePayments: completedTransactions.length,
      totalPayments: transactions.length,
      averageAmount: totalAmount / completedTransactions.length || 0,
      paymentReliability: completedTransactions.length / transactions.length,
    };
  }

  private calculateNewCreditLimit(
    user: User,
    metrics: any,
    bureauScore: number,
  ): number {
    const currentLimit = Number(user.creditLimit);
    let newLimit = currentLimit;

    // Base adjustment on bureau score
    if (bureauScore >= 750) {
      newLimit = Math.min(currentLimit * 1.2, 15000); // 20% increase, max $15k
    } else if (bureauScore >= 700) {
      newLimit = Math.min(currentLimit * 1.1, 10000); // 10% increase, max $10k
    } else if (bureauScore < 600) {
      newLimit = Math.max(currentLimit * 0.8, 500); // 20% decrease, min $500
    }

    // Adjust based on payment reliability
    if (metrics.paymentReliability >= 0.95 && metrics.totalPayments >= 5) {
      newLimit = Math.min(newLimit * 1.1, 15000); // Bonus for excellent payment history
    } else if (metrics.paymentReliability < 0.8) {
      newLimit = Math.max(newLimit * 0.9, 500); // Penalty for poor payment history
    }

    return Math.round(newLimit);
  }
}