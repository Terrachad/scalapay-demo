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
    const response = await apiClient.get<{data: MerchantProfile}>('/merchants/profile');
    return response.data.data || response.data;
  },

  async updateProfile(data: UpdateMerchantProfileDto): Promise<MerchantProfile> {
    const response = await apiClient.put<{data: MerchantProfile}>('/merchants/profile', data);
    return response.data.data || response.data;
  },

  async getAnalytics(): Promise<MerchantAnalytics> {
    const response = await apiClient.get<{data: MerchantAnalytics}>('/merchants/analytics');
    return response.data.data || response.data;
  },

  async regenerateApiKey(): Promise<{ apiKey: string }> {
    const response = await apiClient.post<{data: { apiKey: string }}>('/merchants/api-key/regenerate');
    return response.data.data || response.data;
  },

  // Mock settings endpoints (these would be real backend endpoints in production)
  async updatePaymentSettings(settings: any): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Payment settings updated:', settings);
  },

  async updateNotificationSettings(settings: any): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Notification settings updated:', settings);
  },

  async updateSecuritySettings(settings: any): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Security settings updated:', settings);
  }
};