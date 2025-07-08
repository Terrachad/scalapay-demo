import { DataSource } from 'typeorm';
import { PlatformSetting, SettingCategory, SettingDataType, Environment } from '../entities/platform-setting.entity';
import { PlatformSettingSchema, ValidationRule } from '../entities/platform-setting-schema.entity';
import { UserRole } from '../../users/entities/user.entity';

export async function seedDefaultPlatformSettings(dataSource: DataSource): Promise<void> {
  const settingsRepository = dataSource.getRepository(PlatformSetting);
  const schemaRepository = dataSource.getRepository(PlatformSettingSchema);

  // First, create schema definitions
  const schemaDefinitions = [
    {
      key: 'platformName',
      category: SettingCategory.GENERAL,
      dataType: SettingDataType.STRING,
      description: 'The name of the platform displayed to users',
      defaultValue: 'ScalaPay',
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Platform name is required' } as ValidationRule,
        { type: 'min', value: 3, message: 'Platform name must be at least 3 characters' } as ValidationRule,
        { type: 'max', value: 50, message: 'Platform name must be at most 50 characters' } as ValidationRule
      ]
    },
    {
      key: 'supportEmail',
      category: SettingCategory.GENERAL,
      dataType: SettingDataType.EMAIL,
      description: 'Support email address for customer inquiries',
      defaultValue: 'support@scalapay.com',
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Support email is required' } as ValidationRule
      ]
    },
    {
      key: 'defaultCurrency',
      category: SettingCategory.FINANCIAL,
      dataType: SettingDataType.CURRENCY,
      description: 'Default currency for transactions',
      defaultValue: 'USD',
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Default currency is required' } as ValidationRule,
        { type: 'enum', value: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'], message: 'Invalid currency code' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'defaultCreditLimit',
      category: SettingCategory.FINANCIAL,
      dataType: SettingDataType.NUMBER,
      description: 'Default credit limit for new users',
      defaultValue: 1000,
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Default credit limit is required' } as ValidationRule,
        { type: 'min', value: 100, message: 'Credit limit must be at least $100' } as ValidationRule,
        { type: 'max', value: 50000, message: 'Credit limit cannot exceed $50,000' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'maxCreditLimit',
      category: SettingCategory.FINANCIAL,
      dataType: SettingDataType.NUMBER,
      description: 'Maximum credit limit that can be assigned',
      defaultValue: 10000,
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Maximum credit limit is required' } as ValidationRule,
        { type: 'min', value: 1000, message: 'Max credit limit must be at least $1,000' } as ValidationRule,
        { type: 'max', value: 100000, message: 'Max credit limit cannot exceed $100,000' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'merchantFeeRate',
      category: SettingCategory.FINANCIAL,
      dataType: SettingDataType.PERCENTAGE,
      description: 'Merchant fee rate as a percentage',
      defaultValue: 2.9,
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Merchant fee rate is required' } as ValidationRule,
        { type: 'min', value: 0.1, message: 'Fee rate must be at least 0.1%' } as ValidationRule,
        { type: 'max', value: 10, message: 'Fee rate cannot exceed 10%' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'requireTwoFactor',
      category: SettingCategory.SECURITY,
      dataType: SettingDataType.BOOLEAN,
      description: 'Require two-factor authentication for admin users',
      defaultValue: true,
      isRequired: true,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'sessionTimeoutMinutes',
      category: SettingCategory.SECURITY,
      dataType: SettingDataType.NUMBER,
      description: 'Session timeout in minutes',
      defaultValue: 30,
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Session timeout is required' } as ValidationRule,
        { type: 'min', value: 5, message: 'Session timeout must be at least 5 minutes' } as ValidationRule,
        { type: 'max', value: 480, message: 'Session timeout cannot exceed 8 hours' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'maxLoginAttempts',
      category: SettingCategory.SECURITY,
      dataType: SettingDataType.NUMBER,
      description: 'Maximum login attempts before account lockout',
      defaultValue: 5,
      isRequired: true,
      validationRules: [
        { type: 'required', message: 'Max login attempts is required' } as ValidationRule,
        { type: 'min', value: 1, message: 'Must allow at least 1 login attempt' } as ValidationRule,
        { type: 'max', value: 20, message: 'Cannot exceed 20 login attempts' } as ValidationRule
      ],
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'enableEmailNotifications',
      category: SettingCategory.NOTIFICATIONS,
      dataType: SettingDataType.BOOLEAN,
      description: 'Enable email notifications for users',
      defaultValue: true,
      isRequired: false,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'enableSMSNotifications',
      category: SettingCategory.NOTIFICATIONS,
      dataType: SettingDataType.BOOLEAN,
      description: 'Enable SMS notifications for users',
      defaultValue: false,
      isRequired: false,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'enableAutoApproval',
      category: SettingCategory.FEATURES,
      dataType: SettingDataType.BOOLEAN,
      description: 'Enable automatic approval for low-risk transactions',
      defaultValue: true,
      isRequired: false,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'enableEarlyPayment',
      category: SettingCategory.FEATURES,
      dataType: SettingDataType.BOOLEAN,
      description: 'Allow users to make early payments',
      defaultValue: true,
      isRequired: false,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'enableFraudDetection',
      category: SettingCategory.FEATURES,
      dataType: SettingDataType.BOOLEAN,
      description: 'Enable fraud detection for transactions',
      defaultValue: true,
      isRequired: true,
      minimumRole: UserRole.ADMIN
    },
    {
      key: 'maintenanceMode',
      category: SettingCategory.FEATURES,
      dataType: SettingDataType.BOOLEAN,
      description: 'Enable maintenance mode to disable user access',
      defaultValue: false,
      isRequired: false,
      minimumRole: UserRole.ADMIN
    }
  ];

  // Create schema records
  for (const schemaDef of schemaDefinitions) {
    const existingSchema = await schemaRepository.findOne({ where: { key: schemaDef.key } });
    if (!existingSchema) {
      await schemaRepository.save(schemaRepository.create(schemaDef));
    }
  }

  // Create default settings for each environment
  const environments = [Environment.DEVELOPMENT, Environment.STAGING, Environment.PRODUCTION];

  for (const environment of environments) {
    const defaultSettings = [
      { key: 'platformName', value: 'ScalaPay', category: SettingCategory.GENERAL, dataType: SettingDataType.STRING },
      { key: 'supportEmail', value: 'support@scalapay.com', category: SettingCategory.GENERAL, dataType: SettingDataType.EMAIL },
      { key: 'defaultCurrency', value: 'USD', category: SettingCategory.FINANCIAL, dataType: SettingDataType.CURRENCY },
      { key: 'defaultCreditLimit', value: environment === Environment.PRODUCTION ? 1000 : 500, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'maxCreditLimit', value: environment === Environment.PRODUCTION ? 10000 : 5000, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'maxTransactionAmount', value: environment === Environment.PRODUCTION ? 5000 : 2500, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'merchantFeeRate', value: 2.9, category: SettingCategory.FINANCIAL, dataType: SettingDataType.PERCENTAGE },
      { key: 'lateFeeAmount', value: 25, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'paymentInterval', value: 'biweekly', category: SettingCategory.FINANCIAL, dataType: SettingDataType.STRING },
      { key: 'gracePeriodDays', value: 7, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'maxRetries', value: 3, category: SettingCategory.FINANCIAL, dataType: SettingDataType.NUMBER },
      { key: 'interestRate', value: 0.0, category: SettingCategory.FINANCIAL, dataType: SettingDataType.PERCENTAGE },
      { key: 'requireTwoFactor', value: environment === Environment.PRODUCTION, category: SettingCategory.SECURITY, dataType: SettingDataType.BOOLEAN },
      { key: 'sessionTimeoutMinutes', value: environment === Environment.PRODUCTION ? 30 : 60, category: SettingCategory.SECURITY, dataType: SettingDataType.NUMBER },
      { key: 'passwordExpiryDays', value: 90, category: SettingCategory.SECURITY, dataType: SettingDataType.NUMBER },
      { key: 'maxLoginAttempts', value: 5, category: SettingCategory.SECURITY, dataType: SettingDataType.NUMBER },
      { key: 'enableEmailNotifications', value: true, category: SettingCategory.NOTIFICATIONS, dataType: SettingDataType.BOOLEAN },
      { key: 'enableSMSNotifications', value: false, category: SettingCategory.NOTIFICATIONS, dataType: SettingDataType.BOOLEAN },
      { key: 'enableWebhookNotifications', value: true, category: SettingCategory.NOTIFICATIONS, dataType: SettingDataType.BOOLEAN },
      { key: 'enableAutoApproval', value: environment !== Environment.PRODUCTION, category: SettingCategory.FEATURES, dataType: SettingDataType.BOOLEAN },
      { key: 'enableEarlyPayment', value: true, category: SettingCategory.FEATURES, dataType: SettingDataType.BOOLEAN },
      { key: 'enableFraudDetection', value: true, category: SettingCategory.FEATURES, dataType: SettingDataType.BOOLEAN },
      { key: 'requireMerchantApproval', value: true, category: SettingCategory.FEATURES, dataType: SettingDataType.BOOLEAN },
      { key: 'maintenanceMode', value: false, category: SettingCategory.FEATURES, dataType: SettingDataType.BOOLEAN },
      { key: 'timeZone', value: 'UTC', category: SettingCategory.GENERAL, dataType: SettingDataType.STRING }
    ];

    for (const settingData of defaultSettings) {
      const existingSetting = await settingsRepository.findOne({
        where: { key: settingData.key, environment }
      });

      if (!existingSetting) {
        const setting = settingsRepository.create({
          ...settingData,
          environment,
          description: `Default ${settingData.key} setting for ${environment}`,
          isEncrypted: false,
          requiresRestart: false,
          isActive: true
        });

        await settingsRepository.save(setting);
      }
    }
  }

  console.log('✅ Default platform settings seeded successfully');
}