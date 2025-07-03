/**
 * API Constants and Endpoints
 * Central location for all API endpoint definitions
 */

// Base API URL from environment or fallback to localhost
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API Endpoints object for consistent usage across services
export const API_ENDPOINTS = {
  BASE_URL,
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    REFRESH: '/auth/refresh',
  },

  // User Management
  USERS: {
    BASE: '/users',
    PROFILE: (id: string) => `/users/${id}/profile`,
    NOTIFICATION_PREFERENCES: (id: string) => `/users/${id}/notification-preferences`,
    SECURITY_SETTINGS: (id: string) => `/users/${id}/security-settings`,
    CREDIT_LIMIT: (id: string) => `/users/${id}/credit-limit`,
  },

  // Admin Operations
  ADMIN: {
    PLATFORM_SETTINGS: '/admin/platform-settings',
    PLATFORM_SETTINGS_RESET: '/admin/platform-settings/reset',
    USERS: '/admin/users',
    TRANSACTIONS: '/admin/transactions',
    ANALYTICS: '/admin/analytics',
    MERCHANT_APPROVALS: '/admin/merchant-approvals',
    PENDING_MERCHANTS: '/admin/pending-merchants',
  },

  // Payment Configuration
  PAYMENT_CONFIG: {
    BASE: '/payment-config',
    BY_KEY: (key: string) => `/payment-config/${key}`,
  },

  // Transactions
  TRANSACTIONS: {
    BASE: '/transactions',
    BY_ID: (id: string) => `/transactions/${id}`,
    USER_TRANSACTIONS: (userId: string) => `/transactions/user/${userId}`,
    MERCHANT_TRANSACTIONS: (merchantId: string) => `/transactions/merchant/${merchantId}`,
    APPROVE: (id: string) => `/transactions/${id}/approve`,
    REJECT: (id: string) => `/transactions/${id}/reject`,
    EARLY_PAYMENT: (id: string) => `/transactions/${id}/early-payment`,
  },

  // Payments
  PAYMENTS: {
    BASE: '/payments',
    PROCESS: '/payments/process',
    RETRY: (id: string) => `/payments/${id}/retry`,
    REFUND: (id: string) => `/payments/${id}/refund`,
    WEBHOOK: '/payments/webhook',
  },

  // Payment Methods
  PAYMENT_METHODS: {
    BASE: '/payment-methods',
    SETUP_INTENT: '/payment-methods/setup-intent',
    BY_ID: (id: string) => `/payment-methods/${id}`,
    SET_DEFAULT: (id: string) => `/payment-methods/${id}/default`,
  },

  // Stripe Configuration
  STRIPE_CONFIG: {
    PUBLIC_KEY: '/stripe-config/public-key',
    WEBHOOK_TEST: '/stripe-config/webhook-test',
  },

  // Merchant Management
  MERCHANTS: {
    BASE: '/merchants',
    BY_ID: (id: string) => `/merchants/${id}`,
    ANALYTICS: (id: string) => `/merchants/${id}/analytics`,
    API_KEYS: (id: string) => `/merchants/${id}/api-keys`,
    
    // Merchant Settings (NEW - To be implemented)
    PAYMENT_SETTINGS: (id: string) => `/merchants/${id}/payment-settings`,
    NOTIFICATION_SETTINGS: (id: string) => `/merchants/${id}/notification-settings`,
    SECURITY_SETTINGS: (id: string) => `/merchants/${id}/security-settings`,
    STORE_SETTINGS: (id: string) => `/merchants/${id}/store-settings`,
  },

  // Analytics
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    REVENUE: '/analytics/revenue',
    TRANSACTIONS: '/analytics/transactions',
    PERFORMANCE: '/analytics/performance',
  },

  // Webhooks
  WEBHOOKS: {
    STRIPE: '/webhooks/stripe',
    PAYMENT_REMINDERS: '/webhooks/payment-reminders',
  },

  // Integration Services (Backend)
  INTEGRATIONS: {
    CREDIT_CHECK: '/integrations/credit-check',
    FRAUD_DETECTION: '/integrations/fraud-detection',
  },

  // Products (NEW - To be implemented)
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    MERCHANT_PRODUCTS: (merchantId: string) => `/products/merchant/${merchantId}`,
    CATEGORIES: '/products/categories',
  },

  // WebSocket Events
  WEBSOCKET: {
    ANALYTICS: '/ws/analytics',
    TRANSACTIONS: '/ws/transactions',
    NOTIFICATIONS: '/ws/notifications',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Payment Plan Types
export const PAYMENT_PLANS = {
  PAY_IN_1: 1,
  PAY_IN_2: 2,
  PAY_IN_3: 3,
  PAY_IN_4: 4,
} as const;

// Transaction Status Types
export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

// Payment Status Types
export const PAYMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MERCHANT: 'merchant',
  CUSTOMER: 'customer',
} as const;

// Configuration Keys for Payment Config Service
export const CONFIG_KEYS = {
  // Payment Intervals
  PAYMENT_INTERVAL_WEEKLY: 'payment.interval.weekly',
  PAYMENT_INTERVAL_BIWEEKLY: 'payment.interval.biweekly',
  PAYMENT_INTERVAL_MONTHLY: 'payment.interval.monthly',
  
  // Risk Management
  GRACE_PERIOD_DAYS: 'risk.gracePeriodDays',
  LATE_FEE_AMOUNT: 'risk.lateFeeAmount',
  MAX_RETRY_ATTEMPTS: 'risk.maxRetryAttempts',
  
  // Feature Flags
  ENABLE_EARLY_PAYMENT: 'features.enableEarlyPayment',
  ENABLE_AUTO_APPROVAL: 'features.enableAutoApproval',
  REQUIRE_KYC: 'features.requireKYC',
  
  // Business Rules
  MIN_TRANSACTION_AMOUNT: 'business.minTransactionAmount',
  MAX_TRANSACTION_AMOUNT: 'business.maxTransactionAmount',
  DEFAULT_CREDIT_LIMIT: 'business.defaultCreditLimit',
  MERCHANT_FEE_RATE: 'business.merchantFeeRate',
} as const;

// Default Values
export const DEFAULTS = {
  CREDIT_LIMIT: 5000,
  GRACE_PERIOD_DAYS: 3,
  LATE_FEE_AMOUNT: 25,
  MAX_RETRY_ATTEMPTS: 3,
  MERCHANT_FEE_RATE: 2.5,
  MIN_TRANSACTION_AMOUNT: 50,
  MAX_TRANSACTION_AMOUNT: 2000,
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
export type PaymentPlan = typeof PAYMENT_PLANS[keyof typeof PAYMENT_PLANS];
export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS];