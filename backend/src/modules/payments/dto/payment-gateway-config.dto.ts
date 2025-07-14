import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  Environment,
  ConfigCategory,
  GatewayProvider,
} from '../entities/payment-gateway-config.entity';
import { SettingOperation } from '../../platform-settings/entities/platform-setting-history.entity';

// Basic DTOs
export class CreatePaymentGatewayConfigDto {
  @ApiProperty({ description: 'Configuration key', example: 'stripe_publishable_key' })
  @IsString()
  configKey!: string;

  @ApiProperty({ description: 'Configuration value', example: 'pk_test_...' })
  @IsString()
  value!: string;

  @ApiProperty({ description: 'Configuration category', enum: ConfigCategory })
  @IsEnum(ConfigCategory)
  category!: ConfigCategory;

  @ApiProperty({ description: 'Environment', enum: Environment })
  @IsEnum(Environment)
  environment!: Environment;

  @ApiProperty({ description: 'Gateway provider', enum: GatewayProvider, required: false })
  @IsOptional()
  @IsEnum(GatewayProvider)
  provider?: GatewayProvider;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether value is encrypted', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiProperty({
    description: 'Whether configuration is sensitive',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiProperty({ description: 'Configuration metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdatePaymentGatewayConfigDto {
  @ApiProperty({ description: 'Configuration value', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether value is encrypted', required: false })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiProperty({ description: 'Whether configuration is sensitive', required: false })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiProperty({ description: 'Whether configuration is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Configuration metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Enterprise DTOs
export class PaymentConfigBulkUpdateItemDto {
  @ApiProperty({ description: 'Configuration key', example: 'stripe_publishable_key' })
  @IsString()
  configKey!: string;

  @ApiProperty({ description: 'Configuration value', example: 'pk_test_...' })
  @IsString()
  value!: string;

  @ApiProperty({ description: 'Configuration category', enum: ConfigCategory })
  @IsEnum(ConfigCategory)
  category!: ConfigCategory;

  @ApiProperty({ description: 'Gateway provider', enum: GatewayProvider, required: false })
  @IsOptional()
  @IsEnum(GatewayProvider)
  provider?: GatewayProvider;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether value is encrypted', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiProperty({
    description: 'Whether configuration is sensitive',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiProperty({ description: 'Configuration metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class PaymentConfigBulkUpdateDto {
  @ApiProperty({
    description: 'Array of configuration updates',
    type: [PaymentConfigBulkUpdateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentConfigBulkUpdateItemDto)
  updates!: PaymentConfigBulkUpdateItemDto[];

  @ApiProperty({ description: 'Reason for bulk update', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentConfigValidationDto {
  @ApiProperty({ description: 'Configuration key to validate', example: 'stripe_publishable_key' })
  @IsString()
  configKey!: string;

  @ApiProperty({ description: 'Configuration value to validate', example: 'pk_test_...' })
  @IsString()
  value!: string;
}

export class PaymentConfigQueryDto {
  @ApiProperty({ description: 'Environment filter', enum: Environment, required: false })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiProperty({ description: 'Category filter', enum: ConfigCategory, required: false })
  @IsOptional()
  @IsEnum(ConfigCategory)
  category?: ConfigCategory;

  @ApiProperty({ description: 'Gateway provider filter', enum: GatewayProvider, required: false })
  @IsOptional()
  @IsEnum(GatewayProvider)
  provider?: GatewayProvider;

  @ApiProperty({ description: 'Active status filter', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  active?: boolean;
}

export class AuditQueryDto {
  @ApiProperty({ description: 'Environment filter', enum: Environment, required: false })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiProperty({ description: 'Configuration key filter', required: false })
  @IsOptional()
  @IsString()
  configKey?: string;

  @ApiProperty({ description: 'Category filter', enum: ConfigCategory, required: false })
  @IsOptional()
  @IsEnum(ConfigCategory)
  category?: ConfigCategory;

  @ApiProperty({ description: 'Operation filter', enum: SettingOperation, required: false })
  @IsOptional()
  @IsEnum(SettingOperation)
  operation?: SettingOperation;

  @ApiProperty({ description: 'User ID filter', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Date from filter (ISO string)', required: false })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({ description: 'Date to filter (ISO string)', required: false })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiProperty({ description: 'Success status filter', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isSuccessful?: boolean;

  @ApiProperty({ description: 'Result limit', required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiProperty({ description: 'Result offset', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export class PaymentConfigResetDto {
  @ApiProperty({ description: 'Environment to reset', enum: Environment })
  @IsEnum(Environment)
  environment!: Environment;

  @ApiProperty({ description: 'Reason for reset', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Response DTOs
export class PaymentConfigResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: any;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Error messages', required: false })
  errors?: string[];

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigValidationResponseDto {
  @ApiProperty({ description: 'Validation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Validation result data' })
  data!: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  };

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigBulkUpdateResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Bulk update result data' })
  data!: {
    updated: number;
    batchId: string;
  };

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigSchemaResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Configuration schema by category' })
  data!: Record<string, Record<string, any>>;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigAuditResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Audit trail data' })
  data!: {
    records: any[];
    total: number;
    hasMore: boolean;
  };

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigAuditTrailResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Audit trail summary and history' })
  data!: {
    summary: {
      configKey: string;
      totalChanges: number;
      lastModified: Date;
      lastModifiedBy: string;
      recentOperations: SettingOperation[];
      hasErrors: boolean;
    };
    history: any[];
  };

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class PaymentConfigHealthResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'System health status' })
  data!: {
    status: string;
    database: { status: string };
    configurations: { status: string };
    validation: { status: string };
    audit: { status: string };
  };

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

// Utility DTOs for frontend integration
export class PaymentConfigCategoryDto {
  @ApiProperty({ description: 'Category name', enum: ConfigCategory })
  @IsEnum(ConfigCategory)
  category!: ConfigCategory;

  @ApiProperty({ description: 'Category display name' })
  @IsString()
  displayName!: string;

  @ApiProperty({ description: 'Category description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Category icon', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Category order for UI', required: false })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class PaymentConfigGroupedDto {
  @ApiProperty({ description: 'Configurations grouped by category' })
  @IsObject()
  data!: Record<string, any[]>;

  @ApiProperty({ description: 'Category metadata' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentConfigCategoryDto)
  categories!: PaymentConfigCategoryDto[];

  @ApiProperty({ description: 'Environment' })
  @IsEnum(Environment)
  environment!: Environment;

  @ApiProperty({ description: 'Total configuration count' })
  @IsNumber()
  totalCount!: number;
}
