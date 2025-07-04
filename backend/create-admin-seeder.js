const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createAdminSeeder() {
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'scalapay_user',
      password: 'scalapay_pass',
      database: 'scalapay_demodb',
    });

    console.log('🔌 Connected to database');

    // Create payment configs - especially the 'default' config that's missing
    const paymentConfigs = [
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
        description: 'Default payment configuration for all transactions',
        isActive: true,
      },
      {
        key: 'platform_fees',
        value: JSON.stringify({
          transactionFee: 2.5,
          processingFee: 0.3,
          chargeback_fee: 15.0,
          refund_fee: 0.0,
        }),
        description: 'Platform fee structure',
        isActive: true,
      },
      {
        key: 'payment_limits',
        value: JSON.stringify({
          minAmount: 1.0,
          maxAmount: 10000.0,
          dailyLimit: 50000.0,
          monthlyLimit: 500000.0,
        }),
        description: 'Payment amount and frequency limits',
        isActive: true,
      },
      {
        key: 'fraud_detection',
        value: JSON.stringify({
          enabled: true,
          riskScoreThreshold: 75,
          autoReject: false,
          requireManualReview: true,
          velocityChecks: true,
        }),
        description: 'Fraud detection configuration',
        isActive: true,
      },
      {
        key: 'credit_check',
        value: JSON.stringify({
          enabled: true,
          provider: 'experian',
          minCreditScore: 600,
          autoApprove: false,
          softPull: true,
        }),
        description: 'Credit check configuration',
        isActive: true,
      },
      {
        key: 'notification_settings',
        value: JSON.stringify({
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          webhookEnabled: true,
          retryAttempts: 3,
        }),
        description: 'Global notification settings',
        isActive: true,
      },
      {
        key: 'stripe_config',
        value: JSON.stringify({
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          connectEnabled: false,
          captureMethod: 'automatic',
        }),
        description: 'Stripe payment processor configuration',
        isActive: true,
      },
      {
        key: 'platform_settings',
        value: JSON.stringify({
          defaultFeePercentage: 2.5,
          platformName: 'ScalaPay Demo',
          supportEmail: 'support@scalapay.demo',
          adminEmail: 'admin@scalapay.demo',
          enableMerchantSignup: true,
          enableCustomerSignup: true,
          maintenanceMode: false,
          maxTransactionAmount: 10000,
          minTransactionAmount: 1,
          defaultCurrency: 'USD',
        }),
        description: 'General platform configuration and defaults',
        isActive: true,
      },
      {
        key: 'admin_settings',
        value: JSON.stringify({
          dashboardRefreshInterval: 30,
          enableRealTimeUpdates: true,
          maxExportRecords: 10000,
          sessionTimeout: 60,
          enableAuditLog: true,
          enableDataExport: true,
        }),
        description: 'Admin dashboard and system settings',
        isActive: true,
      },
    ];

    console.log('🔄 Creating payment configurations...');

    for (const config of paymentConfigs) {
      try {
        // Check if config exists
        const [existing] = await connection.execute(
          'SELECT id FROM payment_configs WHERE `key` = ?',
          [config.key],
        );

        if (existing.length > 0) {
          // Update existing config
          await connection.execute(
            'UPDATE payment_configs SET value = ?, description = ?, isActive = ?, updatedAt = NOW() WHERE `key` = ?',
            [config.value, config.description, config.isActive, config.key],
          );
          console.log(`🔄 Updated payment config: ${config.key}`);
        } else {
          // Create new config
          const configId = uuidv4();
          await connection.execute(
            'INSERT INTO payment_configs (id, `key`, value, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [configId, config.key, config.value, config.description, config.isActive],
          );
          console.log(`✅ Created payment config: ${config.key}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update config ${config.key}:`, error.message);
      }
    }

    // Create merchant settings for demo merchant (if exists)
    console.log('🔄 Setting up demo merchant settings...');

    // First, find the demo merchant
    const [merchants] = await connection.execute('SELECT id FROM merchants WHERE email = ?', [
      'merchant@demo.com',
    ]);

    if (merchants.length > 0) {
      const merchantId = merchants[0].id;

      const merchantSettings = [
        // Payment settings
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'enablePayIn2',
          settingValue: 'true',
          description: 'Enable Pay in 2 installments',
        },
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'enablePayIn3',
          settingValue: 'true',
          description: 'Enable Pay in 3 installments',
        },
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'enablePayIn4',
          settingValue: 'true',
          description: 'Enable Pay in 4 installments',
        },
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'minimumAmount',
          settingValue: '50.00',
          description: 'Minimum order amount for installments',
        },
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'maximumAmount',
          settingValue: '5000.00',
          description: 'Maximum order amount for installments',
        },
        {
          merchantId,
          settingType: 'payment',
          settingKey: 'autoApprove',
          settingValue: 'false',
          description: 'Auto-approve payment plans',
        },

        // Notification settings
        {
          merchantId,
          settingType: 'notification',
          settingKey: 'newOrders',
          settingValue: 'true',
          description: 'Notify on new orders',
        },
        {
          merchantId,
          settingType: 'notification',
          settingKey: 'paymentReceived',
          settingValue: 'true',
          description: 'Notify on payment received',
        },
        {
          merchantId,
          settingType: 'notification',
          settingKey: 'paymentFailed',
          settingValue: 'true',
          description: 'Notify on payment failures',
        },
        {
          merchantId,
          settingType: 'notification',
          settingKey: 'email',
          settingValue: 'true',
          description: 'Enable email notifications',
        },

        // Security settings
        {
          merchantId,
          settingType: 'security',
          settingKey: 'twoFactorEnabled',
          settingValue: 'false',
          description: 'Enable two-factor authentication',
        },
        {
          merchantId,
          settingType: 'security',
          settingKey: 'sessionTimeout',
          settingValue: '60',
          description: 'Session timeout in minutes',
        },
        {
          merchantId,
          settingType: 'security',
          settingKey: 'webhookUrl',
          settingValue: 'https://demo-merchant.com/webhook',
          description: 'Webhook URL for notifications',
        },

        // Store settings
        {
          merchantId,
          settingType: 'store',
          settingKey: 'businessName',
          settingValue: 'Demo Electronics Store',
          description: 'Business display name',
        },
        {
          merchantId,
          settingType: 'store',
          settingKey: 'feePercentage',
          settingValue: '2.5',
          description: 'Merchant fee percentage',
        },
        {
          merchantId,
          settingType: 'store',
          settingKey: 'isActive',
          settingValue: 'true',
          description: 'Store active status',
        },
      ];

      for (const setting of merchantSettings) {
        try {
          // Check if setting exists
          const [existing] = await connection.execute(
            'SELECT id FROM merchant_settings WHERE merchant_id = ? AND setting_type = ? AND setting_key = ?',
            [setting.merchantId, setting.settingType, setting.settingKey],
          );

          if (existing.length > 0) {
            // Update existing setting
            await connection.execute(
              'UPDATE merchant_settings SET setting_value = ?, description = ?, updated_at = NOW() WHERE merchant_id = ? AND setting_type = ? AND setting_key = ?',
              [
                setting.settingValue,
                setting.description,
                setting.merchantId,
                setting.settingType,
                setting.settingKey,
              ],
            );
            console.log(
              `🔄 Updated merchant setting: ${setting.settingType}.${setting.settingKey}`,
            );
          } else {
            // Create new setting
            const settingId = uuidv4();
            await connection.execute(
              'INSERT INTO merchant_settings (id, merchant_id, setting_type, setting_key, setting_value, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
              [
                settingId,
                setting.merchantId,
                setting.settingType,
                setting.settingKey,
                setting.settingValue,
                setting.description,
                true,
              ],
            );
            console.log(
              `✅ Created merchant setting: ${setting.settingType}.${setting.settingKey}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to create/update merchant setting ${setting.settingType}.${setting.settingKey}:`,
            error.message,
          );
        }
      }
    } else {
      console.log('⚠️  Demo merchant not found, skipping merchant settings');
    }

    // Verify the crucial 'default' config was created
    console.log('🔍 Verifying default payment config...');
    const [defaultConfig] = await connection.execute(
      'SELECT * FROM payment_configs WHERE `key` = ?',
      ['default'],
    );

    if (defaultConfig.length > 0) {
      console.log('✅ Default payment config verified');
      console.log('   Key:', defaultConfig[0].key);
      console.log('   Value:', defaultConfig[0].value);
    } else {
      console.log('❌ Default payment config not found!');
    }

    console.log('🎉 Admin seeder completed successfully!');
    console.log('📋 Created configurations:');
    console.log('   ✅ Payment configs (including critical "default" config)');
    console.log('   ✅ Merchant settings for demo merchant');
    console.log('   ✅ Platform-wide settings and limits');
    console.log('');
    console.log('🧪 This should fix the "Payment config with key \'default\' not found" error');

    await connection.end();
  } catch (error) {
    console.error('❌ Admin seeder failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdminSeeder();
