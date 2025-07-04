import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PaymentConfigService } from './modules/payments/services/payment-config.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentConfigService = app.get(PaymentConfigService);

  console.log('🌱 Starting seeder...');

  // Essential payment configurations
  const configs = [
    {
      key: 'merchant_fee_rate',
      value: '2.5',
      description: 'Default merchant fee rate percentage per transaction',
      isActive: true,
    },
    {
      key: 'late_payment_fee',
      value: '25.00',
      description: 'Late payment fee in dollars applied after 7 days past due',
      isActive: true,
    },
    {
      key: 'default_credit_limit',
      value: '5000.00',
      description: 'Default credit limit for new customer accounts',
      isActive: true,
    },
    {
      key: 'max_transaction_amount',
      value: '10000.00',
      description: 'Maximum single transaction limit',
      isActive: true,
    },
    {
      key: 'default',
      value: JSON.stringify({
        paymentInterval: 'biweekly',
        gracePeriodDays: 7,
        lateFeeAmount: 25,
        maxRetries: 3,
        interestRate: 0.0,
        enableEarlyPayment: true,
        enableAutoRetry: true,
        enableNotifications: true,
        merchantFeeRate: 2.5,
        defaultCreditLimit: 5000,
        maxTransactionAmount: 10000,
      }),
      description: 'Default payment configuration for all transactions',
      isActive: true,
    },
  ];

  for (const config of configs) {
    try {
      // Check if config exists
      const existing = await paymentConfigService.getConfigByKey(config.key);
      if (existing) {
        console.log(`⚠️  Config ${config.key} already exists, skipping`);
        continue;
      }
    } catch (error) {
      // Config doesn't exist, continue with creation
    }

    try {
      await paymentConfigService.createConfig(config);
      console.log(`✅ Created config: ${config.key}`);
    } catch (error) {
      console.error(
        `❌ Failed to create config ${config.key}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log('🎉 Seeder completed!');
  await app.close();
}

seed().catch((error) => {
  console.error('❌ Seeder failed:', error);
  process.exit(1);
});
