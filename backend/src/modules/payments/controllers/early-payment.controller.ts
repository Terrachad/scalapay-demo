import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EarlyPaymentService } from '../services/early-payment.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { EarlyPaymentConfig } from '../entities/early-payment-config.entity';
import { User } from '../../users/entities/user.entity';

// DTOs for request/response
export interface ProcessFullEarlyPaymentDto {
  transactionId: string;
  paymentMethodId?: string;
  confirmPayment?: boolean;
}

export interface ProcessPartialEarlyPaymentDto {
  transactionId: string;
  paymentIds: string[];
  paymentMethodId?: string;
  confirmPayment?: boolean;
}

export interface ConfirmEarlyPaymentDto {
  paymentIntentId: string;
}

export interface CreateEarlyPaymentConfigDto {
  merchantId: string;
  enabled: boolean;
  allowPartialPayments?: boolean;
  minimumEarlyPaymentAmount?: number;
  maximumEarlyPaymentAmount?: number;
  requireMerchantApproval?: boolean;
  discountTiers: {
    timeRange: string; // '0-7days', '8-14days', '15-30days', '31+days'
    discountRate: number; // 0.01 = 1%, 0.025 = 2.5%
    minimumAmount: number; // Minimum amount for this discount tier
    maximumDiscount: number; // Maximum discount amount (cap)
    description: string; // Human-readable description
  }[];
  eligibilityRules?: {
    minTransactionAmount?: number;
    maxTransactionAmount?: number;
    allowedUserTiers?: string[];
    allowedPaymentMethods?: string[];
    excludedMerchantCategories?: string[];
    requiresGoodStanding?: boolean;
    maxEarlyPaymentsPerMonth?: number;
  };
}

export interface UpdateEarlyPaymentConfigDto {
  enabled?: boolean;
  allowPartialPayments?: boolean;
  minimumEarlyPaymentAmount?: number;
  maximumEarlyPaymentAmount?: number;
  requireMerchantApproval?: boolean;
  discountTiers?: {
    timeRange: string; // '0-7days', '8-14days', '15-30days', '31+days'
    discountRate: number; // 0.01 = 1%, 0.025 = 2.5%
    minimumAmount: number; // Minimum amount for this discount tier
    maximumDiscount: number; // Maximum discount amount (cap)
    description: string; // Human-readable description
  }[];
  eligibilityRules?: {
    minTransactionAmount?: number;
    maxTransactionAmount?: number;
    allowedUserTiers?: string[];
    allowedPaymentMethods?: string[];
    excludedMerchantCategories?: string[];
    requiresGoodStanding?: boolean;
    maxEarlyPaymentsPerMonth?: number;
  };
}

export interface EarlyPaymentStatsQuery {
  merchantId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

@ApiTags('early-payments')
@Controller('early-payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EarlyPaymentController {
  private readonly logger = new Logger(EarlyPaymentController.name);

  constructor(
    private readonly earlyPaymentService: EarlyPaymentService,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(EarlyPaymentConfig)
    private earlyPaymentConfigRepository: Repository<EarlyPaymentConfig>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Get early payment options for a transaction
  @Get('options/:transactionId')
  @ApiOperation({ summary: 'Get early payment options for a transaction' })
  @ApiResponse({ status: 200, description: 'Early payment options retrieved successfully' })
  async getEarlyPaymentOptions(@Request() req: any, @Param('transactionId') transactionId: string) {
    const userId = req.user.userId || req.user.id;

    // Verify transaction belongs to user
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const options = await this.earlyPaymentService.getEarlyPaymentOptions(transactionId, userId);

    this.logger.log(
      `Early payment options requested for transaction ${transactionId} by user ${userId}`,
    );

    return {
      message: 'Early payment options retrieved successfully',
      transactionId,
      options,
    };
  }

  // Calculate potential savings for a transaction
  @Get('savings/:transactionId')
  @ApiOperation({ summary: 'Calculate potential savings for early payment' })
  @ApiResponse({ status: 200, description: 'Savings calculation completed' })
  async calculateEarlyPaymentSavings(
    @Request() req: any,
    @Param('transactionId') transactionId: string,
  ) {
    const userId = req.user.userId || req.user.id;

    // Verify transaction belongs to user
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const savings = await this.earlyPaymentService.calculateEarlyPaymentSavings(
      transactionId,
      userId,
    );

    return {
      message: 'Savings calculation completed',
      transactionId,
      savings,
    };
  }

  // Process full early payment (all remaining installments)
  @Post('process/full')
  @ApiOperation({ summary: 'Process full early payment for all remaining installments' })
  @ApiResponse({ status: 201, description: 'Full early payment processed successfully' })
  async processFullEarlyPayment(
    @Request() req: any,
    @Body() processDto: ProcessFullEarlyPaymentDto,
  ) {
    const userId = req.user.userId || req.user.id;

    // Verify transaction belongs to user
    const transaction = await this.transactionRepository.findOne({
      where: { id: processDto.transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const result = await this.earlyPaymentService.processFullEarlyPayment(
      processDto.transactionId,
      userId,
      processDto.paymentMethodId,
    );

    this.logger.log(
      `Full early payment processed for transaction ${processDto.transactionId} by user ${userId}`,
    );

    return {
      message: 'Full early payment processed successfully',
      result,
    };
  }

  // Process partial early payment (specific installments)
  @Post('process/partial')
  @ApiOperation({ summary: 'Process partial early payment for specific installments' })
  @ApiResponse({ status: 201, description: 'Partial early payment processed successfully' })
  async processPartialEarlyPayment(
    @Request() req: any,
    @Body() processDto: ProcessPartialEarlyPaymentDto,
  ) {
    const userId = req.user.userId || req.user.id;

    // Verify transaction belongs to user
    const transaction = await this.transactionRepository.findOne({
      where: { id: processDto.transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!processDto.paymentIds || processDto.paymentIds.length === 0) {
      throw new BadRequestException('At least one payment ID must be specified');
    }

    const result = await this.earlyPaymentService.processPartialEarlyPayment(
      processDto.transactionId,
      processDto.paymentIds,
      userId,
      processDto.paymentMethodId,
    );

    this.logger.log(
      `Partial early payment processed for transaction ${processDto.transactionId} by user ${userId}: ${processDto.paymentIds.length} payments`,
    );

    return {
      message: 'Partial early payment processed successfully',
      result,
    };
  }

  // Confirm early payment after Stripe processing
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm early payment after successful Stripe processing' })
  @ApiResponse({ status: 200, description: 'Early payment confirmed successfully' })
  async confirmEarlyPayment(@Request() req: any, @Body() confirmDto: ConfirmEarlyPaymentDto) {
    const result = await this.earlyPaymentService.confirmEarlyPayment(confirmDto.paymentIntentId);

    this.logger.log(`Early payment confirmed: ${confirmDto.paymentIntentId}`);

    return {
      message: 'Early payment confirmed successfully',
      result,
    };
  }

  // Get user's early payment history
  @Get('history')
  @ApiOperation({ summary: 'Get user early payment history' })
  @ApiResponse({ status: 200, description: 'Early payment history retrieved successfully' })
  async getEarlyPaymentHistory(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const userId = req.user.userId || req.user.id;

    // This would typically query a separate early_payments table
    // For now, we'll get transactions with early payments
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.payments', 'p')
      .where('t.userId = :userId', { userId })
      .andWhere('p.paymentDate IS NOT NULL')
      .andWhere('p.paymentDate < p.dueDate') // Early payments
      .orderBy(`t.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    const earlyPayments = transactions.map((transaction) => ({
      transactionId: transaction.id,
      transactionAmount: transaction.amount,
      earlyPayments: transaction.payments
        .filter((p) => p.paymentDate && p.paymentDate < p.dueDate)
        .map((payment) => ({
          paymentId: payment.id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
          daysEarly: Math.ceil(
            (payment.dueDate.getTime() - payment.paymentDate!.getTime()) / (1000 * 60 * 60 * 24),
          ),
          // Savings would be calculated based on payment metadata
          savings: 0, // Placeholder
        })),
      totalSavings: 0, // Placeholder - would calculate from payment metadata
      createdAt: transaction.createdAt,
    }));

    return {
      message: 'Early payment history retrieved successfully',
      history: earlyPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin/Merchant endpoints for early payment configuration
  @Post('config')
  @ApiOperation({ summary: 'Create early payment configuration for merchant' })
  @ApiResponse({ status: 201, description: 'Early payment configuration created successfully' })
  async createEarlyPaymentConfig(
    @Request() req: any,
    @Body() configDto: CreateEarlyPaymentConfigDto,
  ) {
    // TODO: Add merchant role check
    const config = await this.earlyPaymentService.createMerchantEarlyPaymentConfig(
      configDto.merchantId,
      configDto,
    );

    this.logger.log(`Early payment configuration created for merchant ${configDto.merchantId}`);

    return {
      message: 'Early payment configuration created successfully',
      config,
    };
  }

  @Get('config/:merchantId')
  @ApiOperation({ summary: 'Get early payment configuration for merchant' })
  @ApiResponse({ status: 200, description: 'Early payment configuration retrieved successfully' })
  async getEarlyPaymentConfig(@Request() req: any, @Param('merchantId') merchantId: string) {
    const config = await this.earlyPaymentService.getMerchantEarlyPaymentConfig(merchantId);

    if (!config) {
      throw new NotFoundException('Early payment configuration not found for this merchant');
    }

    return {
      message: 'Early payment configuration retrieved successfully',
      config,
    };
  }

  @Put('config/:merchantId')
  @ApiOperation({ summary: 'Update early payment configuration for merchant' })
  @ApiResponse({ status: 200, description: 'Early payment configuration updated successfully' })
  async updateEarlyPaymentConfig(
    @Request() req: any,
    @Param('merchantId') merchantId: string,
    @Body() updateDto: UpdateEarlyPaymentConfigDto,
  ) {
    const config = await this.earlyPaymentService.updateMerchantEarlyPaymentConfig(
      merchantId,
      updateDto,
    );

    this.logger.log(`Early payment configuration updated for merchant ${merchantId}`);

    return {
      message: 'Early payment configuration updated successfully',
      config,
    };
  }

  @Post('config/:merchantId/enable')
  @ApiOperation({ summary: 'Enable early payment for merchant' })
  @ApiResponse({ status: 200, description: 'Early payment enabled successfully' })
  async enableEarlyPaymentForMerchant(
    @Request() req: any,
    @Param('merchantId') merchantId: string,
  ) {
    await this.earlyPaymentService.enableEarlyPaymentForMerchant(merchantId);

    this.logger.log(`Early payment enabled for merchant ${merchantId}`);

    return {
      message: 'Early payment enabled successfully',
      merchantId,
    };
  }

  @Post('config/:merchantId/disable')
  @ApiOperation({ summary: 'Disable early payment for merchant' })
  @ApiResponse({ status: 200, description: 'Early payment disabled successfully' })
  async disableEarlyPaymentForMerchant(
    @Request() req: any,
    @Param('merchantId') merchantId: string,
  ) {
    await this.earlyPaymentService.disableEarlyPaymentForMerchant(merchantId);

    this.logger.log(`Early payment disabled for merchant ${merchantId}`);

    return {
      message: 'Early payment disabled successfully',
      merchantId,
    };
  }

  // Analytics and reporting endpoints
  @Get('analytics/statistics')
  @ApiOperation({ summary: 'Get early payment statistics' })
  @ApiResponse({ status: 200, description: 'Early payment statistics retrieved successfully' })
  async getEarlyPaymentStatistics(@Request() req: any, @Query() query: EarlyPaymentStatsQuery) {
    const statistics = await this.earlyPaymentService.getEarlyPaymentStatistics(query.merchantId);

    return {
      message: 'Early payment statistics retrieved successfully',
      statistics,
      filters: query,
    };
  }

  @Get('analytics/trends')
  @ApiOperation({ summary: 'Get early payment trends and analytics' })
  @ApiResponse({ status: 200, description: 'Early payment trends retrieved successfully' })
  async getEarlyPaymentTrends(@Request() req: any, @Query() query: EarlyPaymentStatsQuery) {
    // This would typically involve more complex analytics queries
    // For now, return basic trend data
    const baseStatistics = await this.earlyPaymentService.getEarlyPaymentStatistics(
      query.merchantId,
    );

    const trends = {
      ...baseStatistics,
      trends: {
        monthlyGrowth: 0, // Placeholder
        avgSavingsPerUser: 0, // Placeholder
        adoptionRate: 0, // Placeholder
        popularTimeRanges: baseStatistics.popularTimeRanges,
      },
      timeRange: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
    };

    return {
      message: 'Early payment trends retrieved successfully',
      trends,
    };
  }

  @Get('analytics/merchant/:merchantId/summary')
  @ApiOperation({ summary: 'Get merchant-specific early payment summary' })
  @ApiResponse({
    status: 200,
    description: 'Merchant early payment summary retrieved successfully',
  })
  async getMerchantEarlyPaymentSummary(
    @Request() req: any,
    @Param('merchantId') merchantId: string,
    @Query('period') period: string = '30days',
  ) {
    const config = await this.earlyPaymentService.getMerchantEarlyPaymentConfig(merchantId);

    if (!config) {
      throw new NotFoundException('Merchant early payment configuration not found');
    }

    const statistics = await this.earlyPaymentService.getEarlyPaymentStatistics(merchantId);

    // Calculate period-specific metrics
    const periodMetrics = {
      totalEarlyPayments: statistics.totalEarlyPayments,
      totalSavingsProvided: statistics.totalSavingsProvided,
      averageDiscountRate: statistics.averageDiscountRate,
      adoptionRate: statistics.adoptionRate,
      // Additional merchant-specific metrics
      configStatus: config.enabled ? 'enabled' : 'disabled',
      discountTiers: config.discountTiers?.length || 0,
      allowsPartialPayments: config.allowPartialPayments,
      lastConfigUpdate: config.updatedAt,
    };

    return {
      message: 'Merchant early payment summary retrieved successfully',
      merchantId,
      period,
      summary: periodMetrics,
      configuration: {
        enabled: config.enabled,
        allowPartialPayments: config.allowPartialPayments,
        discountTiersCount: config.discountTiers?.length || 0,
        minimumAmount: config.minimumEarlyPaymentAmount,
        maximumAmount: config.maximumEarlyPaymentAmount,
      },
    };
  }

  // User benefits and insights
  @Get('insights')
  @ApiOperation({ summary: 'Get personalized early payment insights for user' })
  @ApiResponse({ status: 200, description: 'Early payment insights retrieved successfully' })
  async getEarlyPaymentInsights(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    // Get user's transaction history to calculate insights
    const userTransactions = await this.transactionRepository.find({
      where: { userId },
      relations: ['payments'],
      order: { createdAt: 'DESC' },
      take: 50, // Last 50 transactions
    });

    const eligibleTransactions = userTransactions.filter((t) =>
      t.payments.some((p) => p.status === 'scheduled'),
    );

    const potentialSavings = await Promise.all(
      eligibleTransactions.slice(0, 5).map(async (transaction) => {
        try {
          const savings = await this.earlyPaymentService.calculateEarlyPaymentSavings(
            transaction.id,
            userId,
          );
          return {
            transactionId: transaction.id,
            amount: transaction.amount,
            ...savings,
          };
        } catch (error) {
          return null;
        }
      }),
    );

    const validSavings = potentialSavings.filter(Boolean);
    const totalPotentialSavings = validSavings.reduce(
      (sum, saving) => sum + saving!.totalPossibleSavings,
      0,
    );

    const insights = {
      eligibleTransactions: eligibleTransactions.length,
      totalPotentialSavings,
      averageSavingsPerTransaction:
        validSavings.length > 0 ? totalPotentialSavings / validSavings.length : 0,
      recommendations: [] as Array<{
        type: string;
        message: string;
        action: string;
      }>,
      upcomingOpportunities: validSavings.slice(0, 3).map((saving) => ({
        transactionId: saving!.transactionId,
        potentialSavings: saving!.totalPossibleSavings,
        timeframe: '30 days', // Based on payment schedule
      })),
    };

    // Generate recommendations
    if (totalPotentialSavings > 50) {
      insights.recommendations.push({
        type: 'high_savings_opportunity',
        message: `You could save $${totalPotentialSavings.toFixed(2)} by paying early on your current installments`,
        action: 'Consider making early payments',
      });
    }

    if (eligibleTransactions.length > 3) {
      insights.recommendations.push({
        type: 'multiple_opportunities',
        message: `You have ${eligibleTransactions.length} transactions eligible for early payment discounts`,
        action: 'Review your payment schedule',
      });
    }

    return {
      message: 'Early payment insights retrieved successfully',
      insights,
    };
  }

  // Health check for early payment system
  @Get('health')
  @ApiOperation({ summary: 'Check early payment system health' })
  @ApiResponse({ status: 200, description: 'Early payment system health check' })
  async getEarlyPaymentSystemHealth(@Request() req: any) {
    const configCount = await this.earlyPaymentConfigRepository.count();
    const enabledConfigCount = await this.earlyPaymentConfigRepository.count({
      where: { enabled: true },
    });

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      metrics: {
        totalMerchantConfigs: configCount,
        enabledMerchantConfigs: enabledConfigCount,
        systemAvailability: 100, // Placeholder
        avgResponseTime: 150, // Placeholder
      },
      features: {
        fullEarlyPayment: true,
        partialEarlyPayment: true,
        merchantConfiguration: true,
        analytics: true,
        userInsights: true,
      },
    };

    return {
      message: 'Early payment system health check completed',
      health,
    };
  }
}
