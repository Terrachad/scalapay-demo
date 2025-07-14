import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, In } from 'typeorm';
import {
  PaymentGatewayConfig,
  Environment,
  ConfigCategory,
  GatewayProvider,
} from '../entities/payment-gateway-config.entity';
import {
  PlatformSettingHistory,
  SettingOperation,
} from '../../platform-settings/entities/platform-setting-history.entity';
import { SettingsAuditService } from '../../platform-settings/services/settings-audit.service';
import { SettingsValidationService } from '../../platform-settings/services/settings-validation.service';

export interface RequestContext {
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  environment: Environment;
}

export interface PaymentConfigUpdateRequest {
  configKey: string;
  value: string;
  category: ConfigCategory;
  provider?: GatewayProvider;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  metadata?: any;
}

export interface BulkUpdateRequest {
  updates: PaymentConfigUpdateRequest[];
  reason?: string;
}

export interface PaymentConfigResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: string[];
  requestId?: string;
  timestamp: Date;
}

@Injectable()
export class PaymentGatewayConfigService {
  private readonly logger = new Logger(PaymentGatewayConfigService.name);

  constructor(
    @InjectRepository(PaymentGatewayConfig)
    private readonly configRepository: Repository<PaymentGatewayConfig>,
    @InjectRepository(PlatformSettingHistory)
    private readonly historyRepository: Repository<PlatformSettingHistory>,
    private readonly auditService: SettingsAuditService,
    private readonly validationService: SettingsValidationService,
  ) {}

  // Helper function to safely extract error details
  private getErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      message: String(error),
    };
  }

  /**
   * Get all payment gateway configurations for a specific environment
   */
  async getAllConfigs(
    environment: Environment,
    context: RequestContext,
  ): Promise<PaymentConfigResponse> {
    try {
      this.logger.debug(`Fetching all payment configs for environment: ${environment}`, {
        userId: context.userId,
        requestId: context.requestId,
      });

      const configs = await this.configRepository.find({
        where: { environment },
        order: { category: 'ASC', configKey: 'ASC' },
      });

      // Group by category for better UI organization
      const groupedConfigs = this.groupConfigsByCategory(configs);

      await this.auditService.logOperation({
        operation: SettingOperation.VALIDATE,
        configKey: 'ALL_CONFIGS',
        category: ConfigCategory.GATEWAY,
        environment,
        userId: context.userId,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        reason: 'Fetched all payment configurations',
        isSuccessful: true,
      });

      return {
        success: true,
        data: groupedConfigs,
        message: `Retrieved ${configs.length} payment configurations`,
        requestId: context.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = this.getErrorDetails(error);
      this.logger.error(`Failed to fetch payment configs for environment ${environment}`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: context.userId,
        requestId: context.requestId,
      });

      await this.auditService.logOperation({
        operation: SettingOperation.VALIDATE,
        configKey: 'ALL_CONFIGS',
        category: ConfigCategory.GATEWAY,
        environment,
        userId: context.userId,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        reason: 'Failed to fetch payment configurations',
        isSuccessful: false,
        errorMessage: errorDetails.message,
      });

      throw new BadRequestException(
        `Failed to fetch payment configurations: ${errorDetails.message}`,
      );
    }
  }

  /**
   * Bulk update multiple payment configurations
   */
  async bulkUpdate(
    request: BulkUpdateRequest,
    context: RequestContext,
    queryRunner?: QueryRunner,
  ): Promise<PaymentConfigResponse> {
    const shouldManageTransaction = !queryRunner;
    const runner = queryRunner || this.configRepository.manager.connection.createQueryRunner();

    try {
      if (shouldManageTransaction) {
        await runner.connect();
        await runner.startTransaction();
      }

      this.logger.debug(
        `Starting bulk update of ${request.updates.length} payment configurations`,
        {
          userId: context.userId,
          requestId: context.requestId,
        },
      );

      // Validate all updates first
      const validationErrors = await this.validationService.validateBulkUpdate(
        request.updates,
        context.environment,
      );
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const results = [];
      const batchId = `batch_${Date.now()}_${context.userId}`;

      for (const update of request.updates) {
        const result = await this.updateSingleConfig(update, context, runner, batchId);
        results.push(result);
      }

      if (shouldManageTransaction) {
        await runner.commitTransaction();
      }

      this.logger.log(
        `Successfully completed bulk update of ${results.length} payment configurations`,
        {
          userId: context.userId,
          requestId: context.requestId,
          batchId,
        },
      );

      return {
        success: true,
        data: { updated: results.length, batchId },
        message: `Successfully updated ${results.length} payment configurations`,
        requestId: context.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = this.getErrorDetails(error);
      if (shouldManageTransaction) {
        await runner.rollbackTransaction();
      }

      this.logger.error(`Bulk update failed for ${request.updates.length} configurations`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: context.userId,
        requestId: context.requestId,
      });

      throw new BadRequestException(`Bulk update failed: ${errorDetails.message}`);
    } finally {
      if (shouldManageTransaction) {
        await runner.release();
      }
    }
  }

  /**
   * Update a single payment configuration
   */
  private async updateSingleConfig(
    update: PaymentConfigUpdateRequest,
    context: RequestContext,
    queryRunner: QueryRunner,
    batchId?: string,
  ): Promise<PaymentGatewayConfig> {
    const repository = queryRunner.manager.getRepository(PaymentGatewayConfig);
    const historyRepository = queryRunner.manager.getRepository(PlatformSettingHistory);

    // Find existing config or create new one
    let config = await repository.findOne({
      where: { configKey: update.configKey, environment: context.environment },
    });

    const oldValue = config?.value;
    const operation = config ? SettingOperation.UPDATE : SettingOperation.CREATE;

    if (!config) {
      config = repository.create({
        configKey: update.configKey,
        environment: context.environment,
        category: update.category,
        provider: update.provider,
        createdBy: context.userId,
      });
    }

    // Update fields
    config.value = update.value;
    config.description = update.description;
    config.isEncrypted = update.isEncrypted || false;
    config.isSensitive = update.isSensitive || false;
    config.metadata = update.metadata;
    config.updatedBy = context.userId;
    config.validationStatus = 'pending';

    // Save configuration
    const savedConfig = await repository.save(config);

    // Create audit history
    await historyRepository.save({
      configId: savedConfig.id,
      configKey: update.configKey,
      oldValue,
      newValue: update.value,
      operation,
      category: update.category,
      environment: context.environment,
      userId: context.userId,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      reason: `Bulk update operation${batchId ? ` - batch: ${batchId}` : ''}`,
      metadata: batchId ? { bulkUpdateBatchId: batchId } : undefined,
      isSuccessful: true,
    });

    return savedConfig;
  }

  /**
   * Validate payment configuration
   */
  async validateConfig(
    configKey: string,
    value: string,
    context: RequestContext,
  ): Promise<PaymentConfigResponse> {
    try {
      this.logger.debug(`Validating payment configuration: ${configKey}`, {
        userId: context.userId,
        requestId: context.requestId,
      });

      const config = await this.configRepository.findOne({
        where: { configKey, environment: context.environment },
      });

      if (!config) {
        throw new NotFoundException(`Configuration not found: ${configKey}`);
      }

      const validationResult = await this.validationService.validateSingleConfig(
        config.configKey,
        value,
        context.environment,
      );

      // Update validation status
      await this.configRepository.update(config.id, {
        validationStatus: validationResult.isValid ? 'valid' : 'invalid',
        validationError: validationResult.isValid ? undefined : validationResult.errors?.join(', '),
        lastValidatedAt: new Date(),
      });

      await this.auditService.logOperation({
        operation: SettingOperation.VALIDATE,
        configKey,
        category: config.category,
        environment: context.environment,
        userId: context.userId,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        reason: 'Configuration validation',
        isSuccessful: validationResult.isValid,
        errorMessage: validationResult.isValid ? undefined : validationResult.errors?.join(', '),
      });

      return {
        success: validationResult.isValid,
        data: validationResult,
        message: validationResult.isValid
          ? 'Configuration is valid'
          : 'Configuration validation failed',
        errors: validationResult.errors,
        requestId: context.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = this.getErrorDetails(error);
      this.logger.error(`Validation failed for configuration: ${configKey}`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: context.userId,
        requestId: context.requestId,
      });

      throw new BadRequestException(`Validation failed: ${errorDetails.message}`);
    }
  }

  /**
   * Reset configuration to default values
   */
  async resetToDefaults(
    environment: Environment,
    context: RequestContext,
  ): Promise<PaymentConfigResponse> {
    const queryRunner = this.configRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      this.logger.debug(
        `Resetting payment configurations to defaults for environment: ${environment}`,
        {
          userId: context.userId,
          requestId: context.requestId,
        },
      );

      // Get default configurations
      const defaultConfigs = await this.getDefaultConfigurations(environment);

      // Delete existing configurations
      await queryRunner.manager.delete(PaymentGatewayConfig, { environment });

      // Create default configurations
      const repository = queryRunner.manager.getRepository(PaymentGatewayConfig);
      const configs = await repository.save(
        defaultConfigs.map((config) => ({
          ...config,
          environment,
          createdBy: context.userId,
          updatedBy: context.userId,
        })),
      );

      // Log audit trail
      await this.auditService.logOperation({
        operation: SettingOperation.ROLLBACK,
        configKey: 'ALL_CONFIGS',
        category: ConfigCategory.GATEWAY,
        environment,
        userId: context.userId,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        reason: 'Reset all configurations to default values',
        metadata: { systemGenerated: true },
        isSuccessful: true,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully reset ${configs.length} payment configurations to defaults`, {
        userId: context.userId,
        requestId: context.requestId,
        environment,
      });

      return {
        success: true,
        data: { reset: configs.length },
        message: `Successfully reset ${configs.length} payment configurations to defaults`,
        requestId: context.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = this.getErrorDetails(error);
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to reset payment configurations to defaults`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: context.userId,
        requestId: context.requestId,
      });

      throw new BadRequestException(`Failed to reset configurations: ${errorDetails.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get configuration schema for dynamic form generation
   */
  async getConfigSchema(
    environment: Environment,
    context: RequestContext,
  ): Promise<PaymentConfigResponse> {
    try {
      this.logger.debug(`Fetching payment configuration schema for environment: ${environment}`, {
        userId: context.userId,
        requestId: context.requestId,
      });

      const schema = await this.generateConfigSchema(environment);

      return {
        success: true,
        data: schema,
        message: 'Configuration schema retrieved successfully',
        requestId: context.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = this.getErrorDetails(error);
      this.logger.error(`Failed to fetch configuration schema`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: context.userId,
        requestId: context.requestId,
      });

      throw new BadRequestException(
        `Failed to fetch configuration schema: ${errorDetails.message}`,
      );
    }
  }

  /**
   * Group configurations by category for better UI organization
   */
  private groupConfigsByCategory(
    configs: PaymentGatewayConfig[],
  ): Record<string, PaymentGatewayConfig[]> {
    return configs.reduce(
      (groups, config) => {
        const category = config.category || 'general';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(config);
        return groups;
      },
      {} as Record<string, PaymentGatewayConfig[]>,
    );
  }

  /**
   * Get default configurations for environment
   */
  private async getDefaultConfigurations(
    environment: Environment,
  ): Promise<Partial<PaymentGatewayConfig>[]> {
    // Return default configurations based on environment
    const defaults: Partial<PaymentGatewayConfig>[] = [
      {
        configKey: 'stripe_publishable_key',
        value: environment === Environment.PRODUCTION ? '' : 'pk_test_default',
        category: ConfigCategory.GATEWAY,
        provider: GatewayProvider.STRIPE,
        description: 'Stripe publishable key for frontend integration',
        isSensitive: false,
        metadata: {
          dataType: 'string',
          validation: { required: true },
          ui: { label: 'Stripe Publishable Key', inputType: 'text' },
        },
      },
      {
        configKey: 'stripe_secret_key',
        value: environment === Environment.PRODUCTION ? '' : 'sk_test_default',
        category: ConfigCategory.GATEWAY,
        provider: GatewayProvider.STRIPE,
        description: 'Stripe secret key for server-side operations',
        isSensitive: true,
        isEncrypted: true,
        metadata: {
          dataType: 'encrypted',
          validation: { required: true },
          ui: { label: 'Stripe Secret Key', inputType: 'password' },
        },
      },
      {
        configKey: 'enable_3d_secure',
        value: 'true',
        category: ConfigCategory.SECURITY,
        description: 'Enable 3D Secure authentication for card payments',
        metadata: {
          dataType: 'boolean',
          ui: { label: 'Enable 3D Secure', inputType: 'switch' },
        },
      },
      {
        configKey: 'fraud_detection_enabled',
        value: 'true',
        category: ConfigCategory.FRAUD,
        description: 'Enable fraud detection for payment processing',
        metadata: {
          dataType: 'boolean',
          ui: { label: 'Enable Fraud Detection', inputType: 'switch' },
        },
      },
    ];

    return defaults;
  }

  /**
   * Generate configuration schema for dynamic forms
   */
  private async generateConfigSchema(environment: Environment): Promise<any> {
    const configs = await this.configRepository.find({
      where: { environment },
      select: ['configKey', 'category', 'metadata', 'description', 'isSensitive'],
    });

    return configs.reduce((schema: Record<string, any>, config) => {
      const category = config.category || 'general';
      if (!schema[category]) {
        schema[category] = {};
      }

      schema[category][config.configKey] = {
        ...config.metadata,
        description: config.description,
        sensitive: config.isSensitive,
      };

      return schema;
    }, {});
  }
}
