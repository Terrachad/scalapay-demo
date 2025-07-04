import { apiClient } from '@/lib/api-client';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  businessName: string;
  feePercentage: number;
  isActive: boolean;
}

export interface MerchantProfile {
  id: string;
  name: string;
  email: string;
  businessName: string;
  feePercentage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantAnalytics {
  totalRevenue: number;
  completedRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  paymentPlanStats: Record<string, number>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentTransactions: any[];
}

export interface UpdateMerchantProfileDto {
  name?: string;
  email?: string;
  businessName?: string;
}

// Settings interfaces - matching backend DTOs
export interface PaymentSettings {
  enablePayIn2: boolean;
  enablePayIn3: boolean;
  enablePayIn4: boolean;
  minimumAmount: number;
  maximumAmount: number;
  autoApprove: boolean;
  requireManualReview: boolean;
}

export interface UpdatePaymentSettingsDto {
  enablePayIn2?: boolean;
  enablePayIn3?: boolean;
  enablePayIn4?: boolean;
  minimumAmount?: number;
  maximumAmount?: number;
  autoApprove?: boolean;
  requireManualReview?: boolean;
}

export interface NotificationSettings {
  newOrders: boolean;
  paymentReceived: boolean;
  paymentFailed: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface UpdateNotificationSettingsDto {
  newOrders?: boolean;
  paymentReceived?: boolean;
  paymentFailed?: boolean;
  dailySummary?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  email?: boolean;
  sms?: boolean;
  inApp?: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  webhookUrl: string;
  apiKey: string;
}

export interface UpdateSecuritySettingsDto {
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  ipWhitelist?: string[];
  webhookUrl?: string;
  apiKey?: string;
}

export interface StoreSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  feePercentage: number;
  isActive: boolean;
}

export interface UpdateStoreSettingsDto {
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  feePercentage?: number;
  isActive?: boolean;
}

export const merchantService = {
  async getDemoMerchant(): Promise<Merchant> {
    const response = await apiClient.get('/merchants/demo');
    // Handle wrapped API response format
    return response.data.data || response.data;
  },

  async getAllMerchants(): Promise<Merchant[]> {
    const response = await apiClient.get('/merchants');
    // Handle wrapped API response format
    return response.data.data || response.data;
  },

  async getProfile(): Promise<MerchantProfile> {
    const response = await apiClient.get<{ data: MerchantProfile }>('/merchants/profile');
    return response.data.data || response.data;
  },

  async updateProfile(data: UpdateMerchantProfileDto): Promise<MerchantProfile> {
    const response = await apiClient.put<{ data: MerchantProfile }>('/merchants/profile', data);
    return response.data.data || response.data;
  },

  async getAnalytics(): Promise<MerchantAnalytics> {
    const response = await apiClient.get<{ data: MerchantAnalytics }>('/merchants/analytics');
    return response.data.data || response.data;
  },

  async regenerateApiKey(): Promise<{ apiKey: string }> {
    const response = await apiClient.post<{ data: { apiKey: string } }>(
      '/merchants/api-key/regenerate',
    );
    return response.data.data || response.data;
  },

  // Real settings endpoints - NO MORE MOCKING
  async getPaymentSettings(): Promise<PaymentSettings> {
    const response = await apiClient.get('/merchants/payment-settings');
    return response.data;
  },

  async updatePaymentSettings(settings: UpdatePaymentSettingsDto): Promise<PaymentSettings> {
    const response = await apiClient.put('/merchants/payment-settings', settings);
    return response.data;
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get('/merchants/notification-settings');
    return response.data;
  },

  async updateNotificationSettings(
    settings: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const response = await apiClient.put('/merchants/notification-settings', settings);
    return response.data;
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await apiClient.get('/merchants/security-settings');
    return response.data;
  },

  async updateSecuritySettings(settings: UpdateSecuritySettingsDto): Promise<SecuritySettings> {
    const response = await apiClient.put('/merchants/security-settings', settings);
    return response.data;
  },

  async getStoreSettings(): Promise<StoreSettings> {
    const response = await apiClient.get('/merchants/store-settings');
    return response.data;
  },

  async updateStoreSettings(settings: UpdateStoreSettingsDto): Promise<StoreSettings> {
    const response = await apiClient.put('/merchants/store-settings', settings);
    return response.data;
  },
};
