import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './modules/users/entities/user.entity';
import { Merchant } from './modules/merchants/entities/merchant.entity';
import { PaymentConfig } from './modules/payments/entities/payment-config.entity';
import {
  MerchantSettings,
  SettingType,
} from './modules/merchants/entities/merchant-settings.entity';

async function seedAllData() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get repositories
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const merchantRepository = app.get<Repository<Merchant>>(getRepositoryToken(Merchant));
  const paymentConfigRepository = app.get<Repository<PaymentConfig>>(
    getRepositoryToken(PaymentConfig),
  );
  const merchantSettingsRepository = app.get<Repository<MerchantSettings>>(
    getRepositoryToken(MerchantSettings),
  );

  console.log('🚀 Starting complete database seeding...');

  // ========== STEP 1: Create Demo Users ==========
  console.log('\n📝 STEP 1: Creating demo users...');

  const demoUsers = [
    {
      email: 'customer@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
      name: 'Demo Customer',
      role: UserRole.CUSTOMER,
      creditLimit: 5000,
      availableCredit: 5000,
      phone: '+1234567890',
      dateOfBirth: new Date('1990-01-01'),
      address: '123 Demo St, Demo City, DC 12345',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'merchant@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
      name: 'Demo Merchant',
      role: UserRole.MERCHANT,
      creditLimit: 10000,
      availableCredit: 10000,
      phone: '+1234567891',
      dateOfBirth: new Date('1985-01-01'),
      address: '456 Business Ave, Demo City, DC 12345',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'admin@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
      name: 'Demo Admin',
      role: UserRole.ADMIN,
      creditLimit: 25000,
      availableCredit: 25000,
      phone: '+1234567892',
      dateOfBirth: new Date('1980-01-01'),
      address: '789 Admin Plaza, Demo City, DC 12345',
      isActive: true,
      emailVerified: true,
    },
  ];

  for (const userData of demoUsers) {
    try {
      const existingUser = await userRepository.findOne({ where: { email: userData.email } });
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, updating...`);
        await userRepository.update({ email: userData.email }, userData);
        console.log(`🔄 Updated user: ${userData.email} (${userData.role})`);
      } else {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create user ${userData.email}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ========== STEP 2: Create Demo Merchant ==========
  console.log('\n🏪 STEP 2: Creating demo merchant...');

  const demoMerchant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Demo Electronics Store',
    email: 'store@demo.com',
    businessName: 'Demo Electronics Store LLC',
    businessType: 'Electronics Retail',
    businessAddress: '456 Business Ave, Demo City, DC 12345',
    businessPhone: '+1234567891',
    feePercentage: 2.5,
    isActive: true,
    apiKey: 'demo_api_key_12345',
    webhookUrl: 'https://demo-merchant.com/webhook',
    currency: 'USD',
    timezone: 'America/New_York',
  };

  try {
    const existingMerchant = await merchantRepository.findOne({ where: { id: demoMerchant.id } });
    if (existingMerchant) {
      console.log(`⚠️  Merchant ${demoMerchant.name} already exists, updating...`);
      await merchantRepository.update({ id: demoMerchant.id }, demoMerchant);
      console.log(`🔄 Updated merchant: ${demoMerchant.name}`);
    } else {
      const merchant = merchantRepository.create(demoMerchant);
      await merchantRepository.save(merchant);
      console.log(`✅ Created merchant: ${demoMerchant.name}`);
    }
  } catch (error) {
    console.error(
      `❌ Failed to create merchant:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ========== STEP 3: Create Payment Configurations ==========
  console.log('\n💳 STEP 3: Creating payment configurations...');

  const defaultPaymentConfigs = [
    {
      key: 'default',
      value: JSON.stringify({
        paymentInterval: 'biweekly',
        gracePeriodDays: 3,
        lateFeeAmount: 25,
        maxRetries: 3,
        interestRate: 0.0,
        enableEarlyPayment: true,
        enableAutoRetry: true,
        enableNotifications: true,
      }),
      description: 'Default payment configuration for the platform',
      isActive: true,
    },
    {
      key: 'payment_intervals',
      value: JSON.stringify(['weekly', 'biweekly', 'monthly']),
      description: 'Available payment intervals for customers',
      isActive: true,
    },
    {
      key: 'max_payment_amount',
      value: '10000',
      description: 'Maximum payment amount allowed per transaction',
      isActive: true,
    },
    {
      key: 'min_payment_amount',
      value: '10',
      description: 'Minimum payment amount required per transaction',
      isActive: true,
    },
    {
      key: 'late_fee_enabled',
      value: 'true',
      description: 'Enable late fees for overdue payments',
      isActive: true,
    },
    {
      key: 'late_fee_amount',
      value: '25',
      description: 'Default late fee amount in dollars',
      isActive: true,
    },
    {
      key: 'grace_period_days',
      value: '3',
      description: 'Grace period in days before applying late fees',
      isActive: true,
    },
    {
      key: 'max_retry_attempts',
      value: '3',
      description: 'Maximum number of retry attempts for failed payments',
      isActive: true,
    },
    {
      key: 'retry_delay_hours',
      value: '24',
      description: 'Delay in hours between payment retry attempts',
      isActive: true,
    },
    {
      key: 'early_payment_discount',
      value: '0.05',
      description: 'Early payment discount percentage (5%)',
      isActive: true,
    },
    {
      key: 'early_payment_enabled',
      value: 'true',
      description: 'Enable early payment feature',
      isActive: true,
    },
    {
      key: 'notification_enabled',
      value: 'true',
      description: 'Enable payment notifications',
      isActive: true,
    },
    {
      key: 'notification_days_before',
      value: '3',
      description: 'Days before due date to send payment reminders',
      isActive: true,
    },
    {
      key: 'fraud_detection_enabled',
      value: 'true',
      description: 'Enable fraud detection for payments',
      isActive: true,
    },
    {
      key: 'credit_check_enabled',
      value: 'true',
      description: 'Enable credit check for new customers',
      isActive: true,
    },
    {
      key: 'platform_fee_percentage',
      value: '2.5',
      description: 'Platform fee percentage charged to merchants',
      isActive: true,
    },
    {
      key: 'payment_methods_enabled',
      value: JSON.stringify(['card', 'bank_transfer', 'digital_wallet']),
      description: 'Enabled payment methods',
      isActive: true,
    },
    {
      key: 'webhook_retry_max',
      value: '5',
      description: 'Maximum webhook retry attempts',
      isActive: true,
    },
    {
      key: 'webhook_retry_delay',
      value: '60',
      description: 'Webhook retry delay in seconds',
      isActive: true,
    },
    {
      key: 'stripe_webhook_secret',
      value: process.env.STRIPE_WEBHOOK_SECRET,
      description: 'Stripe webhook endpoint secret',
      isActive: true,
    },
    {
      key: 'currency_default',
      value: 'USD',
      description: 'Default currency for transactions',
      isActive: true,
    },
  ];

  for (const configData of defaultPaymentConfigs) {
    try {
      const existingConfig = await paymentConfigRepository.findOne({
        where: { key: configData.key },
      });
      if (existingConfig) {
        console.log(`⚠️  Config '${configData.key}' already exists, updating...`);
        await paymentConfigRepository.update({ key: configData.key }, configData);
        console.log(`🔄 Updated config: ${configData.key}`);
      } else {
        const config = paymentConfigRepository.create(configData);
        await paymentConfigRepository.save(config);
        console.log(`✅ Created config: ${configData.key}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create config '${configData.key}':`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ========== STEP 4: Create Merchant Settings ==========
  console.log('\n⚙️  STEP 4: Creating merchant settings...');

  const defaultMerchantSettings = [
    // Payment Settings
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.PAYMENT,
      settingKey: 'payment_interval',
      settingValue: 'biweekly',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.PAYMENT,
      settingKey: 'grace_period_days',
      settingValue: '3',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.PAYMENT,
      settingKey: 'late_fee_amount',
      settingValue: '25',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.PAYMENT,
      settingKey: 'max_retries',
      settingValue: '3',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.PAYMENT,
      settingKey: 'early_payment_discount',
      settingValue: '0.05',
    },
    // Notification Settings
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.NOTIFICATION,
      settingKey: 'email_notifications',
      settingValue: 'true',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.NOTIFICATION,
      settingKey: 'sms_notifications',
      settingValue: 'false',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.NOTIFICATION,
      settingKey: 'webhook_url',
      settingValue: 'https://demo-merchant.com/webhook',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.NOTIFICATION,
      settingKey: 'send_daily_reports',
      settingValue: 'true',
    },
    // Security Settings
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.SECURITY,
      settingKey: 'require_2fa',
      settingValue: 'false',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.SECURITY,
      settingKey: 'api_key',
      settingValue: 'demo_api_key_12345',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.SECURITY,
      settingKey: 'webhook_secret',
      settingValue: 'demo_webhook_secret_12345',
    },
    // Store Settings
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.STORE,
      settingKey: 'store_name',
      settingValue: 'Demo Electronics Store',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.STORE,
      settingKey: 'store_url',
      settingValue: 'https://demo-electronics.com',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.STORE,
      settingKey: 'return_policy_days',
      settingValue: '30',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.STORE,
      settingKey: 'customer_service_email',
      settingValue: 'support@demo-electronics.com',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      settingType: SettingType.STORE,
      settingKey: 'business_hours',
      settingValue: 'Mon-Fri 9:00 AM - 6:00 PM EST',
    },
  ];

  for (const settingData of defaultMerchantSettings) {
    try {
      const existingSetting = await merchantSettingsRepository.findOne({
        where: {
          merchantId: settingData.merchantId,
          settingType: settingData.settingType,
          settingKey: settingData.settingKey,
        },
      });

      if (existingSetting) {
        console.log(`⚠️  Setting '${settingData.settingKey}' already exists, updating...`);
        await merchantSettingsRepository.update(
          {
            merchantId: settingData.merchantId,
            settingType: settingData.settingType,
            settingKey: settingData.settingKey,
          },
          settingData,
        );
        console.log(`🔄 Updated setting: ${settingData.settingKey}`);
      } else {
        const setting = merchantSettingsRepository.create(settingData);
        await merchantSettingsRepository.save(setting);
        console.log(`✅ Created setting: ${settingData.settingKey}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create setting '${settingData.settingKey}':`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ========== COMPLETION ==========
  console.log('\n🎉 Complete database seeding finished!');
  console.log('\n📋 Summary of seeded data:');
  console.log('👥 USERS:');
  console.log('   • customer@demo.com / password123 (Customer)');
  console.log('   • merchant@demo.com / password123 (Merchant)');
  console.log('   • admin@demo.com / password123 (Admin)');
  console.log('\n🏪 MERCHANTS:');
  console.log('   • Demo Electronics Store (ID: 123e4567-e89b-12d3-a456-426614174000)');
  console.log('\n💳 PAYMENT CONFIGS:');
  console.log(`   • ${defaultPaymentConfigs.length} platform-wide payment configurations`);
  console.log('   • Default payment config with biweekly intervals');
  console.log('   • Fraud detection and credit check settings');
  console.log('   • Fee structures and retry policies');
  console.log('\n⚙️  MERCHANT SETTINGS:');
  console.log(`   • ${defaultMerchantSettings.length} merchant-specific settings`);
  console.log('   • Payment, notification, security, and store configurations');
  console.log('\n🚀 Your ScalaPay demo environment is ready!');

  await app.close();
}

seedAllData().catch((error) => {
  console.error('❌ Complete seeding failed:', error);
  process.exit(1);
});
