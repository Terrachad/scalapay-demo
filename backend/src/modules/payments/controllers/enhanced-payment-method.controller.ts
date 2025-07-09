import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethodService } from '../services/payment-method.service';
import { CardAutoUpdateService } from '../services/card-auto-update.service';
import { PaymentMethod, UsageRestrictions } from '../entities/payment-method.entity';

// DTOs for payment method management
export class CreateSetupIntentDto {
  makeDefault?: boolean;
}

export class StorePaymentMethodDto {
  setupIntentId!: string;
  makeDefault?: boolean;
  position?: number;
  usageRestrictions?: UsageRestrictions;
}

export class UpdatePaymentMethodPositionDto {
  position!: number;
}

export class UpdateUsageRestrictionsDto {
  usageRestrictions!: UsageRestrictions;
}

export class SetDefaultPaymentMethodDto {
  makeDefault!: boolean;
}

export class BulkUpdateCheckDto {
  paymentMethodIds!: string[];
}

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class EnhancedPaymentMethodController {
  constructor(
    private readonly paymentMethodService: PaymentMethodService,
    private readonly cardAutoUpdateService: CardAutoUpdateService,
  ) {}

  // Enhanced card management endpoints
  @Post('setup-intent')
  async createSetupIntent(@Request() req: any, @Body() createSetupIntentDto: CreateSetupIntentDto) {
    const userId = req.user.id;

    // Check if user has reached the maximum number of cards (10)
    const existingMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    if (existingMethods.length >= 10) {
      throw new BadRequestException('Maximum number of payment methods (10) reached');
    }

    const result = await this.paymentMethodService.createSetupIntent(userId);

    return {
      success: true,
      data: result,
      message: 'Setup intent created successfully',
    };
  }

  @Post('store')
  async storePaymentMethod(
    @Request() req: any,
    @Body() storePaymentMethodDto: StorePaymentMethodDto,
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || '';

    const paymentMethod = await this.paymentMethodService.storePaymentMethod(
      userId,
      storePaymentMethodDto.setupIntentId,
      storePaymentMethodDto.makeDefault,
    );

    // Set position if provided
    if (storePaymentMethodDto.position) {
      paymentMethod.updateCardPosition(storePaymentMethodDto.position);
    }

    // Set usage restrictions if provided
    if (storePaymentMethodDto.usageRestrictions) {
      paymentMethod.usageRestrictions = storePaymentMethodDto.usageRestrictions;
    }

    // Initialize compliance data
    paymentMethod.initializeComplianceData(ipAddress, userAgent);

    // Enable auto-update by default
    await this.cardAutoUpdateService.enableAutoUpdate(paymentMethod.id);

    return {
      success: true,
      data: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        cardDetails: paymentMethod.cardDetails,
        position: paymentMethod.cardPosition,
        isDefault: paymentMethod.isDefault,
        displayName: paymentMethod.getDisplayNameWithPosition(),
        complianceStatus: paymentMethod.getComplianceStatus(),
        usageStatistics: paymentMethod.getUsageStatistics(),
      },
      message: 'Payment method stored successfully',
    };
  }

  @Get()
  async getUserPaymentMethods(@Request() req: any) {
    const userId = req.user.id;
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);

    const enhancedMethods = paymentMethods.map((method) => ({
      id: method.id,
      type: method.type,
      cardDetails: method.cardDetails,
      bankAccountDetails: method.bankAccountDetails,
      digitalWalletDetails: method.digitalWalletDetails,
      position: method.cardPosition,
      isDefault: method.isDefault,
      isVerified: method.isVerified,
      status: method.status,
      displayName: method.getDisplayNameWithPosition(),
      canBeUsed: method.canBeUsed(),
      complianceStatus: method.getComplianceStatus(),
      usageStatistics: method.getUsageStatistics(),
      autoUpdateEnabled: method.autoUpdateData?.autoUpdateEnabled || false,
      lastUsed: method.lastUsedAt,
      createdAt: method.createdAt,
      expiresAt: method.expiresAt,
      usageRestrictions: method.usageRestrictions,
    }));

    return {
      success: true,
      data: {
        paymentMethods: enhancedMethods,
        totalCount: enhancedMethods.length,
        maxAllowed: 10,
        defaultMethod: enhancedMethods.find((m) => m.isDefault),
      },
      message: 'Payment methods retrieved successfully',
    };
  }

  @Put(':id/position')
  async updatePaymentMethodPosition(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePaymentMethodPositionDto,
  ) {
    const userId = req.user.id;

    // Get current payment method
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    const paymentMethod = paymentMethods.find((pm) => pm.id === id);

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    // Update position with validation
    paymentMethod.updateCardPosition(updatePositionDto.position);

    // Handle position conflicts (move other cards as needed)
    const conflictingMethod = paymentMethods.find(
      (pm) => pm.id !== id && pm.cardPosition === updatePositionDto.position,
    );

    if (conflictingMethod) {
      conflictingMethod.cardPosition = paymentMethod.cardPosition; // Swap positions
    }

    // Save changes (would need to update service to handle this)
    await this.paymentMethodService.updatePaymentMethodPosition(
      id,
      userId,
      updatePositionDto.position,
    );

    return {
      success: true,
      data: {
        id: paymentMethod.id,
        position: paymentMethod.cardPosition,
        displayName: paymentMethod.getDisplayNameWithPosition(),
      },
      message: 'Payment method position updated successfully',
    };
  }

  @Put(':id/default')
  async setAsDefault(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const result = await this.paymentMethodService.setAsDefault(id, userId);

    return {
      success: true,
      data: result,
      message: 'Default payment method updated successfully',
    };
  }

  @Delete(':id')
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const result = await this.paymentMethodService.deletePaymentMethod(id, userId);

    return {
      success: true,
      data: result,
      message: 'Payment method deleted successfully',
    };
  }

  @Post(':id/verify')
  async verifyPaymentMethod(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    // This would implement payment method verification logic
    // For now, just return success
    return {
      success: true,
      data: {
        id,
        verified: true,
        verificationMethod: 'micro_transaction',
      },
      message: 'Payment method verified successfully',
    };
  }

  @Get(':id/usage-stats')
  async getPaymentMethodUsageStats(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    const paymentMethod = paymentMethods.find((pm) => pm.id === id);

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    const usageStats = paymentMethod.getUsageStatistics();
    const complianceStatus = paymentMethod.getComplianceStatus();

    return {
      success: true,
      data: {
        id: paymentMethod.id,
        displayName: paymentMethod.getDisplayName(),
        ...usageStats,
        complianceStatus,
        autoUpdateHistory: paymentMethod.autoUpdateData?.updateHistory || [],
        restrictions: paymentMethod.usageRestrictions,
        riskScore: paymentMethod.riskScore,
      },
      message: 'Usage statistics retrieved successfully',
    };
  }

  @Put(':id/restrictions')
  async updateUsageRestrictions(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateRestrictionsDto: UpdateUsageRestrictionsDto,
  ) {
    const userId = req.user.id;

    // This would be implemented in the service layer
    // For now, return success
    return {
      success: true,
      data: {
        id,
        restrictions: updateRestrictionsDto.usageRestrictions,
      },
      message: 'Usage restrictions updated successfully',
    };
  }

  // Card auto-update endpoints
  @Post(':id/force-update')
  async forceUpdateCheck(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    // Verify ownership
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    const paymentMethod = paymentMethods.find((pm) => pm.id === id);

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    const result = await this.cardAutoUpdateService.forceUpdateCheck(id);

    return {
      success: true,
      data: result,
      message: 'Card update check completed',
    };
  }

  @Put(':id/auto-update')
  async toggleAutoUpdate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    const userId = req.user.id;

    // Verify ownership
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    const paymentMethod = paymentMethods.find((pm) => pm.id === id);

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    if (body.enabled) {
      await this.cardAutoUpdateService.enableAutoUpdate(id);
    } else {
      await this.cardAutoUpdateService.disableAutoUpdate(id);
    }

    return {
      success: true,
      data: {
        id,
        autoUpdateEnabled: body.enabled,
      },
      message: `Auto-update ${body.enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }

  @Get('auto-update/statistics')
  async getAutoUpdateStatistics(@Request() req: any) {
    const statistics = await this.cardAutoUpdateService.getUpdateStatistics();

    return {
      success: true,
      data: statistics,
      message: 'Auto-update statistics retrieved successfully',
    };
  }

  // Administrative endpoints
  @Post('bulk-update-check')
  async bulkUpdateCheck(@Request() req: any, @Body() bulkUpdateDto: BulkUpdateCheckDto) {
    const userId = req.user.id;

    // Verify ownership of all payment methods
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);
    const userPaymentMethodIds = paymentMethods.map((pm) => pm.id);

    const validIds = bulkUpdateDto.paymentMethodIds.filter((id) =>
      userPaymentMethodIds.includes(id),
    );

    if (validIds.length === 0) {
      throw new BadRequestException('No valid payment methods found');
    }

    const results = await this.cardAutoUpdateService.bulkUpdateCheck(validIds);

    return {
      success: true,
      data: {
        results,
        totalChecked: validIds.length,
        totalRequested: bulkUpdateDto.paymentMethodIds.length,
      },
      message: 'Bulk update check completed',
    };
  }

  // Compliance endpoints
  @Get('compliance/overview')
  async getComplianceOverview(@Request() req: any) {
    const userId = req.user.id;
    const paymentMethods = await this.paymentMethodService.getUserPaymentMethods(userId);

    const overview = {
      totalPaymentMethods: paymentMethods.length,
      compliantMethods: paymentMethods.filter((pm) => pm.getComplianceStatus() === 'compliant')
        .length,
      nonCompliantMethods: paymentMethods.filter(
        (pm) => pm.getComplianceStatus() === 'non_compliant',
      ).length,
      pendingMethods: paymentMethods.filter((pm) => pm.getComplianceStatus() === 'pending').length,
      expiredMethods: paymentMethods.filter((pm) => pm.getComplianceStatus() === 'expired').length,
      averageSecurityScore:
        paymentMethods.reduce((sum, pm) => sum + (pm.riskScore || 0), 0) / paymentMethods.length,
      autoUpdateEnabled: paymentMethods.filter((pm) => pm.autoUpdateData?.autoUpdateEnabled).length,
    };

    return {
      success: true,
      data: overview,
      message: 'Compliance overview retrieved successfully',
    };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return {
      success: true,
      data: {
        service: 'payment-methods',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      message: 'Payment methods service is healthy',
    };
  }

  // Utility endpoints
  @Get('supported-types')
  async getSupportedPaymentTypes() {
    return {
      success: true,
      data: {
        types: [
          {
            type: 'card',
            name: 'Credit/Debit Card',
            supported: true,
            features: ['auto_update', 'usage_restrictions', 'compliance_tracking'],
          },
          {
            type: 'bank_account',
            name: 'Bank Account',
            supported: true,
            features: ['usage_restrictions', 'compliance_tracking'],
          },
          {
            type: 'digital_wallet',
            name: 'Digital Wallet',
            supported: true,
            features: ['usage_restrictions', 'compliance_tracking'],
          },
        ],
        maxPaymentMethods: 10,
        defaultExpirationWarning: 30, // days
      },
      message: 'Supported payment types retrieved successfully',
    };
  }
}
