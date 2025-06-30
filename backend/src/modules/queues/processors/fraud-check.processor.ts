import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { FraudDetectionService } from '../../integrations/services/fraud-detection.service';
import { FraudCheckJob } from '../services/queue.service';

@Processor('fraud-detection')
export class FraudCheckProcessor {
  private readonly logger = new Logger(FraudCheckProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private fraudDetectionService: FraudDetectionService,
  ) {}

  @Process('fraud-analysis')
  async handleFraudAnalysis(job: Job<FraudCheckJob>): Promise<void> {
    const { transactionId, userId, amount, metadata } = job.data;
    
    this.logger.log(`Processing fraud analysis for transaction: ${transactionId}`);

    try {
      const [transaction, user] = await Promise.all([
        this.transactionRepository.findOne({
          where: { id: transactionId },
          relations: ['user', 'merchant'],
        }),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);

      if (!transaction || !user) {
        throw new Error(`Transaction or user not found: ${transactionId}, ${userId}`);
      }

      // Perform fraud detection analysis
      const fraudResult = await this.fraudDetectionService.checkForFraud({
        userId,
        transactionAmount: amount,
        merchantId: transaction.merchantId,
        userEmail: user.email,
        ipAddress: metadata?.ipAddress,
        deviceFingerprint: metadata?.deviceFingerprint,
        userAgent: metadata?.userAgent,
        billingAddress: metadata?.billingAddress,
      });

      this.logger.log(`Fraud analysis result for transaction ${transactionId}: ${fraudResult.decision}, risk score: ${fraudResult.riskScore}`);

      // Handle the fraud detection result
      await this.handleFraudResult(transaction, fraudResult);

      // Log analytics
      this.logger.log(`Fraud analytics: Transaction ${transactionId}, Score: ${fraudResult.riskScore}, Decision: ${fraudResult.decision}`);

    } catch (error) {
      this.logger.error(`Failed to process fraud analysis for transaction ${transactionId}:`, error);
      
      // On error, flag transaction for manual review
      await this.flagTransactionForReview(transactionId, (error as Error).message);
      
      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }

  @Process('risk-pattern-analysis')
  async handleRiskPatternAnalysis(job: Job<{ userId: string; timeframe: string }>): Promise<void> {
    const { userId, timeframe } = job.data;
    
    this.logger.log(`Processing risk pattern analysis for user: ${userId}`);

    try {
      // Analyze user's transaction patterns over time
      const patterns = await this.analyzeUserPatterns(userId, timeframe);
      
      if (patterns.riskLevel === 'HIGH') {
        this.logger.warn(`High risk patterns detected for user ${userId}`);
        
        // Flag user for review or apply restrictions
        await this.applyRiskMeasures(userId, patterns);
      }

      this.logger.log(`Risk pattern analysis completed for user ${userId}: ${patterns.riskLevel}`);

    } catch (error) {
      this.logger.error(`Failed to process risk pattern analysis for user ${userId}:`, error);
      throw error;
    }
  }

  private async handleFraudResult(transaction: Transaction, fraudResult: any): Promise<void> {
    switch (fraudResult.decision) {
      case 'APPROVE':
        // Transaction can proceed normally
        this.logger.log(`Transaction ${transaction.id} approved by fraud detection`);
        break;

      case 'DECLINE':
        // Block the transaction
        transaction.status = TransactionStatus.REJECTED;
        await this.transactionRepository.save(transaction);
        
        this.logger.warn(`Transaction ${transaction.id} declined due to fraud risk`);
        
        // Log fraud attempt
        await this.fraudDetectionService.logFraudAttempt(transaction.userId, {
          transactionId: transaction.id,
          riskScore: fraudResult.riskScore,
          riskFactors: fraudResult.riskFactors,
        });
        break;

      case 'REVIEW':
        // Flag for manual review
        await this.flagTransactionForReview(transaction.id, fraudResult.recommendedAction);
        
        this.logger.log(`Transaction ${transaction.id} flagged for manual review`);
        break;

      default:
        this.logger.warn(`Unknown fraud detection decision: ${fraudResult.decision}`);
    }

    // Store fraud analysis results (you might want to create a separate table for this)
    this.logger.log(`Fraud analysis stored for transaction ${transaction.id}`);
  }

  private async flagTransactionForReview(transactionId: string, reason: string): Promise<void> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });

      if (transaction) {
        // You might want to add a 'review' status or use metadata to flag for review
        // For now, we'll just log it
        this.logger.warn(`Transaction ${transactionId} flagged for manual review: ${reason}`);
        
        // In a real system, you might:
        // - Set transaction status to 'under_review'
        // - Create a review ticket
        // - Notify fraud analysts
        // - Temporarily hold the transaction
      }
    } catch (error) {
      this.logger.error(`Failed to flag transaction for review:`, error);
    }
  }

  private async analyzeUserPatterns(userId: string, timeframe: string): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    patterns: string[];
    score: number;
  }> {
    const days = this.parseTimeframe(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        createdAt: { $gte: startDate } as any,
      },
      order: { createdAt: 'DESC' },
    });

    const patterns: string[] = [];
    let score = 0;

    // Analyze transaction frequency
    if (transactions.length > 10) {
      score += 20;
      patterns.push('High transaction frequency');
    }

    // Analyze transaction amounts
    const amounts = transactions.map(t => Number(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length || 0;
    const maxAmount = Math.max(...amounts);

    if (maxAmount > avgAmount * 5) {
      score += 15;
      patterns.push('Unusual transaction amount pattern');
    }

    // Analyze transaction timing
    const hours = transactions.map(t => new Date(t.createdAt).getHours());
    const nightTransactions = hours.filter(h => h >= 22 || h <= 5).length;
    
    if (nightTransactions > transactions.length * 0.3) {
      score += 10;
      patterns.push('High frequency of late-night transactions');
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 30) riskLevel = 'HIGH';
    else if (score >= 15) riskLevel = 'MEDIUM';

    return { riskLevel, patterns, score };
  }

  private async applyRiskMeasures(userId: string, patterns: any): Promise<void> {
    this.logger.warn(`Applying risk measures for user ${userId}: ${patterns.patterns.join(', ')}`);
    
    // Could implement various risk measures:
    // - Reduce credit limit
    // - Require additional verification
    // - Flag all future transactions for review
    // - Contact user for verification
    
    // For now, just log the action
    this.logger.log(`Risk measures applied for user ${userId}`);
  }

  private parseTimeframe(timeframe: string): number {
    switch (timeframe) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 30;
    }
  }
}