import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethodService } from '../services/payment-method.service';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
} from '../entities/payment-method.entity';
import { User } from '../../users/entities/user.entity';
import { CardAutoUpdateService } from '../services/card-auto-update.service';
import { StripeService } from '../services/stripe.service';
import { NotificationService } from '../../shared/services/notification.service';

// DTOs for request/response
export interface CreatePaymentMethodDto {
  type: PaymentMethodType;
  stripePaymentMethodId?: string;
  isDefault?: boolean;
  setupIntentId?: string;
  makeDefault?: boolean;
  cardDetails?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
    country: string;
  };
  billingDetails?: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  usageRestrictions?: {
    maxDailyAmount?: number;
    maxMonthlyAmount?: number;
    allowedMerchants?: string[];
    blockedMerchants?: string[];
    allowInternational?: boolean;
    requiresMFAForHighValue?: boolean;
    highValueThreshold?: number;
  };
}

export interface UpdatePaymentMethodDto {
  isDefault?: boolean;
  isActive?: boolean;
  cardPosition?: number;
  usageRestrictions?: {
    maxDailyAmount?: number;
    maxMonthlyAmount?: number;
    allowedMerchants?: string[];
    blockedMerchants?: string[];
    allowInternational?: boolean;
    requiresMFAForHighValue?: boolean;
    highValueThreshold?: number;
  };
  complianceData?: {
    pciCompliant?: boolean;
    lastComplianceCheck?: Date;
    complianceNotes?: string;
  };
}

export interface PaymentMethodSearchDto {
  type?: PaymentMethodType;
  status?: PaymentMethodStatus;
  isDefault?: boolean;
  isExpiring?: boolean;
  hasAutoUpdate?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'cardPosition' | 'expiresAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface BulkUpdateDto {
  paymentMethodIds: string[];
  updates: {
    isActive?: boolean;
    cardPosition?: number;
    enableAutoUpdate?: boolean;
  };
}

export interface CardVerificationDto {
  paymentMethodId: string;
  verificationMethod: 'micro_deposit' | 'instant' | 'manual';
  verificationData?: any;
}

@ApiTags('payment-methods')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentMethodController {
  private readonly logger = new Logger(PaymentMethodController.name);

  constructor(
    private readonly paymentMethodService: PaymentMethodService,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cardAutoUpdateService: CardAutoUpdateService,
    private stripeService: StripeService,
    private notificationService: NotificationService,
  ) {}

  // Original endpoints enhanced
  @Post('setup-intent')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create setup intent for storing payment method' })
  @ApiResponse({ status: 201, description: 'Setup intent created successfully' })
  async createSetupIntent(@Request() req: any) {
    return this.paymentMethodService.createSetupIntent(req.user.userId);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Store payment method after setup intent confirmation' })
  @ApiResponse({ status: 201, description: 'Payment method stored successfully' })
  async storePaymentMethod(@Body() body: CreatePaymentMethodDto, @Request() req: any) {
    const userId = req.user.userId || req.user.id;

    // Support legacy format
    if (body.setupIntentId) {
      return this.paymentMethodService.storePaymentMethod(
        userId,
        body.setupIntentId,
        body.makeDefault,
      );
    }

    // Enhanced creation logic
    return this.createPaymentMethod(req, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get user payment methods with enhanced filtering' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getUserPaymentMethods(@Request() req: any, @Query() searchDto: PaymentMethodSearchDto) {
    const userId = req.user.userId || req.user.id;

    if (!searchDto || Object.keys(searchDto).length === 0) {
      // Legacy endpoint compatibility
      return this.paymentMethodService.getUserPaymentMethods(userId);
    }

    // Enhanced filtering
    return this.getPaymentMethods(req, searchDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  async deletePaymentMethod(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.paymentMethodService.deletePaymentMethod(id, userId);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set payment method as default' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setAsDefault(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.paymentMethodService.setAsDefault(id, userId);
  }

  // Enhanced endpoints
  @Get('enhanced')
  async getPaymentMethods(@Request() req: any, @Query() searchDto: PaymentMethodSearchDto) {
    const userId = req.user.userId || req.user.id;
    const {
      page = 1,
      limit = 10,
      sortBy = 'cardPosition',
      sortOrder = 'ASC',
      ...filters
    } = searchDto;

    const queryBuilder = this.paymentMethodRepository
      .createQueryBuilder('pm')
      .where('pm.userId = :userId', { userId })
      .orderBy(`pm.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    // Apply filters
    if (filters.type) {
      queryBuilder.andWhere('pm.type = :type', { type: filters.type });
    }
    if (filters.status) {
      queryBuilder.andWhere('pm.status = :status', { status: filters.status });
    }
    if (filters.isDefault !== undefined) {
      queryBuilder.andWhere('pm.isDefault = :isDefault', { isDefault: filters.isDefault });
    }
    if (filters.isExpiring) {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      queryBuilder.andWhere('pm.expiresAt <= :expirationDate', {
        expirationDate: thirtyDaysFromNow,
      });
    }
    if (filters.hasAutoUpdate !== undefined) {
      queryBuilder.andWhere(
        'JSON_EXTRACT(pm.autoUpdateData, "$.autoUpdateEnabled") = :hasAutoUpdate',
        {
          hasAutoUpdate: filters.hasAutoUpdate,
        },
      );
    }

    const [paymentMethods, total] = await queryBuilder.getManyAndCount();

    return {
      paymentMethods: paymentMethods.map((pm) => ({
        ...pm,
        isExpiringSoon: pm.expiresAt
          ? pm.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : false,
        usageStatus: pm.getUsageStatus(),
        securityLevel: pm.getSecurityLevel(),
        lastUpdated: pm.autoUpdateData?.lastUpdateCheck,
        nextUpdateCheck: pm.autoUpdateData?.nextUpdateCheck,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCards: total,
        activeCards: paymentMethods.filter((pm) => pm.status === PaymentMethodStatus.ACTIVE).length,
        expiringCards: paymentMethods.filter(
          (pm) => pm.expiresAt && pm.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ).length,
        cardsWithAutoUpdate: paymentMethods.filter((pm) => pm.autoUpdateData?.autoUpdateEnabled)
          .length,
      },
    };
  }

  @Get(':id/details')
  async getPaymentMethod(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user.id;

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    let stripeDetails = null;
    if (paymentMethod.stripePaymentMethodId) {
      try {
        stripeDetails = await this.stripeService.retrievePaymentMethod(
          paymentMethod.stripePaymentMethodId,
        );
      } catch (error) {
        this.logger.warn(`Failed to retrieve Stripe details for payment method ${id}:`, error);
      }
    }

    return {
      ...paymentMethod,
      stripeDetails,
      usageStatus: paymentMethod.getUsageStatus(),
      securityLevel: paymentMethod.getSecurityLevel(),
      isExpiringSoon: paymentMethod.expiresAt
        ? paymentMethod.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : false,
      complianceStatus: paymentMethod.getComplianceStatus(),
    };
  }

  async createPaymentMethod(@Request() req: any, @Body() createDto: CreatePaymentMethodDto) {
    const userId = req.user.userId || req.user.id;

    const existingCount = await this.paymentMethodRepository.count({
      where: { userId, status: PaymentMethodStatus.ACTIVE },
    });

    if (existingCount >= 10) {
      throw new BadRequestException('Maximum of 10 payment methods allowed per user');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const maxPosition = await this.paymentMethodRepository
      .createQueryBuilder('pm')
      .where('pm.userId = :userId', { userId })
      .select('MAX(pm.cardPosition)', 'maxPosition')
      .getRawOne();

    const nextPosition = (maxPosition.maxPosition || 0) + 1;

    const paymentMethod = this.paymentMethodRepository.create({
      userId,
      type: createDto.type,
      stripePaymentMethodId: createDto.stripePaymentMethodId,
      stripeCustomerId: user.stripeCustomerId || '',
      isDefault: createDto.isDefault || false,
      cardDetails: createDto.cardDetails,
      cardPosition: nextPosition,
      status: PaymentMethodStatus.ACTIVE,
      usageRestrictions: createDto.usageRestrictions,
    });

    if (createDto.type === PaymentMethodType.CARD) {
      paymentMethod.scheduleAutoUpdate();

      if (createDto.cardDetails?.exp_month && createDto.cardDetails?.exp_year) {
        paymentMethod.expiresAt = new Date(
          createDto.cardDetails.exp_year,
          createDto.cardDetails.exp_month - 1,
          1,
        );
      }
    }

    if (createDto.isDefault) {
      await this.paymentMethodRepository.update({ userId, isDefault: true }, { isDefault: false });
    }

    const savedPaymentMethod = await this.paymentMethodRepository.save(paymentMethod);

    try {
      await this.notificationService.sendPaymentMethodAdded(user, savedPaymentMethod);
    } catch (error) {
      this.logger.error('Failed to send payment method added notification:', error);
    }

    this.logger.log(`Payment method created for user ${userId}: ${savedPaymentMethod.id}`);

    return {
      message: 'Payment method created successfully',
      paymentMethod: {
        ...savedPaymentMethod,
        usageStatus: savedPaymentMethod.getUsageStatus(),
        securityLevel: savedPaymentMethod.getSecurityLevel(),
      },
    };
  }

  @Put(':id')
  async updatePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
  ) {
    const userId = req.user.userId || req.user.id;

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (updateDto.cardPosition !== undefined) {
      await this.reorderSinglePaymentMethod(userId, id, updateDto.cardPosition);
    }

    if (updateDto.isDefault === true) {
      await this.paymentMethodRepository.update({ userId, isDefault: true }, { isDefault: false });
    }

    Object.assign(paymentMethod, updateDto);
    const updatedPaymentMethod = await this.paymentMethodRepository.save(paymentMethod);

    return {
      message: 'Payment method updated successfully',
      paymentMethod: {
        ...updatedPaymentMethod,
        usageStatus: updatedPaymentMethod.getUsageStatus(),
        securityLevel: updatedPaymentMethod.getSecurityLevel(),
      },
    };
  }

  @Put('reorder')
  async reorderPaymentMethods(@Request() req: any, @Body() body: { paymentMethodIds: string[] }) {
    const userId = req.user.userId || req.user.id;
    const { paymentMethodIds } = body;

    const paymentMethods = await this.paymentMethodRepository.find({
      where: { userId, status: PaymentMethodStatus.ACTIVE },
    });

    const userPaymentMethodIds = paymentMethods.map((pm) => pm.id);
    const invalidIds = paymentMethodIds.filter((id) => !userPaymentMethodIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException('Some payment methods do not belong to the user');
    }

    for (let i = 0; i < paymentMethodIds.length; i++) {
      await this.paymentMethodRepository.update(
        { id: paymentMethodIds[i] },
        { cardPosition: i + 1 },
      );
    }

    return { message: 'Payment methods reordered successfully' };
  }

  @Put('bulk')
  async bulkUpdatePaymentMethods(@Request() req: any, @Body() bulkUpdateDto: BulkUpdateDto) {
    const userId = req.user.userId || req.user.id;
    const { paymentMethodIds, updates } = bulkUpdateDto;

    const paymentMethods = await this.paymentMethodRepository.find({
      where: { id: In(paymentMethodIds), userId },
    });

    if (paymentMethods.length !== paymentMethodIds.length) {
      throw new BadRequestException('Some payment methods do not belong to the user');
    }

    const results = [];

    for (const paymentMethod of paymentMethods) {
      try {
        Object.assign(paymentMethod, updates);

        if (updates.enableAutoUpdate !== undefined) {
          if (updates.enableAutoUpdate) {
            await this.cardAutoUpdateService.enableAutoUpdate(paymentMethod.id);
          } else {
            await this.cardAutoUpdateService.disableAutoUpdate(paymentMethod.id);
          }
        }

        await this.paymentMethodRepository.save(paymentMethod);
        results.push({ id: paymentMethod.id, success: true });
      } catch (error) {
        results.push({
          id: paymentMethod.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: 'Bulk update completed',
      results,
      summary: {
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }

  @Post(':id/auto-update/enable')
  async enableAutoUpdate(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user.id;

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.type !== PaymentMethodType.CARD) {
      throw new BadRequestException('Auto-update is only available for cards');
    }

    await this.cardAutoUpdateService.enableAutoUpdate(id);
    return { message: 'Auto-update enabled successfully' };
  }

  @Post(':id/auto-update/disable')
  async disableAutoUpdate(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user.id;

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.cardAutoUpdateService.disableAutoUpdate(id);
    return { message: 'Auto-update disabled successfully' };
  }

  @Post(':id/auto-update/check')
  async forceUpdateCheck(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user.id;

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.type !== PaymentMethodType.CARD) {
      throw new BadRequestException('Update check is only available for cards');
    }

    const result = await this.cardAutoUpdateService.forceUpdateCheck(id);

    return {
      message: 'Update check completed',
      result,
    };
  }

  @Get('analytics/summary')
  async getPaymentMethodAnalytics(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const paymentMethods = await this.paymentMethodRepository.find({
      where: { userId },
    });

    const analytics = {
      totalPaymentMethods: paymentMethods.length,
      activePaymentMethods: paymentMethods.filter((pm) => pm.status === PaymentMethodStatus.ACTIVE)
        .length,
      cardsByBrand: {} as Record<string, number>,
      expiringCards: paymentMethods.filter(
        (pm) => pm.expiresAt && pm.expiresAt <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      ).length,
      autoUpdateEnabled: paymentMethods.filter((pm) => pm.autoUpdateData?.autoUpdateEnabled).length,
    };

    paymentMethods.forEach((pm) => {
      if (pm.cardDetails?.brand) {
        const brand = pm.cardDetails.brand;
        analytics.cardsByBrand[brand] = (analytics.cardsByBrand[brand] || 0) + 1;
      }
    });

    return analytics;
  }

  private async reorderSinglePaymentMethod(
    userId: string,
    paymentMethodId: string,
    newPosition: number,
  ): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) return;

    const oldPosition = paymentMethod.cardPosition;
    if (oldPosition === newPosition) return;

    if (newPosition > oldPosition) {
      await this.paymentMethodRepository
        .createQueryBuilder()
        .update(PaymentMethod)
        .set({ cardPosition: () => 'cardPosition - 1' })
        .where('userId = :userId', { userId })
        .andWhere('cardPosition > :oldPosition', { oldPosition })
        .andWhere('cardPosition <= :newPosition', { newPosition })
        .execute();
    } else {
      await this.paymentMethodRepository
        .createQueryBuilder()
        .update(PaymentMethod)
        .set({ cardPosition: () => 'cardPosition + 1' })
        .where('userId = :userId', { userId })
        .andWhere('cardPosition >= :newPosition', { newPosition })
        .andWhere('cardPosition < :oldPosition', { oldPosition })
        .execute();
    }

    paymentMethod.cardPosition = newPosition;
    await this.paymentMethodRepository.save(paymentMethod);
  }
}
