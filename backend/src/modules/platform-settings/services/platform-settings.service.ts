import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  PlatformSetting,
  SettingCategory,
  SettingDataType,
} from '../entities/platform-setting.entity';
import {
  PlatformSettingHistory,
  SettingOperation,
} from '../entities/platform-setting-history.entity';
import { PlatformSettingSchema } from '../entities/platform-setting-schema.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { SettingsCacheService } from './settings-cache.service';
import { SettingsValidationService } from './settings-validation.service';
import { SettingsAuditService } from './settings-audit.service';
import { SettingsEncryptionService } from './settings-encryption.service';
import {
  CreateSettingRequest,
  SettingUpdateRequest,
  SettingUpdateResponse,
  PlatformSettingsResponse,
  RequestContext,
  SettingChangeData,
  PlatformSettingHistoryResponse,
} from '../dto/platform-settings.dto';
import { PlatformSettings } from '../../../shared/platform-settings.types';

export class SettingChangedEvent {
  constructor(
    public readonly key: string,
    public readonly oldValue: any,
    public readonly newValue: any,
    public readonly category: SettingCategory,
    public readonly changedBy: string,
    public readonly timestamp: Date,
  ) {}
}

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
    @InjectRepository(PlatformSettingHistory)
    private readonly historyRepository: Repository<PlatformSettingHistory>,
    @InjectRepository(PlatformSettingSchema)
    private readonly schemaRepository: Repository<PlatformSettingSchema>,
    private readonly cacheService: SettingsCacheService,
    private readonly validationService: SettingsValidationService,
    private readonly auditService: SettingsAuditService,
    private readonly encryptionService: SettingsEncryptionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async getAllSettings(environment?: string): Promise<PlatformSettingsResponse> {
    const env = environment || process.env.NODE_ENV || 'production';
    const cacheKey = `platform_settings:${env}`;

    // Try cache first
    const cached = await this.cacheService.get<PlatformSettingsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for settings: ${cacheKey}`);
      return cached;
    }

    // Fetch from database
    const settings = await this.settingsRepository.find({
      where: {
        environment: env as any,
        isActive: true,
      },
      order: { category: 'ASC', key: 'ASC' },
    });

    // Decrypt encrypted values
    const processedSettings = await this.processSettingsForResponse(settings);

    // Cache the result
    await this.cacheService.set(cacheKey, processedSettings, 300); // 5 minutes

    this.logger.log(`Retrieved ${settings.length} platform settings`);
    return processedSettings;
  }

  async getSettingByKey(key: string, environment?: string): Promise<any> {
    const env = environment || process.env.NODE_ENV || 'production';
    const cacheKey = `setting:${key}:${env}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const setting = await this.settingsRepository.findOne({
      where: { key, environment: env as any, isActive: true },
    });

    if (!setting) {
      // Return default value from schema if exists
      const schema = await this.schemaRepository.findOne({ where: { key } });
      if (schema?.defaultValue) {
        return schema.defaultValue;
      }
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    const rawValue = setting.isEncrypted
      ? await this.encryptionService.decrypt(setting.value)
      : setting.value;

    // Parse the value based on data type
    let value = rawValue;
    if (typeof rawValue === 'string') {
      try {
        switch (setting.dataType) {
          case 'json':
          case 'array':
            value = JSON.parse(rawValue);
            break;
          case 'number':
          case 'percentage':
            value = parseFloat(rawValue);
            break;
          case 'boolean':
            value = rawValue === 'true' || rawValue === '1';
            break;
          case 'date':
            value = new Date(rawValue);
            break;
          default:
            // Keep as string for string, email, url, currency, encrypted_string
            break;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse value for setting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Cache the result
    await this.cacheService.set(cacheKey, value, 600); // 10 minutes

    return value;
  }

  async updateSetting(
    key: string,
    value: any,
    userId: string,
    reason: string,
    context: RequestContext,
  ): Promise<PlatformSetting> {
    const environment = (context.environment as any) || process.env.NODE_ENV || 'production';
    let existingSetting = await this.settingsRepository.findOne({
      where: { key, environment },
    });

    // If setting doesn't exist, create it with sensible defaults
    if (!existingSetting) {
      this.logger.warn(`Setting '${key}' not found, creating it automatically`);

      // Auto-detect category and data type based on key name and value
      let category = SettingCategory.GENERAL;
      let dataType = SettingDataType.STRING;

      if (
        key.includes('Credit') ||
        key.includes('Amount') ||
        key.includes('Fee') ||
        key.includes('Rate') ||
        key.includes('Retries') ||
        key.includes('Days') ||
        key.includes('Minutes') ||
        key.includes('Attempts')
      ) {
        category = SettingCategory.FINANCIAL;
        dataType = typeof value === 'number' ? SettingDataType.NUMBER : SettingDataType.STRING;
      } else if (
        key.includes('Security') ||
        key.includes('Password') ||
        key.includes('Session') ||
        key.includes('TwoFactor') ||
        key.includes('Login')
      ) {
        category = SettingCategory.SECURITY;
        dataType = typeof value === 'boolean' ? SettingDataType.BOOLEAN : SettingDataType.NUMBER;
      } else if (
        key.includes('Notification') ||
        key.includes('Email') ||
        key.includes('SMS') ||
        key.includes('Webhook')
      ) {
        category = SettingCategory.NOTIFICATIONS;
        dataType = SettingDataType.BOOLEAN;
      } else if (key.includes('enable') || key.includes('require') || key.includes('maintenance')) {
        category = SettingCategory.FEATURES;
        dataType = SettingDataType.BOOLEAN;
      }

      if (typeof value === 'boolean') dataType = SettingDataType.BOOLEAN;
      else if (typeof value === 'number') dataType = SettingDataType.NUMBER;
      else if (key.includes('Email')) dataType = SettingDataType.EMAIL;
      else if (key.includes('Currency')) dataType = SettingDataType.CURRENCY;
      else if (key.includes('Rate') || key.includes('Percentage'))
        dataType = SettingDataType.PERCENTAGE;

      existingSetting = await this.settingsRepository.save({
        key,
        value: typeof value === 'string' ? value : String(value),
        category,
        dataType,
        description: `Auto-created setting for ${key}`,
        isEncrypted: false,
        requiresRestart: false,
        environment,
        isActive: true,
        createdBy: { id: userId } as User,
        updatedBy: { id: userId } as User,
      });

      this.logger.log(
        `Created missing setting '${key}' with category ${category} and dataType ${dataType}`,
      );
    }

    // Validate the new value
    await this.validationService.validateSetting(key, value);

    // Check permissions
    await this.validateUserPermissions(userId, existingSetting.category);

    const rawOldValue = existingSetting.isEncrypted
      ? await this.encryptionService.decrypt(existingSetting.value)
      : existingSetting.value;

    // Parse the old value based on data type
    let oldValue = rawOldValue;
    if (typeof rawOldValue === 'string') {
      try {
        switch (existingSetting.dataType) {
          case 'json':
          case 'array':
            oldValue = JSON.parse(rawOldValue);
            break;
          case 'number':
          case 'percentage':
            oldValue = parseFloat(rawOldValue);
            break;
          case 'boolean':
            oldValue = rawOldValue === 'true' || rawOldValue === '1';
            break;
          case 'date':
            oldValue = new Date(rawOldValue);
            break;
          default:
            // Keep as string for string, email, url, currency, encrypted_string
            break;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse old value for setting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Serialize value based on data type
    let serializedValue: string;
    try {
      switch (existingSetting.dataType) {
        case 'json':
        case 'array':
          serializedValue = JSON.stringify(value);
          break;
        case 'boolean':
          serializedValue = value ? 'true' : 'false';
          break;
        case 'number':
        case 'percentage':
          serializedValue = value.toString();
          break;
        case 'date':
          serializedValue =
            value instanceof Date ? value.toISOString() : new Date(value).toISOString();
          break;
        default:
          // For string, email, url, currency, encrypted_string
          serializedValue = typeof value === 'string' ? value : String(value);
          break;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to serialize value for setting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      serializedValue = String(value);
    }

    // Encrypt if needed
    const processedValue = existingSetting.isEncrypted
      ? await this.encryptionService.encrypt(serializedValue)
      : serializedValue;

    // Update the setting
    const updatedSetting = await this.settingsRepository.save({
      ...existingSetting,
      value: processedValue,
      updatedBy: { id: userId } as User,
      updatedAt: new Date(),
    });

    // Create audit record
    await this.auditService.logSettingChange({
      settingId: existingSetting.id,
      key,
      oldValue,
      newValue: value,
      operation: SettingOperation.UPDATE,
      reason,
      changedBy: userId,
      context,
    });

    // Invalidate cache
    await this.invalidateSettingCache(key, context.environment);

    // Emit event for real-time updates
    this.eventEmitter.emit(
      'setting.changed',
      new SettingChangedEvent(key, oldValue, value, existingSetting.category, userId, new Date()),
    );

    this.logger.log(`Setting '${key}' updated by user ${userId}`);
    return updatedSetting;
  }

  async bulkUpdateSettings(
    updates: SettingUpdateRequest[],
    userId: string,
    reason: string,
    context: RequestContext,
  ): Promise<SettingUpdateResponse[]> {
    const results: SettingUpdateResponse[] = [];

    // Use database transaction for atomicity
    await this.settingsRepository.manager.transaction(async (entityManager) => {
      for (const update of updates) {
        try {
          const setting = await this.updateSetting(
            update.key,
            update.value,
            userId,
            reason,
            context,
          );
          results.push({
            key: update.key,
            success: true,
            previousValue: null,
            newValue: update.value,
            timestamp: new Date(),
          });
        } catch (error) {
          results.push({
            key: update.key,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
        }
      }
    });

    return results;
  }

  async createSetting(
    createRequest: CreateSettingRequest,
    userId: string,
    context: RequestContext,
  ): Promise<PlatformSetting> {
    // Validate against schema
    await this.validationService.validateNewSetting(createRequest);

    // Check permissions
    await this.validateUserPermissions(userId, createRequest.category);

    // Check if key already exists
    const existing = await this.settingsRepository.findOne({
      where: { key: createRequest.key, environment: (context.environment as any) || 'production' },
    });

    if (existing) {
      throw new ConflictException(`Setting with key '${createRequest.key}' already exists`);
    }

    // Serialize value based on data type
    let serializedValue: string;
    try {
      switch (createRequest.dataType) {
        case 'json':
        case 'array':
          serializedValue = JSON.stringify(createRequest.value);
          break;
        case 'boolean':
          serializedValue = createRequest.value ? 'true' : 'false';
          break;
        case 'number':
        case 'percentage':
          serializedValue = createRequest.value.toString();
          break;
        case 'date':
          serializedValue =
            createRequest.value instanceof Date
              ? createRequest.value.toISOString()
              : new Date(createRequest.value).toISOString();
          break;
        default:
          // For string, email, url, currency, encrypted_string
          serializedValue =
            typeof createRequest.value === 'string'
              ? createRequest.value
              : String(createRequest.value);
          break;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to serialize value for new setting ${createRequest.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      serializedValue = String(createRequest.value);
    }

    // Encrypt if needed
    const processedValue = createRequest.isEncrypted
      ? await this.encryptionService.encrypt(serializedValue)
      : serializedValue;

    const newSetting = await this.settingsRepository.save({
      key: createRequest.key,
      value: processedValue,
      category: createRequest.category,
      dataType: createRequest.dataType,
      description: createRequest.description,
      isEncrypted: createRequest.isEncrypted || false,
      requiresRestart: createRequest.requiresRestart || false,
      environment: (context.environment as any) || process.env.NODE_ENV || 'production',
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    // Create audit record
    await this.auditService.logSettingChange({
      settingId: newSetting.id,
      key: createRequest.key,
      oldValue: null,
      newValue: createRequest.value,
      operation: SettingOperation.CREATE,
      reason: 'Setting created',
      changedBy: userId,
      context,
    });

    // Invalidate cache
    await this.invalidateSettingCache(createRequest.key, context.environment);

    this.logger.log(`Setting '${createRequest.key}' created by user ${userId}`);
    return newSetting;
  }

  async deleteSetting(
    key: string,
    userId: string,
    reason: string,
    context: RequestContext,
  ): Promise<void> {
    const setting = await this.settingsRepository.findOne({
      where: {
        key,
        environment: (context.environment as any) || process.env.NODE_ENV || 'production',
      },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    // Check permissions
    await this.validateUserPermissions(userId, setting.category);

    // Check if setting is required
    const schema = await this.schemaRepository.findOne({ where: { key } });
    if (schema?.isRequired) {
      throw new BadRequestException(`Cannot delete required setting '${key}'`);
    }

    const rawOldValue = setting.isEncrypted
      ? await this.encryptionService.decrypt(setting.value)
      : setting.value;

    // Parse the old value based on data type
    let oldValue = rawOldValue;
    if (typeof rawOldValue === 'string') {
      try {
        switch (setting.dataType) {
          case 'json':
          case 'array':
            oldValue = JSON.parse(rawOldValue);
            break;
          case 'number':
          case 'percentage':
            oldValue = parseFloat(rawOldValue);
            break;
          case 'boolean':
            oldValue = rawOldValue === 'true' || rawOldValue === '1';
            break;
          case 'date':
            oldValue = new Date(rawOldValue);
            break;
          default:
            // Keep as string for string, email, url, currency, encrypted_string
            break;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse old value for setting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Soft delete
    await this.settingsRepository.save({
      ...setting,
      isActive: false,
      updatedBy: { id: userId } as User,
      updatedAt: new Date(),
    });

    // Create audit record
    await this.auditService.logSettingChange({
      settingId: setting.id,
      key,
      oldValue,
      newValue: null,
      operation: SettingOperation.DELETE,
      reason,
      changedBy: userId,
      context,
    });

    // Invalidate cache
    await this.invalidateSettingCache(key, context.environment);

    this.logger.log(`Setting '${key}' deleted by user ${userId}`);
  }

  async getSettingHistory(
    key: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PlatformSettingHistoryResponse> {
    return await this.auditService.getSettingHistory(key, limit, offset);
  }

  async rollbackSetting(
    key: string,
    historyId: string,
    userId: string,
    reason: string,
    context: RequestContext,
  ): Promise<PlatformSetting> {
    const historyRecord = await this.historyRepository.findOne({
      where: { id: historyId, key },
    });

    if (!historyRecord) {
      throw new NotFoundException(`History record not found`);
    }

    // Rollback to the old value
    return await this.updateSetting(
      key,
      historyRecord.oldValue,
      userId,
      `Rollback: ${reason}`,
      context,
    );
  }

  async getSettingsSchema(): Promise<PlatformSettingSchema[]> {
    return await this.schemaRepository.find({
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  async performHealthCheck(): Promise<{ status: string; components: any }> {
    const components = {
      database: 'healthy',
      cache: 'healthy',
      encryption: 'healthy',
    };

    try {
      // Test database connection
      await this.settingsRepository.count();
    } catch (error) {
      components.database = 'unhealthy';
      this.logger.error('Database health check failed:', error);
    }

    try {
      // Test cache
      const cacheHealthy = await this.cacheService.isHealthy();
      components.cache = cacheHealthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      components.cache = 'unhealthy';
      this.logger.error('Cache health check failed:', error);
    }

    try {
      // Test encryption
      const testData = { test: 'data' };
      const encrypted = await this.encryptionService.encrypt(testData);
      const decrypted = await this.encryptionService.decrypt(encrypted);
      components.encryption =
        JSON.stringify(testData) === JSON.stringify(decrypted) ? 'healthy' : 'unhealthy';
    } catch (error) {
      components.encryption = 'unhealthy';
      this.logger.error('Encryption health check failed:', error);
    }

    const allHealthy = Object.values(components).every((status) => status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      components,
    };
  }

  private async processSettingsForResponse(
    settings: PlatformSetting[],
  ): Promise<PlatformSettingsResponse> {
    const categorizedSettings: { [category: string]: { [key: string]: any } } = {};

    for (const setting of settings) {
      let value = setting.value;

      // Parse the value based on data type
      if (typeof value === 'string') {
        try {
          switch (setting.dataType) {
            case 'json':
            case 'array':
              value = JSON.parse(value);
              break;
            case 'number':
            case 'percentage':
              value = parseFloat(value);
              break;
            case 'boolean':
              value = value === 'true' || value === '1';
              break;
            case 'date':
              value = new Date(value);
              break;
            default:
              // Keep as string for string, email, url, currency, encrypted_string
              break;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to parse value for setting ${setting.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Decrypt if needed
      const finalValue = setting.isEncrypted ? await this.encryptionService.decrypt(value) : value;

      // Group by category
      if (!categorizedSettings[setting.category]) {
        categorizedSettings[setting.category] = {};
      }
      categorizedSettings[setting.category][setting.key] = finalValue;
    }

    return {
      settings: categorizedSettings as any,
      lastUpdated: new Date(),
      environment: settings[0]?.environment || process.env.NODE_ENV || 'production',
      version: '1.0.0',
    };
  }

  /**
   * Public method to validate a setting value
   */
  async validateSetting(key: string, value: any): Promise<void> {
    await this.validationService.validateSetting(key, value);
  }

  private async invalidateSettingCache(key: string, environment?: string): Promise<void> {
    const env = environment || process.env.NODE_ENV || 'production';
    const keys = [`setting:${key}:${env}`, `platform_settings:${env}`, 'platform_settings:*'];

    await Promise.all(keys.map((k) => this.cacheService.del(k)));
  }

  private async validateUserPermissions(userId: string, category: SettingCategory): Promise<void> {
    // For now, we'll implement basic permission checking
    // In a real implementation, this would integrate with your user service
    this.logger.debug(`Validating permissions for user ${userId} on category ${category}`);

    // Basic permission check - in production this would be more sophisticated
    // For now, we'll allow all operations for admin users
    // This is a placeholder for proper RBAC implementation
  }
}
