import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEmail,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingCategory, SettingDataType, Environment } from '../entities/platform-setting.entity';
import { SettingOperation } from '../entities/platform-setting-history.entity';
import { ValidationRule } from '../entities/platform-setting-schema.entity';

// Import shared types for consistency
import {
  PlatformSettings,
  UpdatePlatformSettingsRequest as SharedUpdateRequest,
  SettingUpdateRequest as SharedSettingUpdateRequest,
  SettingUpdateResponse as SharedSettingUpdateResponse,
  PlatformSettingsResponse as SharedPlatformSettingsResponse,
  BulkUpdateResponse as SharedBulkUpdateResponse,
  ValidationResult as SharedValidationResult,
  ValidateSettingsRequest as SharedValidateSettingsRequest,
  ValidateSettingsResponse as SharedValidateSettingsResponse,
  ApiResponse as SharedApiResponse,
  ApiSuccessResponse as SharedApiSuccessResponse,
  ApiErrorResponse as SharedApiErrorResponse,
  DEFAULT_PLATFORM_SETTINGS,
} from '../../../shared/platform-settings.types';

export class CreateSettingRequest {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'Setting value' })
  value: any;

  @ApiProperty({ enum: SettingCategory, description: 'Setting category' })
  @IsEnum(SettingCategory)
  category!: SettingCategory;

  @ApiProperty({ enum: SettingDataType, description: 'Data type' })
  @IsEnum(SettingDataType)
  dataType!: SettingDataType;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether setting is encrypted' })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ description: 'Whether setting requires restart' })
  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @ApiPropertyOptional({ description: 'Environment for the setting' })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiPropertyOptional({ description: 'Reason for creating setting' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Use shared types for consistency across frontend and backend
export class SettingUpdateRequest {
  @ApiProperty({ description: 'Setting key from PlatformSettings interface' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'New setting value' })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({ description: 'Reason for update' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdatePlatformSettingsRequest {
  @ApiProperty({ description: 'Array of setting updates', type: [SettingUpdateRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingUpdateRequest)
  updates!: SettingUpdateRequest[];

  @ApiPropertyOptional({ description: 'Reason for bulk update' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: Environment, description: 'Environment to update' })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;
}

export class SettingUpdateResponse implements SharedSettingUpdateResponse {
  @ApiProperty({ description: 'Setting key' })
  key!: string;

  @ApiProperty({ description: 'Update success status' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Previous value' })
  previousValue?: any;

  @ApiPropertyOptional({ description: 'New value' })
  newValue?: any;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Update timestamp' })
  timestamp!: Date;
}

export class BulkUpdateResponse implements SharedBulkUpdateResponse {
  @ApiProperty({ description: 'Array of update results', type: [SettingUpdateResponse] })
  results!: SettingUpdateResponse[];

  @ApiProperty({ description: 'Number of successful updates' })
  successCount!: number;

  @ApiProperty({ description: 'Number of failed updates' })
  errorCount!: number;

  @ApiProperty({ description: 'Update timestamp' })
  timestamp!: Date;
}

export class ValidationResult implements SharedValidationResult {
  @ApiProperty({ description: 'Setting key' })
  key!: string;

  @ApiProperty({ description: 'Validation result' })
  valid!: boolean;

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  error?: string;

  @ApiPropertyOptional({ description: 'Warning messages', type: [String] })
  warnings?: string[];
}

export class ValidateSettingsRequest implements SharedValidateSettingsRequest {
  @ApiProperty({ description: 'Settings to validate' })
  @IsObject()
  settings!: Partial<PlatformSettings>;

  @ApiPropertyOptional({ enum: Environment, description: 'Environment to validate for' })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;
}

export class ValidateSettingsResponse implements SharedValidateSettingsResponse {
  @ApiProperty({ description: 'Overall validation result' })
  valid!: boolean;

  @ApiProperty({ description: 'Individual field validation results', type: [ValidationResult] })
  results!: ValidationResult[];

  @ApiProperty({ description: 'Array of error messages', type: [String] })
  errors!: string[];

  @ApiProperty({ description: 'Array of warning messages', type: [String] })
  warnings!: string[];
}

export class PlatformSettingsResponse implements SharedPlatformSettingsResponse {
  @ApiProperty({ description: 'Platform settings object' })
  settings!: PlatformSettings;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated!: Date;

  @ApiProperty({ enum: Environment, description: 'Environment' })
  environment!: Environment;

  @ApiProperty({ description: 'Settings version' })
  version!: string;
}

export class PlatformSettingHistoryResponse {
  @ApiProperty({ type: [Object], description: 'History entries' })
  history!: any[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Limit applied' })
  limit!: number;

  @ApiProperty({ description: 'Offset applied' })
  offset!: number;
}

export class AuditReportFilters {
  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Config key filter' })
  @IsOptional()
  @IsString()
  configKey?: string;

  @ApiPropertyOptional({ enum: SettingOperation, description: 'Operation filter' })
  @IsOptional()
  @IsEnum(SettingOperation)
  operation?: SettingOperation;

  @ApiPropertyOptional({ enum: Environment, description: 'Environment filter' })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Result limit', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Result offset', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Filter by operation success status' })
  @IsOptional()
  @IsBoolean()
  isSuccessful?: boolean;
}

export class AuditSummary {
  @ApiProperty({ description: 'Total number of changes' })
  totalChanges!: number;

  @ApiProperty({ description: 'Number of unique users who made changes' })
  uniqueUsers!: number;

  @ApiProperty({ description: 'Count by operation type' })
  operationCounts!: {
    CREATE: number;
    UPDATE: number;
    DELETE: number;
  };

  @ApiProperty({ description: 'Number of critical changes' })
  criticalChanges!: number;

  @ApiProperty({ description: 'Most frequently changed settings' })
  mostChangedSettings!: { key: string; count: number }[];
}

export class AuditReport {
  @ApiProperty({ type: [Object], description: 'Array of change records' })
  changes!: any[];

  @ApiProperty({ description: 'Total count of changes' })
  totalCount!: number;

  @ApiProperty({ description: 'Date range of the report' })
  period!: { startDate: Date; endDate: Date };

  @ApiProperty({ description: 'Summary statistics' })
  summary!: AuditSummary;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  environment: string;
}

export interface SettingChangeData {
  settingId: string;
  key: string;
  oldValue: any;
  newValue: any;
  operation: SettingOperation;
  reason: string;
  changedBy: string;
  context: RequestContext;
}

// Enterprise-grade API response wrappers
export class SuccessResponse<T = any> implements SharedApiSuccessResponse<T> {
  @ApiProperty({ description: 'Success indicator' })
  success!: true;

  @ApiProperty({ description: 'Response data' })
  data!: T;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  requestId?: string;
}

export class ErrorResponse implements SharedApiErrorResponse {
  @ApiProperty({ description: 'Success indicator' })
  success!: false;

  @ApiProperty({ description: 'Error details' })
  error!: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    requestId?: string;
  };
}

// Enterprise-grade validation DTOs for platform settings
export class PlatformSettingsValidationDto {
  // General Settings
  @ApiPropertyOptional({ description: 'Platform name', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  platformName?: string;

  @ApiPropertyOptional({ description: 'Support email address' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ enum: ['USD', 'EUR', 'GBP', 'CAD'], description: 'Default currency' })
  @IsOptional()
  @IsEnum(['USD', 'EUR', 'GBP', 'CAD'])
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Platform timezone' })
  @IsOptional()
  @IsString()
  timeZone?: string;

  // Financial Settings
  @ApiPropertyOptional({ description: 'Default credit limit', minimum: 100, maximum: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  defaultCreditLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum credit limit', minimum: 1000, maximum: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(100000)
  maxCreditLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum transaction amount', minimum: 100, maximum: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  maxTransactionAmount?: number;

  @ApiPropertyOptional({ description: 'Merchant fee rate percentage', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  merchantFeeRate?: number;

  @ApiPropertyOptional({ description: 'Late fee amount', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeeAmount?: number;

  // Payment Settings
  @ApiPropertyOptional({ enum: ['weekly', 'biweekly', 'monthly'], description: 'Payment interval' })
  @IsOptional()
  @IsEnum(['weekly', 'biweekly', 'monthly'])
  paymentInterval?: 'weekly' | 'biweekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Grace period in days', minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  gracePeriodDays?: number;

  @ApiPropertyOptional({ description: 'Maximum payment retries', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Interest rate percentage', minimum: 0, maximum: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(25)
  interestRate?: number;

  // Feature Toggles
  @ApiPropertyOptional({ description: 'Enable automatic approval' })
  @IsOptional()
  @IsBoolean()
  enableAutoApproval?: boolean;

  @ApiPropertyOptional({ description: 'Enable early payment feature' })
  @IsOptional()
  @IsBoolean()
  enableEarlyPayment?: boolean;

  @ApiPropertyOptional({ description: 'Enable fraud detection' })
  @IsOptional()
  @IsBoolean()
  enableFraudDetection?: boolean;

  @ApiPropertyOptional({ description: 'Require merchant approval' })
  @IsOptional()
  @IsBoolean()
  requireMerchantApproval?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  enableEmailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  enableSMSNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable webhook notifications' })
  @IsOptional()
  @IsBoolean()
  enableWebhookNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Maintenance mode toggle' })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  // Security Settings
  @ApiPropertyOptional({ description: 'Require two-factor authentication' })
  @IsOptional()
  @IsBoolean()
  requireTwoFactor?: boolean;

  @ApiPropertyOptional({ description: 'Session timeout in minutes', minimum: 5, maximum: 480 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: 'Password expiry in days', minimum: 30, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(365)
  passwordExpiryDays?: number;

  @ApiPropertyOptional({ description: 'Maximum login attempts', minimum: 3, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(10)
  maxLoginAttempts?: number;
}
