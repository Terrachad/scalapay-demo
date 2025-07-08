/**
 * Shared type definitions for Platform Settings
 * Enterprise-grade type safety for admin settings system
 * 
 * This file must be accessible to both frontend and backend.
 * Path: /shared-types/platform-settings.types.ts
 */

export enum SettingCategory {
  FINANCIAL = 'financial',
  SECURITY = 'security',
  NOTIFICATIONS = 'notifications',
  FEATURES = 'features',
  INTEGRATIONS = 'integrations',
  GENERAL = 'general',
}

export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  ENCRYPTED_STRING = 'encrypted_string',
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Complete platform settings interface with enterprise-grade typing
 * Used across frontend and backend for consistency
 */
export interface PlatformSettings {
  // General Settings
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  timeZone: string;

  // Financial Settings
  defaultCreditLimit: number;
  maxCreditLimit: number;
  maxTransactionAmount: number;
  merchantFeeRate: number;
  lateFeeAmount: number;

  // Payment Settings
  paymentInterval: 'weekly' | 'biweekly' | 'monthly';
  gracePeriodDays: number;
  maxRetries: number;
  interestRate: number;

  // Feature Toggles
  enableAutoApproval: boolean;
  enableEarlyPayment: boolean;
  enableFraudDetection: boolean;
  requireMerchantApproval: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableWebhookNotifications: boolean;
  maintenanceMode: boolean;

  // Security Settings
  requireTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
}

/**
 * Platform settings update request with partial updates
 */
export interface UpdatePlatformSettingsRequest {
  updates: SettingUpdateRequest[];
  reason?: string;
  environment?: Environment;
}

/**
 * Individual setting update request
 */
export interface SettingUpdateRequest {
  key: keyof PlatformSettings;
  value: any;
  reason?: string;
}

/**
 * Setting update response
 */
export interface SettingUpdateResponse {
  key: string;
  success: boolean;
  previousValue?: any;
  newValue?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Platform settings API response
 */
export interface PlatformSettingsResponse {
  settings: PlatformSettings;
  lastUpdated: Date;
  environment: Environment;
  version: string;
}

/**
 * Bulk update response
 */
export interface BulkUpdateResponse {
  results: SettingUpdateResponse[];
  successCount: number;
  errorCount: number;
  timestamp: Date;
}

/**
 * Validation result for settings
 */
export interface ValidationResult {
  key: string;
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Settings validation request
 */
export interface ValidateSettingsRequest {
  settings: Partial<PlatformSettings>;
  environment?: Environment;
}

/**
 * Settings validation response
 */
export interface ValidateSettingsResponse {
  valid: boolean;
  results: ValidationResult[];
  errors: string[];
  warnings: string[];
}

/**
 * API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    requestId?: string;
  };
}

/**
 * API success response format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: Date;
  requestId?: string;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Setting field metadata for validation and UI generation
 */
export interface SettingFieldMetadata {
  key: keyof PlatformSettings;
  category: SettingCategory;
  dataType: SettingDataType;
  label: string;
  description: string;
  required: boolean;
  validation: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    customValidator?: string;
  };
  ui: {
    component: 'input' | 'select' | 'switch' | 'textarea';
    placeholder?: string;
    options?: { value: any; label: string }[];
    group?: string;
  };
}

/**
 * Default platform settings values
 */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
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

/**
 * Setting field metadata for all platform settings
 */
export const SETTING_FIELD_METADATA: SettingFieldMetadata[] = [
  // General Settings
  {
    key: 'platformName',
    category: SettingCategory.GENERAL,
    dataType: SettingDataType.STRING,
    label: 'Platform Name',
    description: 'The display name of the platform',
    required: true,
    validation: { min: 2, max: 50 },
    ui: { component: 'input', placeholder: 'Enter platform name' }
  },
  {
    key: 'supportEmail',
    category: SettingCategory.GENERAL,
    dataType: SettingDataType.EMAIL,
    label: 'Support Email',
    description: 'Primary support contact email',
    required: true,
    validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
    ui: { component: 'input', placeholder: 'support@example.com' }
  },
  {
    key: 'defaultCurrency',
    category: SettingCategory.GENERAL,
    dataType: SettingDataType.STRING,
    label: 'Default Currency',
    description: 'Default currency for transactions',
    required: true,
    validation: { enum: ['USD', 'EUR', 'GBP', 'CAD'] },
    ui: { 
      component: 'select', 
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' }
      ]
    }
  },
  {
    key: 'timeZone',
    category: SettingCategory.GENERAL,
    dataType: SettingDataType.STRING,
    label: 'Time Zone',
    description: 'Default timezone for the platform',
    required: true,
    validation: { enum: ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] },
    ui: { 
      component: 'select',
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' }
      ]
    }
  },

  // Financial Settings
  {
    key: 'defaultCreditLimit',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Default Credit Limit ($)',
    description: 'Default credit limit for new customer accounts',
    required: true,
    validation: { min: 100, max: 50000 },
    ui: { component: 'input', placeholder: '1000' }
  },
  {
    key: 'maxCreditLimit',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Maximum Credit Limit ($)',
    description: 'Maximum allowable credit limit',
    required: true,
    validation: { min: 1000, max: 100000 },
    ui: { component: 'input', placeholder: '10000' }
  },
  {
    key: 'maxTransactionAmount',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Max Transaction Amount ($)',
    description: 'Maximum single transaction limit',
    required: true,
    validation: { min: 100, max: 50000 },
    ui: { component: 'input', placeholder: '5000' }
  },
  {
    key: 'merchantFeeRate',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.PERCENTAGE,
    label: 'Merchant Fee Rate (%)',
    description: 'Percentage fee charged to merchants per transaction',
    required: true,
    validation: { min: 0, max: 10 },
    ui: { component: 'input', placeholder: '2.9' }
  },
  {
    key: 'lateFeeAmount',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Late Payment Fee ($)',
    description: 'Fixed fee applied after grace period',
    required: true,
    validation: { min: 0, max: 100 },
    ui: { component: 'input', placeholder: '25' }
  },

  // Payment Settings
  {
    key: 'paymentInterval',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.STRING,
    label: 'Payment Interval',
    description: 'Default payment schedule interval',
    required: true,
    validation: { enum: ['weekly', 'biweekly', 'monthly'] },
    ui: { 
      component: 'select',
      options: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Bi-weekly' },
        { value: 'monthly', label: 'Monthly' }
      ]
    }
  },
  {
    key: 'gracePeriodDays',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Grace Period (Days)',
    description: 'Days before late fees are applied',
    required: true,
    validation: { min: 0, max: 30 },
    ui: { component: 'input', placeholder: '7' }
  },
  {
    key: 'maxRetries',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.NUMBER,
    label: 'Max Payment Retries',
    description: 'Maximum automatic payment retry attempts',
    required: true,
    validation: { min: 1, max: 10 },
    ui: { component: 'input', placeholder: '3' }
  },
  {
    key: 'interestRate',
    category: SettingCategory.FINANCIAL,
    dataType: SettingDataType.PERCENTAGE,
    label: 'Interest Rate (%)',
    description: 'Annual interest rate for outstanding balances',
    required: true,
    validation: { min: 0, max: 25 },
    ui: { component: 'input', placeholder: '0.0' }
  },

  // Feature Toggles
  {
    key: 'enableAutoApproval',
    category: SettingCategory.FEATURES,
    dataType: SettingDataType.BOOLEAN,
    label: 'Auto Approval',
    description: 'Automatically approve qualifying transactions',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'enableEarlyPayment',
    category: SettingCategory.FEATURES,
    dataType: SettingDataType.BOOLEAN,
    label: 'Early Payment',
    description: 'Allow customers to pay early with potential discounts',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'enableFraudDetection',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.BOOLEAN,
    label: 'Fraud Detection',
    description: 'Enable automated fraud screening for transactions',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'requireMerchantApproval',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.BOOLEAN,
    label: 'Merchant Approval Required',
    description: 'New merchant accounts require admin approval',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },

  // Notification Settings
  {
    key: 'enableEmailNotifications',
    category: SettingCategory.NOTIFICATIONS,
    dataType: SettingDataType.BOOLEAN,
    label: 'Email Notifications',
    description: 'Send notifications via email',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'enableSMSNotifications',
    category: SettingCategory.NOTIFICATIONS,
    dataType: SettingDataType.BOOLEAN,
    label: 'SMS Notifications',
    description: 'Send notifications via SMS',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'enableWebhookNotifications',
    category: SettingCategory.NOTIFICATIONS,
    dataType: SettingDataType.BOOLEAN,
    label: 'Webhook Notifications',
    description: 'Send notifications via webhooks to merchants',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'maintenanceMode',
    category: SettingCategory.FEATURES,
    dataType: SettingDataType.BOOLEAN,
    label: 'Maintenance Mode',
    description: 'Disable new transactions for system maintenance',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },

  // Security Settings
  {
    key: 'requireTwoFactor',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.BOOLEAN,
    label: 'Two-Factor Authentication',
    description: 'Require 2FA for all admin accounts',
    required: false,
    validation: {},
    ui: { component: 'switch' }
  },
  {
    key: 'sessionTimeoutMinutes',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.NUMBER,
    label: 'Session Timeout (Minutes)',
    description: 'Automatic logout after inactivity',
    required: true,
    validation: { min: 5, max: 480 },
    ui: { component: 'input', placeholder: '30' }
  },
  {
    key: 'passwordExpiryDays',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.NUMBER,
    label: 'Password Expiry (Days)',
    description: 'Days before passwords must be changed',
    required: true,
    validation: { min: 30, max: 365 },
    ui: { component: 'input', placeholder: '90' }
  },
  {
    key: 'maxLoginAttempts',
    category: SettingCategory.SECURITY,
    dataType: SettingDataType.NUMBER,
    label: 'Max Login Attempts',
    description: 'Failed login attempts before account lockout',
    required: true,
    validation: { min: 3, max: 10 },
    ui: { component: 'input', placeholder: '5' }
  }
];