import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export interface PlatformSettings {
  // General Settings
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  timeZone: string;

  // Financial Settings
  defaultCreditLimit: number;
  maxCreditLimit: number;
  maxTransactionAmount: number;
  merchantFeeRate: number;
  lateFeeAmount: number;

  // Payment Settings
  paymentInterval: string;
  gracePeriodDays: number;
  maxRetries: number;
  interestRate: number;

  // Feature Toggles
  enableAutoApproval: boolean;
  enableEarlyPayment: boolean;
  enableFraudDetection: boolean;
  requireMerchantApproval: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableWebhookNotifications: boolean;
  maintenanceMode: boolean;

  // Security Settings
  requireTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  @Get('platform-settings')
  @ApiOperation({ summary: 'Get platform settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Platform settings retrieved successfully' })
  async getPlatformSettings(): Promise<PlatformSettings> {
    this.logger.log('Getting platform settings');

    // Return default platform settings for now
    // In a real implementation, these would be stored in database
    const settings = {
      // General Settings
      platformName: 'ScalaPay',
      supportEmail: 'support@scalapay.com',
      defaultCurrency: 'USD',
      timeZone: 'UTC',

      // Financial Settings
      defaultCreditLimit: 1000,
      maxCreditLimit: 10000,
      maxTransactionAmount: 5000,
      merchantFeeRate: 2.9,
      lateFeeAmount: 25,

      // Payment Settings
      paymentInterval: 'biweekly',
      gracePeriodDays: 7,
      maxRetries: 3,
      interestRate: 0.0,

      // Feature Toggles
      enableAutoApproval: true,
      enableEarlyPayment: true,
      enableFraudDetection: true,
      requireMerchantApproval: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      enableWebhookNotifications: true,
      maintenanceMode: false,

      // Security Settings
      requireTwoFactor: true,
      sessionTimeoutMinutes: 30,
      passwordExpiryDays: 90,
      maxLoginAttempts: 5,
    };

    this.logger.log('Returning platform settings:', JSON.stringify(settings, null, 2));
    return settings;
  }

  @Put('platform-settings')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update platform settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Platform settings updated successfully' })
  async updatePlatformSettings(
    @Body() updateData: Partial<PlatformSettings>,
  ): Promise<PlatformSettings> {
    this.logger.log('Updating platform settings with:', JSON.stringify(updateData, null, 2));

    // For now, just return the current settings merged with updates
    // In a real implementation, these would be saved to database
    const currentSettings = await this.getPlatformSettings();

    const updatedSettings = {
      ...currentSettings,
      ...updateData,
    };

    this.logger.log('Returning updated settings:', JSON.stringify(updatedSettings, null, 2));
    return updatedSettings;
  }

  @Get('pending-merchants')
  @ApiOperation({ summary: 'Get pending merchant approvals (admin only)' })
  @ApiResponse({ status: 200, description: 'Pending merchants retrieved successfully' })
  async getPendingMerchants(): Promise<any[]> {
    // Return empty array for now
    // In a real implementation, this would query the database for pending merchants
    return [];
  }
}
