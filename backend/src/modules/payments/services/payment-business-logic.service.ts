import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlatformSetting,
  SettingCategory,
  Environment,
} from '../../platform-settings/entities/platform-setting.entity';
import { MerchantSettings } from '../../merchants/entities/merchant-settings.entity';
import { PlatformSettingsService } from '../../platform-settings/services/platform-settings.service';

/**
 * PaymentBusinessLogicService
 *
 * Handles payment-specific business logic that doesn't belong in generic platform settings.
 * This service provides enterprise-grade payment business methods while maintaining
 * separation of concerns from configuration management.
 */
@Injectable()
export class PaymentBusinessLogicService {
  private readonly logger = new Logger(PaymentBusinessLogicService.name);

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly platformSettingRepository: Repository<PlatformSetting>,
    @InjectRepository(MerchantSettings)
    private readonly merchantSettingsRepository: Repository<MerchantSettings>,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  /**
   * Get configuration value by key with fallback to defaults
   */
  async getConfigValue(key: string, environment: string = 'production'): Promise<string | null> {
    try {
      const env = environment as Environment;
      const setting = await this.platformSettingRepository.findOne({
        where: { key, environment: env, isActive: true },
      });

      if (setting) {
        return setting.value;
      }

      // Fallback to default payment configuration values
      const defaultValues: Record<string, string> = {
        'default.payment.interval': 'biweekly',
        'default.grace.period.days': '7',
        'default.late.fee.amount': '25.00',
        'default.max.retries': '3',
        late_fee_amount: '25.00',
        payment_methods_enabled: 'card,bank_transfer',
        fraud_detection_enabled: 'true',
        credit_check_enabled: 'true',
      };

      return defaultValues[key] || null;
    } catch (error) {
      this.logger.error(`Failed to get config value for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Get configuration by key with full setting object
   */
  async getConfigByKey(
    key: string,
    environment: string = 'production',
  ): Promise<PlatformSetting | null> {
    try {
      const env = environment as Environment;
      return await this.platformSettingRepository.findOne({
        where: { key, environment: env, isActive: true },
      });
    } catch (error) {
      this.logger.error(`Failed to get config by key: ${key}`, error);
      return null;
    }
  }

  /**
   * Check if a feature is enabled based on configuration
   */
  async isFeatureEnabled(featureKey: string, environment: string = 'production'): Promise<boolean> {
    try {
      const value = await this.getConfigValue(featureKey, environment);
      return value === 'true' || value === '1' || value === 'enabled';
    } catch (error) {
      this.logger.error(`Failed to check feature status for: ${featureKey}`, error);
      return false;
    }
  }

  /**
   * Get merchant-specific configuration with fallback to global settings
   */
  async getConfigForMerchant(merchantId: string): Promise<Record<string, any>> {
    try {
      // Get merchant-specific settings
      const merchantSettings = await this.merchantSettingsRepository.find({
        where: { merchantId },
      });

      const config: Record<string, any> = {};

      // Convert merchant settings to config object
      for (const setting of merchantSettings) {
        config[setting.settingKey] = setting.settingValue;
      }

      // Add global platform settings as fallbacks
      const globalSettings = await this.platformSettingRepository.find({
        where: {
          category: SettingCategory.FINANCIAL,
          isActive: true,
        },
      });

      for (const setting of globalSettings) {
        if (!config[setting.key]) {
          config[setting.key] = setting.value;
        }
      }

      // Ensure required payment configuration defaults
      const defaults = {
        paymentInterval: 'biweekly',
        gracePeriod: 7,
        lateFeeAmount: 25.0,
        maxRetries: 3,
        interestRate: 0.0,
        creditLimit: 1000.0,
      };

      for (const [key, defaultValue] of Object.entries(defaults)) {
        if (!config[key]) {
          config[key] = defaultValue;
        }
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get config for merchant: ${merchantId}`, error);
      // Return safe defaults
      return {
        paymentInterval: 'biweekly',
        gracePeriod: 7,
        lateFeeAmount: 25.0,
        maxRetries: 3,
        interestRate: 0.0,
        creditLimit: 1000.0,
      };
    }
  }

  /**
   * Get all payment configurations
   */
  async getAllConfigs(environment: string = 'production'): Promise<PlatformSetting[]> {
    try {
      const env = environment as Environment;
      return await this.platformSettingRepository.find({
        where: {
          environment: env,
          isActive: true,
          category: SettingCategory.FINANCIAL,
        },
        order: { key: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to get all payment configs', error);
      return [];
    }
  }

  /**
   * Calculate due date for payment installment
   */
  calculateDueDate(installmentNumber: number, baseDate: Date, paymentInterval: string): Date {
    const dueDate = new Date(baseDate);

    switch (paymentInterval) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + installmentNumber * 7);
        break;
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + installmentNumber * 14);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + installmentNumber);
        break;
      default:
        // Default to biweekly
        dueDate.setDate(dueDate.getDate() + installmentNumber * 14);
    }

    return dueDate;
  }

  /**
   * Get human-readable description of payment interval
   */
  getIntervalDescription(config: Record<string, any>): string {
    const interval = config.paymentInterval || 'biweekly';

    const descriptions: Record<string, string> = {
      weekly: 'Every week',
      biweekly: 'Every 2 weeks',
      monthly: 'Every month',
      quarterly: 'Every 3 months',
      semiannual: 'Every 6 months',
      annual: 'Every year',
    };

    return descriptions[interval] || `Every ${interval}`;
  }

  /**
   * Validate payment configuration values
   */
  async validatePaymentConfig(config: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate payment interval
    const validIntervals = ['weekly', 'biweekly', 'monthly', 'quarterly'];
    if (config.paymentInterval && !validIntervals.includes(config.paymentInterval)) {
      errors.push(`Invalid payment interval: ${config.paymentInterval}`);
    }

    // Validate grace period
    if (config.gracePeriod !== undefined) {
      const gracePeriod = Number(config.gracePeriod);
      if (isNaN(gracePeriod) || gracePeriod < 0 || gracePeriod > 30) {
        errors.push('Grace period must be between 0 and 30 days');
      }
    }

    // Validate late fee amount
    if (config.lateFeeAmount !== undefined) {
      const lateFee = Number(config.lateFeeAmount);
      if (isNaN(lateFee) || lateFee < 0) {
        errors.push('Late fee amount must be a positive number');
      } else if (lateFee > 100) {
        warnings.push('Late fee amount seems high (>$100)');
      }
    }

    // Validate max retries
    if (config.maxRetries !== undefined) {
      const maxRetries = Number(config.maxRetries);
      if (isNaN(maxRetries) || maxRetries < 1 || maxRetries > 10) {
        errors.push('Max retries must be between 1 and 10');
      }
    }

    // Validate interest rate
    if (config.interestRate !== undefined) {
      const interestRate = Number(config.interestRate);
      if (isNaN(interestRate) || interestRate < 0 || interestRate > 1) {
        errors.push('Interest rate must be between 0 and 1 (0-100%)');
      }
    }

    // Validate credit limit
    if (config.creditLimit !== undefined) {
      const creditLimit = Number(config.creditLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        errors.push('Credit limit must be a positive number');
      } else if (creditLimit > 50000) {
        warnings.push('Credit limit seems high (>$50,000)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
