import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PaymentConfigService } from './modules/payments/services/payment-config.service';

async function verifyConfigs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentConfigService = app.get(PaymentConfigService);

  console.log('🔍 Verifying payment configurations...');

  try {
    // Test the critical 'default' config that was causing the error
    console.log('\n📋 Testing default payment config...');
    const defaultConfig = await paymentConfigService.getConfigByKey('default');
    console.log('✅ Default config found:', {
      key: defaultConfig.key,
      description: defaultConfig.description,
      isActive: defaultConfig.isActive,
      value: JSON.parse(defaultConfig.value),
    });

    // Test getting config value
    console.log('\n📋 Testing config value retrieval...');
    const lateFeeValue = await paymentConfigService.getConfigValue('late_fee_amount');
    console.log('✅ Late fee amount:', lateFeeValue);

    const paymentMethods = await paymentConfigService.getConfigValue('payment_methods_enabled');
    console.log('✅ Payment methods:', JSON.parse(paymentMethods || '[]'));

    // Test feature flags
    console.log('\n📋 Testing feature flags...');
    const fraudDetectionEnabled =
      await paymentConfigService.isFeatureEnabled('fraud_detection_enabled');
    console.log('✅ Fraud detection enabled:', fraudDetectionEnabled);

    const creditCheckEnabled = await paymentConfigService.isFeatureEnabled('credit_check_enabled');
    console.log('✅ Credit check enabled:', creditCheckEnabled);

    // Test merchant config
    console.log('\n📋 Testing merchant config...');
    const merchantConfig = await paymentConfigService.getConfigForMerchant(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    console.log('✅ Merchant config:', merchantConfig);

    // List all configs
    console.log('\n📋 All payment configurations:');
    const allConfigs = await paymentConfigService.getAllConfigs();
    console.log(`✅ Found ${allConfigs.length} payment configurations:`);
    allConfigs.forEach((config) => {
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
