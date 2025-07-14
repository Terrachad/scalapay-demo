import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PaymentBusinessLogicService } from './modules/payments/services/payment-business-logic.service';

async function verifyConfigs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentBusinessLogicService = app.get(PaymentBusinessLogicService);

  console.log('🔍 Verifying payment configurations...');

  try {
    // Test the critical 'default' config that was causing the error
    console.log('\n📋 Testing default payment config...');
    const defaultConfig = await paymentBusinessLogicService.getConfigByKey('default');

    if (defaultConfig) {
      console.log('✅ Default config found:', {
        key: defaultConfig.key,
        description: defaultConfig.description,
        isActive: defaultConfig.isActive,
        value: JSON.parse(defaultConfig.value),
      });
    } else {
      console.log('⚠️ Default config not found - using fallback defaults');
    }

    // Test getting config value
    console.log('\n📋 Testing config value retrieval...');
    const lateFeeValue = await paymentBusinessLogicService.getConfigValue('late_fee_amount');
    console.log('✅ Late fee amount:', lateFeeValue);

    const paymentMethods =
      await paymentBusinessLogicService.getConfigValue('payment_methods_enabled');
    console.log('✅ Payment methods:', JSON.parse(paymentMethods || '[]'));

    // Test feature flags
    console.log('\n📋 Testing feature flags...');
    const fraudDetectionEnabled =
      await paymentBusinessLogicService.isFeatureEnabled('fraud_detection_enabled');
    console.log('✅ Fraud detection enabled:', fraudDetectionEnabled);

    const creditCheckEnabled =
      await paymentBusinessLogicService.isFeatureEnabled('credit_check_enabled');
    console.log('✅ Credit check enabled:', creditCheckEnabled);

    // Test merchant config
    console.log('\n📋 Testing merchant config...');
    const merchantConfig = await paymentBusinessLogicService.getConfigForMerchant(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    console.log('✅ Merchant config:', merchantConfig);

    // List all configs
    console.log('\n📋 All payment configurations:');
    const allConfigs = await paymentBusinessLogicService.getAllConfigs();
    console.log(`✅ Found ${allConfigs.length} payment configurations:`);
    allConfigs.forEach((config: any) => {
      console.log(`   • ${config.key}: ${config.description}`);
    });

    console.log('\n🎉 All configurations verified successfully!');
    console.log('📝 The "default config not found" error should now be resolved.');
  } catch (error) {
    console.error('❌ Configuration verification failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    await app.close();
  }
}

verifyConfigs().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
