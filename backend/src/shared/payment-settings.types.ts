/**
 * Payment Settings Types
 * Following the exact same pattern as platform-settings.types.ts
 */

export interface PaymentSettings {
  // Gateway Settings
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  paypalClientId: string;
  paypalClientSecret: string;

  // Processing Settings
  enableRetries: boolean;
  maxRetryAttempts: number;
  retryDelayMinutes: number;
  enable3DSecure: boolean;
  requireCVV: boolean;
  captureMode: 'automatic' | 'manual';

  // Security Settings
  enableTokenization: boolean;
  fraudThreshold: number;
  enableFraudDetection: boolean;
  maxDailyTransactionAmount: number;
  allowedCountries: string[];

  // Webhook Settings
  enableWebhooks: boolean;
  webhookTimeout: number;
  webhookRetryAttempts: number;

  // General Settings
  defaultCurrency: string;
  supportedPaymentMethods: string[];
  enableEarlyPayment: boolean;
  enableNotifications: boolean;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  // Gateway Settings
  stripePublishableKey: '',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  paypalClientId: '',
  paypalClientSecret: '',

  // Processing Settings
  enableRetries: true,
  maxRetryAttempts: 3,
  retryDelayMinutes: 30,
  enable3DSecure: true,
  requireCVV: true,
  captureMode: 'automatic',

  // Security Settings
  enableTokenization: true,
  fraudThreshold: 50,
  enableFraudDetection: true,
  maxDailyTransactionAmount: 10000,
  allowedCountries: ['US', 'CA', 'GB', 'AU'],

  // Webhook Settings
  enableWebhooks: true,
  webhookTimeout: 30,
  webhookRetryAttempts: 3,

  // General Settings
  defaultCurrency: 'USD',
  supportedPaymentMethods: ['card', 'ach', 'apple_pay', 'google_pay'],
  enableEarlyPayment: true,
  enableNotifications: true,
};

export interface PaymentFieldMetadata {
  key: keyof PaymentSettings;
  label: string;
  description: string;
  category: 'gateway' | 'processing' | 'security' | 'webhooks' | 'general';
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'select';
  validation: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  ui: {
    inputType: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'switch' | 'multi-select';
    placeholder?: string;
    helpText?: string;
    order: number;
  };
  isEncrypted?: boolean;
  isSensitive?: boolean;
}

export const PAYMENT_FIELD_METADATA: PaymentFieldMetadata[] = [
  // Gateway Settings
  {
    key: 'stripePublishableKey',
    label: 'Stripe Publishable Key',
    description: 'Public API key for Stripe payment processing',
    category: 'gateway',
    dataType: 'string',
    validation: { required: true, pattern: '^pk_' },
    ui: { inputType: 'text', placeholder: 'pk_test_...', order: 1 },
    isSensitive: false,
  },
  {
    key: 'stripeSecretKey',
    label: 'Stripe Secret Key',
    description: 'Secret API key for Stripe payment processing',
    category: 'gateway',
    dataType: 'string',
    validation: { required: true, pattern: '^sk_' },
    ui: { inputType: 'password', placeholder: 'sk_test_...', order: 2 },
    isEncrypted: true,
    isSensitive: true,
  },
  {
    key: 'stripeWebhookSecret',
    label: 'Stripe Webhook Secret',
    description: 'Secret for validating Stripe webhook signatures',
    category: 'gateway',
    dataType: 'string',
    validation: { required: true, pattern: '^whsec_' },
    ui: { inputType: 'password', placeholder: 'whsec_...', order: 3 },
    isEncrypted: true,
    isSensitive: true,
  },
  {
    key: 'paypalClientId',
    label: 'PayPal Client ID',
    description: 'Client ID for PayPal payment processing',
    category: 'gateway',
    dataType: 'string',
    validation: { required: false },
    ui: { inputType: 'text', placeholder: 'PayPal Client ID', order: 4 },
    isSensitive: false,
  },
  {
    key: 'paypalClientSecret',
    label: 'PayPal Client Secret',
    description: 'Client secret for PayPal payment processing',
    category: 'gateway',
    dataType: 'string',
    validation: { required: false },
    ui: { inputType: 'password', placeholder: 'PayPal Client Secret', order: 5 },
    isEncrypted: true,
    isSensitive: true,
  },

  // Processing Settings
  {
    key: 'enableRetries',
    label: 'Enable Payment Retries',
    description: 'Automatically retry failed payments',
    category: 'processing',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 10 },
  },
  {
    key: 'maxRetryAttempts',
    label: 'Max Retry Attempts',
    description: 'Maximum number of retry attempts for failed payments',
    category: 'processing',
    dataType: 'number',
    validation: { required: true, min: 1, max: 10 },
    ui: { inputType: 'number', order: 11 },
  },
  {
    key: 'retryDelayMinutes',
    label: 'Retry Delay (Minutes)',
    description: 'Delay between retry attempts in minutes',
    category: 'processing',
    dataType: 'number',
    validation: { required: true, min: 5, max: 1440 },
    ui: { inputType: 'number', order: 12 },
  },
  {
    key: 'enable3DSecure',
    label: 'Enable 3D Secure',
    description: 'Enable 3D Secure authentication for card payments',
    category: 'processing',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 13 },
  },
  {
    key: 'requireCVV',
    label: 'Require CVV',
    description: 'Require CVV verification for card payments',
    category: 'processing',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 14 },
  },
  {
    key: 'captureMode',
    label: 'Capture Mode',
    description: 'Payment capture mode',
    category: 'processing',
    dataType: 'select',
    validation: { required: true, enum: ['automatic', 'manual'] },
    ui: { inputType: 'select', order: 15 },
  },

  // Security Settings
  {
    key: 'enableTokenization',
    label: 'Enable Card Tokenization',
    description: 'Enable secure card tokenization for storage',
    category: 'security',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 20 },
  },
  {
    key: 'fraudThreshold',
    label: 'Fraud Threshold (%)',
    description: 'Fraud detection threshold percentage',
    category: 'security',
    dataType: 'number',
    validation: { required: true, min: 0, max: 100 },
    ui: { inputType: 'number', order: 21 },
  },
  {
    key: 'enableFraudDetection',
    label: 'Enable Fraud Detection',
    description: 'Enable automated fraud detection',
    category: 'security',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 22 },
  },
  {
    key: 'maxDailyTransactionAmount',
    label: 'Max Daily Transaction Amount',
    description: 'Maximum daily transaction amount limit',
    category: 'security',
    dataType: 'number',
    validation: { required: true, min: 1000, max: 1000000 },
    ui: { inputType: 'number', order: 23 },
  },
  {
    key: 'allowedCountries',
    label: 'Allowed Countries',
    description: 'List of allowed country codes for payments',
    category: 'security',
    dataType: 'array',
    validation: { required: true },
    ui: { inputType: 'multi-select', order: 24 },
  },

  // Webhook Settings
  {
    key: 'enableWebhooks',
    label: 'Enable Webhooks',
    description: 'Enable webhook notifications for payment events',
    category: 'webhooks',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 30 },
  },
  {
    key: 'webhookTimeout',
    label: 'Webhook Timeout (Seconds)',
    description: 'Timeout for webhook delivery in seconds',
    category: 'webhooks',
    dataType: 'number',
    validation: { required: true, min: 5, max: 300 },
    ui: { inputType: 'number', order: 31 },
  },
  {
    key: 'webhookRetryAttempts',
    label: 'Webhook Retry Attempts',
    description: 'Number of retry attempts for failed webhooks',
    category: 'webhooks',
    dataType: 'number',
    validation: { required: true, min: 1, max: 10 },
    ui: { inputType: 'number', order: 32 },
  },

  // General Settings
  {
    key: 'defaultCurrency',
    label: 'Default Currency',
    description: 'Default currency for payment processing',
    category: 'general',
    dataType: 'select',
    validation: { required: true, enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    ui: { inputType: 'select', order: 40 },
  },
  {
    key: 'supportedPaymentMethods',
    label: 'Supported Payment Methods',
    description: 'List of supported payment methods',
    category: 'general',
    dataType: 'array',
    validation: { required: true },
    ui: { inputType: 'multi-select', order: 41 },
  },
  {
    key: 'enableEarlyPayment',
    label: 'Enable Early Payment',
    description: 'Allow customers to pay early for discounts',
    category: 'general',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 42 },
  },
  {
    key: 'enableNotifications',
    label: 'Enable Notifications',
    description: 'Enable payment notifications to customers',
    category: 'general',
    dataType: 'boolean',
    validation: { required: true },
    ui: { inputType: 'switch', order: 43 },
  },
];
