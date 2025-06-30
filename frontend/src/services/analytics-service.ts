import { apiClient } from "@/lib/api-client";

export interface AnalyticsStats {
  totalRevenue: number;
  activeUsers: number;
  transactions: number;
  avgOrderValue: number;
  revenueGrowth: number;
  userGrowth: number;
}

export interface RevenueData {
  date: string;
  amount: number;
}

export interface PaymentPlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

export interface MerchantPerformance {
  merchantId: string;
  merchantName: string;
  totalRevenue: number;
  transactionCount: number;
  avgOrderValue: number;
}

export const analyticsService = {
  async getStats(period: "day" | "week" | "month" | "year" = "month"): Promise<AnalyticsStats> {
    const response = await apiClient.get<AnalyticsStats>(`/analytics/stats?period=${period}`);
    return response.data;
  },

  async getRevenueChart(period: string): Promise<RevenueData[]> {
    const response = await apiClient.get<RevenueData[]>(`/analytics/revenue?period=${period}`);
    return response.data;
  },

  async getPaymentPlanDistribution(): Promise<PaymentPlanDistribution[]> {
    const response = await apiClient.get<PaymentPlanDistribution[]>("/analytics/payment-plans");
    return response.data;
  },

  async getMerchantPerformance(): Promise<MerchantPerformance[]> {
    const response = await apiClient.get<MerchantPerformance[]>("/analytics/merchant-performance");
    return response.data;
  },

  async getTransactionTrends(days: number = 30): Promise<any> {
    const response = await apiClient.get(`/analytics/transaction-trends?days=${days}`);
    return response.data;
  },
};
