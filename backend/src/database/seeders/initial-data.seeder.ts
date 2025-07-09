import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import {
  PlatformSetting,
  SettingCategory,
  SettingDataType,
  Environment,
} from '../../modules/platform-settings/entities/platform-setting.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class InitialDataSeeder {
  private readonly logger = new Logger(InitialDataSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
    private readonly dataSource: DataSource,
  ) {}

  async seed(): Promise<void> {
    try {
      // Check if users already exist
      const userCount = await this.userRepository.count();
      if (userCount > 0) {
        this.logger.log('Users already exist, skipping user seeding');

        // Still try to seed platform settings if they don't exist
        this.logger.log('⚙️ Checking platform settings...');
        try {
          await this.seedPlatformSettings();
          this.logger.log('✅ Platform settings check/seeding completed');
        } catch (error) {
          this.logger.warn(
            '⚠️ Platform settings seeding failed:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
        return;
      }

      this.logger.log('🌱 Starting initial data seeding...');

      // Create enterprise demo users
      const demoUsers = [
        {
          email: 'admin@demo.com',
          password: await bcrypt.hash('password123', 12),
          name: 'System Administrator',
          role: UserRole.ADMIN,
          creditLimit: 50000,
          availableCredit: 50000,
          isActive: true,
        },
        {
          email: 'customer@demo.com',
          password: await bcrypt.hash('password123', 12),
          name: 'Demo Customer',
          role: UserRole.CUSTOMER,
          creditLimit: 5000,
          availableCredit: 5000,
          isActive: true,
          phone: '+1-555-0123',
          address: '123 Demo Street, Demo City, DC 12345',
          notificationPreferences: {
            email: true,
            sms: false,
            push: true,
            paymentReminders: true,
            transactionUpdates: true,
            promotional: false,
          },
          securityPreferences: {
            twoFactorEnabled: false,
            sessionTimeout: 30,
            loginNotifications: true,
            deviceVerification: false,
          },
        },
        {
          email: 'merchant@demo.com',
          password: await bcrypt.hash('password123', 12),
          name: 'Demo Merchant',
          role: UserRole.MERCHANT,
          creditLimit: 25000,
          availableCredit: 25000,
          isActive: true,
          businessName: 'Demo Merchant LLC',
          businessAddress: '456 Business Ave, Commerce City, CC 67890',
          businessPhone: '+1-555-0456',
          riskScore: 2.5,
          approvedAt: new Date(),
          approvedBy: 'system',
          approvalNotes: 'Auto-approved demo merchant for testing',
        },
        {
          email: 'enterprise@scalapay.com',
          password: await bcrypt.hash('password123', 12),
          name: 'Enterprise Customer',
          role: UserRole.CUSTOMER,
          creditLimit: 100000,
          availableCredit: 100000,
          isActive: true,
          phone: '+1-555-0789',
          address: '789 Enterprise Blvd, Corporate City, CP 54321',
          notificationPreferences: {
            email: true,
            sms: true,
            push: true,
            paymentReminders: true,
            transactionUpdates: true,
            promotional: true,
          },
          securityPreferences: {
            twoFactorEnabled: true,
            sessionTimeout: 15,
            loginNotifications: true,
            deviceVerification: true,
          },
        },
        {
          email: 'inactive@demo.com',
          password: await bcrypt.hash('password123', 12),
          name: 'Inactive User',
          role: UserRole.CUSTOMER,
          creditLimit: 1000,
          availableCredit: 1000,
          isActive: false,
        },
      ];

      // Create users
      for (const userData of demoUsers) {
        const user = this.userRepository.create(userData);
        await this.userRepository.save(user);
        this.logger.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }

      this.logger.log('🎉 Initial data seeding completed successfully!');
      this.logger.log('📋 Demo Users Created:');
      this.logger.log('   👑 Admin: admin@demo.com / password123');
      this.logger.log('   👤 Customer: customer@demo.com / password123');
      this.logger.log('   🏪 Merchant: merchant@demo.com / password123');
      this.logger.log('   🏢 Enterprise: enterprise@scalapay.com / password123');
      this.logger.log('   ❌ Inactive: inactive@demo.com / password123');

      // Seed platform settings
      this.logger.log('⚙️ Seeding platform settings...');
      try {
        await this.seedPlatformSettings();
        this.logger.log('✅ Platform settings seeded successfully');
      } catch (error) {
        this.logger.warn(
          '⚠️ Platform settings seeding failed (may be normal):',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    } catch (error) {
      this.logger.error('❌ Initial data seeding failed:', error);
      throw error;
    }
  }

  private async seedPlatformSettings(): Promise<void> {
    try {
      // Check if settings already exist
      const settingsCount = await this.settingsRepository.count();
      if (settingsCount > 0) {
        this.logger.log('Platform settings already exist, skipping seeding');
        return;
      }

      this.logger.log(`Found ${settingsCount} existing settings, proceeding with seeding...`);
    } catch (error) {
      this.logger.error(
        'Platform settings table access error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Don't return here - try to seed anyway in case table exists but query failed
      this.logger.log('Attempting to seed settings despite error...');
    }

    // Create default settings for all environments
    const environments = [Environment.DEVELOPMENT, Environment.STAGING, Environment.PRODUCTION];

    for (const environment of environments) {
      const defaultSettings = [
        {
          key: 'platformName',
          value: 'ScalaPay',
          category: SettingCategory.GENERAL,
          dataType: SettingDataType.STRING,
        },
        {
          key: 'supportEmail',
          value: 'support@scalapay.com',
          category: SettingCategory.GENERAL,
          dataType: SettingDataType.EMAIL,
        },
        {
          key: 'defaultCurrency',
          value: 'USD',
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.CURRENCY,
        },
        {
          key: 'timeZone',
          value: 'UTC',
          category: SettingCategory.GENERAL,
          dataType: SettingDataType.STRING,
        },
        {
          key: 'defaultCreditLimit',
          value: environment === Environment.PRODUCTION ? 1000 : 500,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'maxCreditLimit',
          value: environment === Environment.PRODUCTION ? 10000 : 5000,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'maxTransactionAmount',
          value: environment === Environment.PRODUCTION ? 5000 : 2500,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'merchantFeeRate',
          value: 2.9,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.PERCENTAGE,
        },
        {
          key: 'lateFeeAmount',
          value: 25,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'paymentInterval',
          value: 'biweekly',
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.STRING,
        },
        {
          key: 'gracePeriodDays',
          value: 7,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'maxRetries',
          value: 3,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'interestRate',
          value: 0.0,
          category: SettingCategory.FINANCIAL,
          dataType: SettingDataType.PERCENTAGE,
        },
        {
          key: 'requireTwoFactor',
          value: environment === Environment.PRODUCTION,
          category: SettingCategory.SECURITY,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'sessionTimeoutMinutes',
          value: environment === Environment.PRODUCTION ? 30 : 60,
          category: SettingCategory.SECURITY,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'passwordExpiryDays',
          value: 90,
          category: SettingCategory.SECURITY,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'maxLoginAttempts',
          value: 5,
          category: SettingCategory.SECURITY,
          dataType: SettingDataType.NUMBER,
        },
        {
          key: 'enableEmailNotifications',
          value: true,
          category: SettingCategory.NOTIFICATIONS,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'enableSMSNotifications',
          value: false,
          category: SettingCategory.NOTIFICATIONS,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'enableWebhookNotifications',
          value: true,
          category: SettingCategory.NOTIFICATIONS,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'enableAutoApproval',
          value: environment !== Environment.PRODUCTION,
          category: SettingCategory.FEATURES,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'enableEarlyPayment',
          value: true,
          category: SettingCategory.FEATURES,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'enableFraudDetection',
          value: true,
          category: SettingCategory.FEATURES,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'requireMerchantApproval',
          value: true,
          category: SettingCategory.FEATURES,
          dataType: SettingDataType.BOOLEAN,
        },
        {
          key: 'maintenanceMode',
          value: false,
          category: SettingCategory.FEATURES,
          dataType: SettingDataType.BOOLEAN,
        },
      ];

      for (const settingData of defaultSettings) {
        try {
          const setting = this.settingsRepository.create({
            ...settingData,
            environment,
            description: `Default ${settingData.key} setting for ${environment}`,
            isEncrypted: false,
            requiresRestart: false,
            isActive: true,
          });

          await this.settingsRepository.save(setting);
          this.logger.log(
            `✅ Created setting: ${settingData.key} = ${settingData.value} (${environment})`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to create setting ${settingData.key} for ${environment}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }
    }
  }
}
