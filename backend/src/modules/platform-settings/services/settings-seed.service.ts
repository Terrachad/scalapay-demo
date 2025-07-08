import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting, SettingCategory, SettingDataType, Environment } from '../entities/platform-setting.entity';
import { PlatformSettingSchema } from '../entities/platform-setting-schema.entity';
import { DEFAULT_PLATFORM_SETTINGS, SETTING_FIELD_METADATA } from '../../../shared/platform-settings.types';

@Injectable()
export class SettingsSeedService {
  private readonly logger = new Logger(SettingsSeedService.name);

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
    @InjectRepository(PlatformSettingSchema)
    private readonly schemaRepository: Repository<PlatformSettingSchema>,
  ) {}

  /**
   * Seed default platform settings for all environments
   */
  async seedDefaultSettings(): Promise<void> {
    try {
      this.logger.log('Starting platform settings seeding...');

      // Seed settings for each environment
      for (const env of Object.values(Environment)) {
        await this.seedSettingsForEnvironment(env);
      }

      // Seed schema metadata
      await this.seedSchema();

      this.logger.log('Platform settings seeding completed successfully');
    } catch (error) {
      this.logger.error('Error seeding platform settings:', error);
      throw error;
    }
  }

  /**
   * Seed settings for a specific environment
   */
  private async seedSettingsForEnvironment(environment: Environment): Promise<void> {
    this.logger.log(`Seeding settings for environment: ${environment}`);

    for (const [key, defaultValue] of Object.entries(DEFAULT_PLATFORM_SETTINGS)) {
      try {
        // Check if setting already exists
        const existingSetting = await this.settingsRepository.findOne({
          where: { key, environment }
        });

        const metadata = SETTING_FIELD_METADATA.find((m: any) => m.key === key);
        if (!metadata) {
          this.logger.warn(`No metadata found for setting: ${key}`);
          continue;
        }

        if (existingSetting) {
          // Update existing setting if value is empty or null
          if (!existingSetting.value || existingSetting.value === '' || existingSetting.value === 'null') {
            existingSetting.value = this.serializeValue(defaultValue, metadata.dataType);
            existingSetting.category = metadata.category;
            existingSetting.dataType = metadata.dataType;
            existingSetting.description = metadata.description;
            existingSetting.isEncrypted = metadata.dataType === SettingDataType.ENCRYPTED_STRING;
            existingSetting.requiresRestart = false;
            existingSetting.updatedAt = new Date();

            await this.settingsRepository.save(existingSetting);
            this.logger.log(`Updated empty setting: ${key} = ${defaultValue}`);
          }
        } else {
          // Create new setting
          const newSetting = this.settingsRepository.create({
            key,
            value: this.serializeValue(defaultValue, metadata.dataType),
            category: metadata.category,
            dataType: metadata.dataType,
            description: metadata.description,
            isEncrypted: metadata.dataType === SettingDataType.ENCRYPTED_STRING,
            requiresRestart: false,
            environment,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await this.settingsRepository.save(newSetting);
          this.logger.log(`Created new setting: ${key} = ${defaultValue}`);
        }
      } catch (error) {
        this.logger.error(`Error seeding setting ${key}:`, error);
      }
    }
  }

  /**
   * Seed schema metadata
   */
  private async seedSchema(): Promise<void> {
    this.logger.log('Seeding settings schema metadata...');

    for (const metadata of SETTING_FIELD_METADATA) {
      try {
        // Check if schema already exists
        const existingSchema = await this.schemaRepository.findOne({
          where: { key: metadata.key }
        });

        if (!existingSchema) {
          const newSchema = this.schemaRepository.create({
            key: metadata.key,
            category: metadata.category,
            dataType: metadata.dataType,
            validationRules: [{ type: 'custom', message: 'Validation rules', customValidator: JSON.stringify(metadata.validation) }],
            defaultValue: DEFAULT_PLATFORM_SETTINGS[metadata.key as keyof typeof DEFAULT_PLATFORM_SETTINGS],
            description: metadata.description,
            isRequired: metadata.required,
            isEncrypted: metadata.dataType === SettingDataType.ENCRYPTED_STRING,
            requiresRestart: false,
            isUserConfigurable: true,
            minimumRole: 'ADMIN' as any,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await this.schemaRepository.save(newSchema);
          this.logger.log(`Created schema for: ${metadata.key}`);
        }
      } catch (error) {
        this.logger.error(`Error seeding schema for ${metadata.key}:`, error);
      }
    }
  }

  /**
   * Serialize value based on data type
   */
  private serializeValue(value: any, dataType: SettingDataType): string {
    switch (dataType) {
      case SettingDataType.JSON:
      case SettingDataType.ARRAY:
        return JSON.stringify(value);
      case SettingDataType.BOOLEAN:
        return String(Boolean(value));
      case SettingDataType.NUMBER:
      case SettingDataType.PERCENTAGE:
      case SettingDataType.CURRENCY:
        return String(Number(value));
      case SettingDataType.DATE:
        return value instanceof Date ? value.toISOString() : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Verify all settings are properly seeded
   */
  async verifySettings(environment: Environment = Environment.DEVELOPMENT): Promise<boolean> {
    try {
      this.logger.log(`Verifying settings for environment: ${environment}`);

      const expectedKeys = Object.keys(DEFAULT_PLATFORM_SETTINGS);
      const existingSettings = await this.settingsRepository.find({
        where: { environment, isActive: true }
      });

      const existingKeys = existingSettings.map(s => s.key);
      const missingKeys = expectedKeys.filter(key => !existingKeys.includes(key));
      const emptySettings = existingSettings.filter(s => !s.value || s.value === '' || s.value === 'null');

      if (missingKeys.length > 0) {
        this.logger.warn(`Missing settings: ${missingKeys.join(', ')}`);
        return false;
      }

      if (emptySettings.length > 0) {
        this.logger.warn(`Empty settings: ${emptySettings.map(s => s.key).join(', ')}`);
        return false;
      }

      this.logger.log(`All ${existingSettings.length} settings verified successfully`);
      return true;
    } catch (error) {
      this.logger.error('Error verifying settings:', error);
      return false;
    }
  }

  /**
   * Reset all settings to defaults for an environment
   */
  async resetToDefaults(environment: Environment = Environment.DEVELOPMENT): Promise<void> {
    try {
      this.logger.log(`Resetting all settings to defaults for environment: ${environment}`);

      // Delete existing settings for the environment
      await this.settingsRepository.delete({ environment });

      // Re-seed with defaults
      await this.seedSettingsForEnvironment(environment);

      this.logger.log('Settings reset to defaults successfully');
    } catch (error) {
      this.logger.error('Error resetting settings to defaults:', error);
      throw error;
    }
  }
}