import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export interface FraudCheckRequest {
  userId: string;
  transactionAmount: number;
  merchantId: string;
  userEmail: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface FraudCheckResponse {
  riskScore: number; // 0-100, higher = more risky
  decision: 'APPROVE' | 'DECLINE' | 'REVIEW';
  riskFactors: string[];
  referenceId: string;
  recommendedAction?: string;
}

export interface DeviceInfo {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  firstSeen: Date;
  lastSeen: Date;
  transactionCount: number;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async checkForFraud(request: FraudCheckRequest): Promise<FraudCheckResponse> {
    try {
      this.logger.log(
        `Performing fraud check for user ${request.userId}, amount: $${request.transactionAmount}`,
      );

      // Run multiple fraud detection checks in parallel
      const [velocityCheck, patternCheck, deviceCheck, amountCheck] = await Promise.all([
        this.checkTransactionVelocity(request),
        this.checkSuspiciousPatterns(request),
        this.checkDeviceRisk(request),
        this.checkAmountRisk(request),
      ]);

      // Calculate composite risk score
      const riskScore = this.calculateRiskScore([
        velocityCheck,
        patternCheck,
        deviceCheck,
        amountCheck,
      ]);

      const riskFactors = this.collectRiskFactors([
        velocityCheck,
        patternCheck,
        deviceCheck,
        amountCheck,
      ]);

      const decision = this.makeDecision(riskScore, riskFactors);

      const response: FraudCheckResponse = {
        riskScore,
        decision,
        riskFactors,
        referenceId: this.generateReferenceId(),
        recommendedAction: this.getRecommendedAction(decision, riskScore),
      };

      this.logger.log(`Fraud check result for ${request.userId}: ${decision}, score: ${riskScore}`);

      return response;
    } catch (error) {
      this.logger.error(`Fraud check failed for user ${request.userId}:`, error);

      // Return conservative decision on error
      return {
        riskScore: 75,
        decision: 'REVIEW',
        riskFactors: ['System error during fraud check'],
        referenceId: this.generateReferenceId(),
        recommendedAction: 'Manual review required due to system error',
      };
    }
  }

  private async checkTransactionVelocity(request: FraudCheckRequest): Promise<{
    score: number;
    factors: string[];
  }> {
    const factors: string[] = [];
    let score = 0;

    // Check transactions in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await this.transactionRepository.count({
      where: {
        userId: request.userId,
        createdAt: { $gte: oneDayAgo } as any,
      },
    });

    if (recentTransactions > 5) {
      score += 30;
      factors.push('High transaction frequency in 24 hours');
    } else if (recentTransactions > 2) {
      score += 15;
      factors.push('Moderate transaction frequency in 24 hours');
    }

    // Check total amount in last 24 hours
    const recentTransactionSum = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.userId = :userId', { userId: request.userId })
      .andWhere('transaction.createdAt >= :date', { date: oneDayAgo })
      .getRawOne();

    const totalAmount = parseFloat(recentTransactionSum.total) || 0;
    if (totalAmount > 5000) {
      score += 25;
      factors.push('High transaction volume in 24 hours');
    } else if (totalAmount > 2000) {
      score += 10;
      factors.push('Moderate transaction volume in 24 hours');
    }

    return { score, factors };
  }

  private async checkSuspiciousPatterns(request: FraudCheckRequest): Promise<{
    score: number;
    factors: string[];
  }> {
    const factors: string[] = [];
    let score = 0;

    // Check for round number amounts (common in fraud)
    if (request.transactionAmount % 100 === 0 && request.transactionAmount >= 500) {
      score += 10;
      factors.push('Round number transaction amount');
    }

    // Check for unusual hour (late night transactions can be suspicious)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      score += 15;
      factors.push('Transaction during unusual hours');
    }

    // Check if first transaction for new user is high amount
    const userTransactionCount = await this.transactionRepository.count({
      where: { userId: request.userId },
    });

    if (userTransactionCount === 0 && request.transactionAmount > 1000) {
      score += 20;
      factors.push('High-value first transaction for new user');
    }

    return { score, factors };
  }

  private async checkDeviceRisk(request: FraudCheckRequest): Promise<{
    score: number;
    factors: string[];
  }> {
    const factors: string[] = [];
    let score = 0;

    // Check for missing device information
    if (!request.deviceFingerprint) {
      score += 15;
      factors.push('Missing device fingerprint');
    }

    if (!request.userAgent) {
      score += 10;
      factors.push('Missing user agent information');
    }

    // Check for suspicious IP patterns
    if (request.ipAddress) {
      if (this.isTorNode(request.ipAddress)) {
        score += 40;
        factors.push('Transaction from Tor network');
      }

      if (this.isVPN(request.ipAddress)) {
        score += 25;
        factors.push('Transaction from VPN/Proxy');
      }
    }

    return { score, factors };
  }

  private async checkAmountRisk(request: FraudCheckRequest): Promise<{
    score: number;
    factors: string[];
  }> {
    const factors: string[] = [];
    let score = 0;

    // Get user's historical average transaction amount
    const avgAmountResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('AVG(transaction.amount)', 'average')
      .where('transaction.userId = :userId', { userId: request.userId })
      .getRawOne();

    const avgAmount = parseFloat(avgAmountResult.average) || 0;

    if (avgAmount > 0) {
      const deviationRatio = request.transactionAmount / avgAmount;

      if (deviationRatio > 5) {
        score += 30;
        factors.push('Transaction amount significantly higher than user average');
      } else if (deviationRatio > 3) {
        score += 15;
        factors.push('Transaction amount moderately higher than user average');
      }
    }

    // Check absolute amount thresholds
    if (request.transactionAmount > 10000) {
      score += 25;
      factors.push('Very high transaction amount');
    } else if (request.transactionAmount > 5000) {
      score += 15;
      factors.push('High transaction amount');
    }

    return { score, factors };
  }

  private calculateRiskScore(checks: Array<{ score: number; factors: string[] }>): number {
    // Weight different checks
    const weights = [0.3, 0.25, 0.25, 0.2]; // velocity, patterns, device, amount

    let weightedScore = 0;
    checks.forEach((check, index) => {
      weightedScore += check.score * weights[index];
    });

    return Math.min(Math.round(weightedScore), 100);
  }

  private collectRiskFactors(checks: Array<{ score: number; factors: string[] }>): string[] {
    const allFactors: string[] = [];
    checks.forEach((check) => {
      allFactors.push(...check.factors);
    });
    return allFactors;
  }

  private makeDecision(riskScore: number, riskFactors: string[]): 'APPROVE' | 'DECLINE' | 'REVIEW' {
    if (riskScore >= 70) {
      return 'DECLINE';
    } else if (riskScore >= 40) {
      return 'REVIEW';
    } else {
      return 'APPROVE';
    }
  }

  private getRecommendedAction(decision: string, riskScore: number): string {
    switch (decision) {
      case 'APPROVE':
        return 'Transaction approved for processing';
      case 'DECLINE':
        return 'Transaction blocked due to high fraud risk';
      case 'REVIEW':
        return riskScore >= 60
          ? 'Escalate to senior fraud analyst for review'
          : 'Standard manual review required';
      default:
        return 'No action specified';
    }
  }

  private isTorNode(ipAddress: string): boolean {
    // In production, check against Tor exit node list
    // This is a mock implementation
    const knownTorNodes = ['127.0.0.1', '192.168.1.1']; // Mock IPs
    return knownTorNodes.includes(ipAddress);
  }

  private isVPN(ipAddress: string): boolean {
    // In production, check against VPN/proxy detection service
    // This is a mock implementation
    return ipAddress.startsWith('10.') || ipAddress.startsWith('172.16.');
  }

  private generateReferenceId(): string {
    return `FD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  async logFraudAttempt(userId: string, details: any): Promise<void> {
    this.logger.warn(`Fraud attempt detected for user ${userId}:`, details);

    // In production, store fraud attempts in a dedicated table
    // and potentially trigger additional security measures
  }

  async getDeviceHistory(deviceFingerprint: string): Promise<DeviceInfo | null> {
    // In production, implement device tracking
    // For now, return mock data
    return {
      fingerprint: deviceFingerprint,
      ipAddress: '192.168.1.1',
      userAgent: 'Mock User Agent',
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastSeen: new Date(),
      transactionCount: 5,
    };
  }
}
