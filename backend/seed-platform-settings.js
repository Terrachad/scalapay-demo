const mysql = require('mysql2/promise');

// Import default settings from the shared types
const DEFAULT_SETTINGS = {
  // General Settings
  platformName: 'ScalaPay',
  supportEmail: 'support@scalapay.com',
  defaultCurrency: 'USD',
  timeZone: 'UTC',

  // Financial Settings
  defaultCreditLimit: 1000,
  maxCreditLimit: 10000,
  maxTransactionAmount: 5000,
  merchantFeeRate: 2.9,
  lateFeeAmount: 25,

  // Payment Settings
  paymentInterval: 'biweekly',
  gracePeriodDays: 7,
  maxRetries: 3,
  interestRate: 0.0,

  // Feature Toggles
  enableAutoApproval: true,
  enableEarlyPayment: true,
  enableFraudDetection: true,
  requireMerchantApproval: true,
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  enableWebhookNotifications: true,
  maintenanceMode: false,

  // Security Settings
  requireTwoFactor: true,
  sessionTimeoutMinutes: 30,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
};

const SETTING_METADATA = {
  // General Settings
  platformName: {
    category: 'general',
    dataType: 'string',
    description: 'The display name of the platform',
  },
  supportEmail: {
    category: 'general',
    dataType: 'email',
    description: 'Primary support contact email',
  },
  defaultCurrency: {
    category: 'general',
    dataType: 'string',
    description: 'Default currency for transactions',
  },
  timeZone: {
    category: 'general',
    dataType: 'string',
    description: 'Default timezone for the platform',
  },

  // Financial Settings
  defaultCreditLimit: {
    category: 'financial',
    dataType: 'number',
    description: 'Default credit limit for new customer accounts',
  },
  maxCreditLimit: {
    category: 'financial',
    dataType: 'number',
    description: 'Maximum allowable credit limit',
  },
  maxTransactionAmount: {
    category: 'financial',
    dataType: 'number',
    description: 'Maximum single transaction limit',
  },
  merchantFeeRate: {
    category: 'financial',
    dataType: 'percentage',
    description: 'Percentage fee charged to merchants per transaction',
  },
  lateFeeAmount: {
    category: 'financial',
    dataType: 'number',
    description: 'Fixed fee applied after grace period',
  },

  // Payment Settings
  paymentInterval: {
    category: 'financial',
    dataType: 'string',
    description: 'Default payment schedule interval',
  },
  gracePeriodDays: {
    category: 'financial',
    dataType: 'number',
    description: 'Days before late fees are applied',
  },
  maxRetries: {
    category: 'financial',
    dataType: 'number',
    description: 'Maximum automatic payment retry attempts',
  },
  interestRate: {
    category: 'financial',
    dataType: 'percentage',
    description: 'Annual interest rate for outstanding balances',
  },

  // Feature Toggles
  enableAutoApproval: {
    category: 'features',
    dataType: 'boolean',
    description: 'Automatically approve qualifying transactions',
  },
  enableEarlyPayment: {
    category: 'features',
    dataType: 'boolean',
    description: 'Allow customers to pay early with potential discounts',
  },
  enableFraudDetection: {
    category: 'security',
    dataType: 'boolean',
    description: 'Enable automated fraud screening for transactions',
  },
  requireMerchantApproval: {
    category: 'security',
    dataType: 'boolean',
    description: 'New merchant accounts require admin approval',
  },

  // Notification Settings
  enableEmailNotifications: {
    category: 'notifications',
    dataType: 'boolean',
    description: 'Send notifications via email',
  },
  enableSMSNotifications: {
    category: 'notifications',
    dataType: 'boolean',
    description: 'Send notifications via SMS',
  },
  enableWebhookNotifications: {
    category: 'notifications',
    dataType: 'boolean',
    description: 'Send notifications via webhooks to merchants',
  },
  maintenanceMode: {
    category: 'features',
    dataType: 'boolean',
    description: 'Disable new transactions for system maintenance',
  },

  // Security Settings
  requireTwoFactor: {
    category: 'security',
    dataType: 'boolean',
    description: 'Require 2FA for all admin accounts',
  },
  sessionTimeoutMinutes: {
    category: 'security',
    dataType: 'number',
    description: 'Automatic logout after inactivity',
  },
  passwordExpiryDays: {
    category: 'security',
    dataType: 'number',
    description: 'Days before passwords must be changed',
  },
  maxLoginAttempts: {
    category: 'security',
    dataType: 'number',
    description: 'Failed login attempts before account lockout',
  },
};

function serializeValue(value, dataType) {
  switch (dataType) {
    case 'boolean':
      return String(Boolean(value));
    case 'number':
    case 'percentage':
    case 'currency':
      return String(Number(value));
    case 'json':
    case 'array':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

async function seedPlatformSettings() {
  let connection;

  try {
    console.log('🌱 Starting platform settings seeding...');

    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'scalapay_user',
      password: 'scalapay_pass',
      database: 'scalapay_demodb',
    });

    console.log('✅ Database connection established');

    // Seed settings for development environment
    const environment = 'development';
    let updatedCount = 0;
    let createdCount = 0;

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      const metadata = SETTING_METADATA[key];
      if (!metadata) {
        console.warn(`⚠️  No metadata found for setting: ${key}`);
        continue;
      }

      try {
        // Check if setting exists
        const [rows] = await connection.execute(
          'SELECT id, value FROM platform_settings WHERE `key` = ? AND environment = ?',
          [key, environment],
        );

        const serializedValue = serializeValue(defaultValue, metadata.dataType);

        if (rows.length > 0) {
          const existing = rows[0];
          // Update if value is empty or null
          if (!existing.value || existing.value === '' || existing.value === 'null') {
            await connection.execute(
              `UPDATE platform_settings 
               SET value = ?, category = ?, dataType = ?, description = ?, updatedAt = NOW()
               WHERE id = ?`,
              [
                serializedValue,
                metadata.category,
                metadata.dataType,
                metadata.description,
                existing.id,
              ],
            );
            console.log(`📝 Updated empty setting: ${key} = ${defaultValue}`);
            updatedCount++;
          }
        } else {
          // Create new setting
          await connection.execute(
            `INSERT INTO platform_settings 
             (id, \`key\`, value, category, dataType, description, isEncrypted, requiresRestart, environment, isActive, createdAt, updatedAt)
             VALUES (UUID(), ?, ?, ?, ?, ?, 0, 0, ?, 1, NOW(), NOW())`,
            [
              key,
              serializedValue,
              metadata.category,
              metadata.dataType,
              metadata.description,
              environment,
            ],
          );
          console.log(`🆕 Created new setting: ${key} = ${defaultValue}`);
          createdCount++;
        }
      } catch (error) {
        console.error(`❌ Error seeding setting ${key}:`, error.message);
      }
    }

    // Verify all settings exist and have values
    const [finalRows] = await connection.execute(
      'SELECT `key`, value FROM platform_settings WHERE environment = ? ORDER BY `key`',
      [environment],
    );

    const emptySettings = finalRows.filter(
      (row) => !row.value || row.value === '' || row.value === 'null',
    );

    console.log('\n📊 Seeding Summary:');
    console.log(`  • Total settings: ${finalRows.length}`);
    console.log(`  • Created: ${createdCount}`);
    console.log(`  • Updated: ${updatedCount}`);
    console.log(`  • Empty settings: ${emptySettings.length}`);

    if (emptySettings.length > 0) {
      console.log('⚠️  Empty settings found:');
      emptySettings.forEach((setting) => console.log(`    - ${setting.key}`));
    }

    console.log('\n✅ Platform settings seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding platform settings:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seeding
seedPlatformSettings().catch(console.error);
