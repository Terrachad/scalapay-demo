import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/entities/user.entity';

export interface CreditCheckRequest {
  userId: string;
  requestedAmount: number;
  email: string;
  name: string;
  dateOfBirth?: string;
  annualIncome?: number;
}

export interface CreditCheckResponse {
  approved: boolean;
  creditScore?: number;
  approvedAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason?: string;
  referenceId: string;
}

export interface CreditBureauResponse {
  score: number;
  reportId: string;
  factors: string[];
  lastUpdated: string;
}

@Injectable()
export class CreditCheckService {
  private readonly logger = new Logger(CreditCheckService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async performCreditCheck(request: CreditCheckRequest): Promise<CreditCheckResponse> {
    try {
      this.logger.log(
        `Performing credit check for user ${request.userId}, amount: $${request.requestedAmount}`,
      );

      // For demo purposes, we'll use a mock credit check
      // In production, integrate with real credit bureau APIs like Experian, Equifax, etc.
      const mockResponse = await this.mockCreditCheck(request);

      // Log the decision for audit purposes
      this.logger.log(
        `Credit check result for ${request.userId}: ${mockResponse.approved ? 'APPROVED' : 'DENIED'}, score: ${mockResponse.creditScore}`,
      );

      return mockResponse;
    } catch (error) {
      this.logger.error(`Credit check failed for user ${request.userId}:`, error);

      // Return conservative decision on error
      return {
        approved: false,
        approvedAmount: 0,
        riskLevel: 'HIGH',
        reason: 'Credit check service unavailable',
        referenceId: this.generateReferenceId(),
      };
    }
  }

  async getBureauReport(user: User): Promise<CreditBureauResponse | null> {
    try {
      // Integration with credit bureau API
      // This is a mock implementation
      return await this.mockBureauReport(user);
    } catch (error) {
      this.logger.error(`Failed to get bureau report for user ${user.id}:`, error);
      return null;
    }
  }

  async updateCreditLimit(userId: string, newLimit: number): Promise<boolean> {
    try {
      // In production, this would update the user's credit limit based on
      // periodic credit checks and payment history
      this.logger.log(`Updating credit limit for user ${userId} to $${newLimit}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update credit limit for user ${userId}:`, error);
      return false;
    }
  }

  private async mockCreditCheck(request: CreditCheckRequest): Promise<CreditCheckResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock credit scoring algorithm
    const baseScore = 650 + Math.floor(Math.random() * 200); // 650-850
    const emailDomain = request.email.split('@')[1];

    // Business rules for approval
    const maxAmount = this.calculateMaxAmount(baseScore);
    const requestedAmount = request.requestedAmount;

    // Risk assessment
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (baseScore >= 750) riskLevel = 'LOW';
    if (baseScore < 600) riskLevel = 'HIGH';

    // Approval logic
    const approved = baseScore >= 580 && requestedAmount <= maxAmount;
    const approvedAmount = approved ? requestedAmount : Math.min(requestedAmount, maxAmount * 0.5);

    return {
      approved,
      creditScore: baseScore,
      approvedAmount,
      riskLevel,
      reason: !approved ? this.getDeclineReason(baseScore, requestedAmount, maxAmount) : undefined,
      referenceId: this.generateReferenceId(),
    };
  }

  private async mockBureauReport(user: User): Promise<CreditBureauResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      score: 680 + Math.floor(Math.random() * 120),
      reportId: this.generateReferenceId(),
      factors: [
        'Payment history',
        'Credit utilization',
        'Length of credit history',
        'Types of credit',
        'New credit inquiries',
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateMaxAmount(creditScore: number): number {
    // Credit limit based on score
    if (creditScore >= 800) return 10000;
    if (creditScore >= 750) return 7500;
    if (creditScore >= 700) return 5000;
    if (creditScore >= 650) return 3000;
    if (creditScore >= 600) return 1500;
    return 500;
  }

  private getDeclineReason(score: number, requested: number, maxAllowed: number): string {
    if (score < 580) {
      return 'Credit score below minimum requirement';
    }
    if (requested > maxAllowed) {
      return `Requested amount exceeds maximum approved limit of $${maxAllowed}`;
    }
    return 'Application does not meet current approval criteria';
  }

  private generateReferenceId(): string {
    return `CC${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  // Real-world integration methods (commented for reference)
  /*
  private async callExperianAPI(request: CreditCheckRequest): Promise<CreditCheckResponse> {
    const apiKey = this.configService.get('integrations.experian.apiKey');
    const endpoint = this.configService.get('integrations.experian.endpoint');
    
    if (!apiKey || !endpoint) {
      throw new Error('Experian API configuration is missing');
    }
    
    const response = await firstValueFrom(
      this.httpService.post(`${endpoint}/credit-check`, {
        consumer: {
          name: request.name,
          email: request.email,
          dateOfBirth: request.dateOfBirth,
        },
        requestedAmount: request.requestedAmount,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }),
    );
    
    return this.mapExperianResponse(response.data);
  }

  private async callEquifaxAPI(request: CreditCheckRequest): Promise<CreditCheckResponse> {
    const apiKey = this.configService.get('integrations.equifax.apiKey');
    const endpoint = this.configService.get('integrations.equifax.endpoint');
    
    if (!apiKey || !endpoint) {
      throw new Error('Equifax API configuration is missing');
    }
    
    // Implementation for Equifax API
    // ...
  }
  */
}
