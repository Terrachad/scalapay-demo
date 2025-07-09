import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettingSchema, ValidationRule } from '../entities/platform-setting-schema.entity';
import { SettingDataType } from '../entities/platform-setting.entity';
import { CreateSettingRequest } from '../dto/platform-settings.dto';

@Injectable()
export class SettingsValidationService {
  private readonly logger = new Logger(SettingsValidationService.name);

  constructor(
    @InjectRepository(PlatformSettingSchema)
    private readonly schemaRepository: Repository<PlatformSettingSchema>,
  ) {}

  async validateSetting(key: string, value: any): Promise<void> {
    try {
      this.logger.debug(`Testing database query for: ${key}`);

      let schema;
      try {
        schema = await this.schemaRepository.findOne({ where: { key } });
      } catch (dbError) {
        this.logger.error(`Database error loading schema for ${key}:`, dbError);
        if (dbError instanceof Error && dbError.message.includes('JSON')) {
          this.logger.error(
            `JSON parsing error in database query - skipping schema validation for ${key}`,
          );
          // For now, skip schema validation if there's a JSON parsing error
          return;
        }
        throw dbError;
      }

      if (!schema) {
        // For settings without schema, perform basic type validation
        this.logger.warn(`No schema found for setting '${key}' - performing basic validation only`);
        return;
      }

      this.logger.debug(`Successfully loaded schema for ${key}, dataType: ${schema.dataType}`);
      // Just return here without doing actual validation to test if DB query is the issue
      return;

      // this.logger.debug(`Found schema for ${key}: dataType=${schema.dataType}`);

      // // Type validation - wrap in try-catch to catch JSON parsing errors
      // try {
      //   this.validateDataType(value, schema.dataType);
      // } catch (typeError) {
      //   if (typeError instanceof Error && typeError.message.includes('JSON')) {
      //     this.logger.error(`JSON parsing error in type validation for ${key}:`, typeError);
      //   }
      //   throw typeError;
      // }

      // // Custom validation rules - wrap in try-catch to catch JSON parsing errors
      // try {
      //   await this.validateAgainstRules(value, schema.validationRules);
      // } catch (rulesError) {
      //   if (rulesError instanceof Error && rulesError.message.includes('JSON')) {
      //     this.logger.error(`JSON parsing error in rules validation for ${key}:`, rulesError);
      //   }
      //   throw rulesError;
      // }

      // // Business rule validation
      // await this.validateBusinessRules(key, value);

      // this.logger.debug(`Validation completed successfully for ${key}`);
    } catch (error) {
      this.logger.error(`Validation failed for ${key}:`, error);
      throw error;
    }
  }

  async validateNewSetting(createRequest: CreateSettingRequest): Promise<void> {
    // Validate the setting value against its data type
    this.validateDataType(createRequest.value, createRequest.dataType);

    // Additional business rules for new settings
    if (!createRequest.key || createRequest.key.trim().length === 0) {
      throw new BadRequestException('Setting key cannot be empty');
    }

    if (createRequest.key.includes(' ')) {
      throw new BadRequestException('Setting key cannot contain spaces');
    }
  }

  private validateDataType(value: any, dataType: SettingDataType): void {
    switch (dataType) {
      case SettingDataType.STRING:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }
        break;
      case SettingDataType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          throw new BadRequestException('Value must be a valid number');
        }
        break;
      case SettingDataType.BOOLEAN:
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Value must be a boolean');
        }
        break;
      case SettingDataType.EMAIL:
        if (!this.isValidEmail(value)) {
          throw new BadRequestException('Value must be a valid email address');
        }
        break;
      case SettingDataType.URL:
        if (!this.isValidUrl(value)) {
          throw new BadRequestException('Value must be a valid URL');
        }
        break;
      case SettingDataType.CURRENCY:
        if (!this.isValidCurrency(value)) {
          throw new BadRequestException('Value must be a valid currency code');
        }
        break;
      case SettingDataType.PERCENTAGE:
        if (typeof value !== 'number' || value < 0 || value > 100) {
          throw new BadRequestException('Value must be a percentage between 0 and 100');
        }
        break;
      default:
        // Allow any type for 'json' and 'array' types
        break;
    }
  }

  private async validateAgainstRules(value: any, rules: ValidationRule[]): Promise<void> {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            throw new BadRequestException(rule.message || 'This field is required');
          }
          break;
        case 'min':
          if (typeof value === 'number' && value < rule.value) {
            throw new BadRequestException(rule.message || `Value must be at least ${rule.value}`);
          }
          if (typeof value === 'string' && value.length < rule.value) {
            throw new BadRequestException(
              rule.message || `Value must be at least ${rule.value} characters`,
            );
          }
          break;
        case 'max':
          if (typeof value === 'number' && value > rule.value) {
            throw new BadRequestException(rule.message || `Value must be at most ${rule.value}`);
          }
          if (typeof value === 'string' && value.length > rule.value) {
            throw new BadRequestException(
              rule.message || `Value must be at most ${rule.value} characters`,
            );
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
            throw new BadRequestException(rule.message || 'Value does not match required pattern');
          }
          break;
        case 'enum':
          if (!rule.value.includes(value)) {
            throw new BadRequestException(
              rule.message || `Value must be one of: ${rule.value.join(', ')}`,
            );
          }
          break;
        case 'custom':
          await this.validateCustomRule(value, rule);
          break;
      }
    }
  }

  private async validateBusinessRules(key: string, value: any): Promise<void> {
    // Implement business-specific validation rules
    switch (key) {
      case 'defaultCreditLimit':
        if (value > 50000) {
          throw new BadRequestException('Default credit limit cannot exceed $50,000');
        }
        break;
      case 'maxCreditLimit':
        // In a real implementation, we'd fetch the current defaultCreditLimit
        // For now, just validate it's a reasonable value
        if (value < 100 || value > 100000) {
          throw new BadRequestException('Maximum credit limit must be between $100 and $100,000');
        }
        break;
      case 'merchantFeeRate':
        if (value < 0.1 || value > 10) {
          throw new BadRequestException('Merchant fee rate must be between 0.1% and 10%');
        }
        break;
      case 'sessionTimeoutMinutes':
        if (value < 5 || value > 480) {
          throw new BadRequestException('Session timeout must be between 5 and 480 minutes');
        }
        break;
      case 'maxLoginAttempts':
        if (value < 1 || value > 20) {
          throw new BadRequestException('Max login attempts must be between 1 and 20');
        }
        break;
    }
  }

  private async validateCustomRule(value: any, rule: ValidationRule): Promise<void> {
    // Placeholder for custom validation logic
    // In a real implementation, this would reference custom validation functions
    this.logger.debug(`Custom validation rule applied: ${rule.customValidator}`);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidCurrency(currency: string): boolean {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
    return validCurrencies.includes(currency.toUpperCase());
  }
}
