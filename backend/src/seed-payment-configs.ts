import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentConfig } from './modules/payments/entities/payment-config.entity';
import {
  MerchantSettings,
  SettingType,
} from './modules/merchants/entities/merchant-settings.entity';

async function seedPaymentConfigs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentConfigRepository = app.get<Repository<PaymentConfig>>(
    getRepositoryToken(PaymentConfig),
  );
  const merchantSettingsRepository = app.get<Repository<MerchantSettings>>(
    getRepositoryToken(MerchantSettings),
  );

  console.log('🔄 Seeding payment configurations...');

  // Default payment configuration settings
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
      key: 'stripe_webhook_secret',
      value: process.env.STRIPE_WEBHOOK_SECRET,
      description: 'Stripe webhook endpoint secret',
      isActive: true,
    },
    {
      key: 'payment_methods_enabled',
      value: JSON.stringify(['card', 'bank_transfer', 'digital_wallet']),
      description: 'Enabled payment methods',
      isActive: true,
    },
  ];

  // Seed payment configurations
  for (const configData of defaultPaymentConfigs) {
    try {
      const existingConfig = await paymentConfigRepository.findOne({
        where: { key: configData.key },
      });
      if (existingConfig) {
        console.log(`⚠️  Payment config '${configData.key}' already exists, updating...`);
        await paymentConfigRepository.update({ key: configData.key }, configData);
        console.log(`🔄 Updated payment config: ${configData.key}`);
      } else {
        const config = paymentConfigRepository.create(configData);
        await paymentConfigRepository.save(config);
        console.log(`✅ Created payment config: ${configData.key}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create/update payment config '${configData.key}':`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log('🔄 Seeding default admin/merchant settings...');

  // Default merchant settings for the demo merchant
  const defaultMerchantSettings = [
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000', // Demo merchant ID
      type: 'payment',
      key: 'payment_interval',
      value: 'biweekly',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'payment',
      key: 'grace_period_days',
      value: '3',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'payment',
      key: 'late_fee_amount',
      value: '25',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'payment',
      key: 'max_retries',
      value: '3',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'notification',
      key: 'email_notifications',
      value: 'true',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'notification',
      key: 'sms_notifications',
      value: 'false',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'notification',
      key: 'webhook_url',
      value: 'https://demo-merchant.com/webhook',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'security',
      key: 'require_2fa',
      value: 'false',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'security',
      key: 'api_key',
      value: 'demo_api_key_12345',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'store',
      key: 'store_name',
      value: 'Demo Electronics Store',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'store',
      key: 'store_url',
      value: 'https://demo-electronics.com',
    },
    {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'store',
      key: 'return_policy_days',
      value: '30',
    },
  ];

  // Seed merchant settings
  for (const settingData of defaultMerchantSettings) {
    try {
      const existingSetting = await merchantSettingsRepository.findOne({
        where: {
          merchantId: settingData.merchantId,
          settingType: settingData.type as SettingType,
          settingKey: settingData.key,
        },
      });

      if (existingSetting) {
        console.log(`⚠️  Merchant setting '${settingData.key}' already exists, updating...`);
        await merchantSettingsRepository.update(
          {
            merchantId: settingData.merchantId,
            settingType: settingData.type as SettingType,
            settingKey: settingData.key,
          },
          settingData,
        );
        console.log(`🔄 Updated merchant setting: ${settingData.key}`);
      } else {
        const setting = merchantSettingsRepository.create(settingData);
        await merchantSettingsRepository.save(setting);
        console.log(`✅ Created merchant setting: ${settingData.key}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create/update merchant setting '${settingData.key}':`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log('🎉 Payment configuration seeding completed!');
  console.log('📋 Seeded configurations:');
  console.log('   • Default payment config with biweekly payments');
  console.log('   • Platform settings for fees, limits, and features');
  console.log('   • Merchant-specific settings for Demo Electronics Store');
  console.log('   • Fraud detection and credit check configurations');
  console.log('   • Notification and webhook settings');

  await app.close();
}

seedPaymentConfigs().catch((error) => {
  console.error('❌ Payment config seeding failed:', error);
  process.exit(1);
});
