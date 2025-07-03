import { IsBoolean, IsNumber, IsString, IsOptional, IsArray, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ description: 'Enable pay in 2 installments' })
  @IsOptional()
  @IsBoolean()
  enablePayIn2?: boolean;

  @ApiPropertyOptional({ description: 'Enable pay in 3 installments' })
  @IsOptional()
  @IsBoolean()
  enablePayIn3?: boolean;

  @ApiPropertyOptional({ description: 'Enable pay in 4 installments' })
  @IsOptional()
  @IsBoolean()
  enablePayIn4?: boolean;

  @ApiPropertyOptional({ description: 'Minimum order amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum order amount', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maximumAmount?: number;

  @ApiPropertyOptional({ description: 'Auto-approve eligible orders' })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({ description: 'Require manual review for high-value orders' })
  @IsOptional()
  @IsBoolean()
  requireManualReview?: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Notify on new orders' })
  @IsOptional()
  @IsBoolean()
  newOrders?: boolean;

  @ApiPropertyOptional({ description: 'Notify on payment received' })
  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;

  @ApiPropertyOptional({ description: 'Notify on payment failed' })
  @IsOptional()
  @IsBoolean()
  paymentFailed?: boolean;

  @ApiPropertyOptional({ description: 'Send daily summary' })
  @IsOptional()
  @IsBoolean()
  dailySummary?: boolean;

  @ApiPropertyOptional({ description: 'Send weekly report' })
  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;

  @ApiPropertyOptional({ description: 'Send monthly report' })
  @IsOptional()
  @IsBoolean()
  monthlyReport?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ description: 'Enable in-app notifications' })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class UpdateSecuritySettingsDto {
  @ApiPropertyOptional({ description: 'Enable two-factor authentication' })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Session timeout in minutes', minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeout?: number;

  @ApiPropertyOptional({ description: 'IP whitelist for admin access', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: 'Webhook URL for payment notifications' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'API key for merchant integration' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Business phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Business website' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Business description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fee percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercentage?: number;

  @ApiPropertyOptional({ description: 'Store active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MerchantSettingsResponseDto {
  @ApiProperty({ description: 'Settings ID' })
  id: string;

  @ApiProperty({ description: 'Merchant ID' })
  merchantId: string;

  @ApiProperty({ description: 'Setting type' })
  settingType: string;

  @ApiProperty({ description: 'Setting key' })
  settingKey: string;

  @ApiProperty({ description: 'Setting value' })
  settingValue: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  description?: string;

  @ApiProperty({ description: 'Is setting active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  constructor(settings: any) {
    this.id = settings.id;
    this.merchantId = settings.merchantId;
    this.settingType = settings.settingType;
    this.settingKey = settings.settingKey;
    this.settingValue = settings.settingValue;
    this.description = settings.description;
    this.isActive = settings.isActive;
    this.createdAt = settings.createdAt;
    this.updatedAt = settings.updatedAt;
  }
}