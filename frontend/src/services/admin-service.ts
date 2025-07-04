import { apiClient } from '@/lib/api-client';

export interface AdminAnalytics {
  // Overview stats
  totalUsers: number;
  customerCount: number;
  merchantCount: number;
  adminCount: number;
  totalRevenue: number;
  completedRevenue: number;
  platformRevenue: number;
  totalTransactions: number;
  completedTransactions: number;

  // Monthly growth
  monthlyRevenue: number;
  monthlyTransactions: number;
  monthlyUsers: number;

  // Charts data
  dailyData: Array<{
    date: string;
    transactions: number;
    revenue: number;
    newUsers: number;
  }>;
  paymentPlanStats: Record<string, number>;
  topMerchants: Array<{
    id: string;
    name: string;
    revenue: number;
    transactions: number;
  }>;

  // Recent activity
  recentTransactions: any[];
  recentUsers: any[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'merchant' | 'admin';
  isActive: boolean;
  creditLimit: string;
  availableCredit: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  isActive?: boolean;
  creditLimit?: number;
  availableCredit?: number;
}

export const adminService = {
  async getAnalytics(): Promise<AdminAnalytics> {
    const response = await apiClient.get<{ data: AdminAnalytics }>('/users/analytics');
    return response.data.data || response.data;
  },

  async getAllUsers(role?: string): Promise<User[]> {
    const params = role ? { role } : {};
    const response = await apiClient.get<{ data: User[] }>('/users', { params });
    return response.data.data || response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/users/${id}`);
    return response.data.data || response.data;
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/users/${id}`, data);
    return response.data.data || response.data;
  },

  async getAllMerchants(): Promise<any[]> {
    const response = await apiClient.get<{ data: any[] }>('/merchants');
    return response.data.data || response.data;
  },

  async getAllTransactions(): Promise<any[]> {
    try {
      const response = await apiClient.get('/transactions', {
        params: {
          page: '1',
          limit: '100',
        },
      });
      console.log('Admin getAllTransactions response:', response.data);

      // The API returns: {data: {transactions: Array, total, page, limit}, statusCode, message}
      if (response.data?.data?.transactions) {
        return response.data.data.transactions;
      }

      // Fallback for direct transactions array
      if (response.data?.transactions) {
        return response.data.transactions;
      }

      return [];
    } catch (error) {
      console.error('Error fetching admin transactions:', error);
      return [];
    }
  },

  async getPendingApprovals(): Promise<User[]> {
    const response = await apiClient.get<{ data: User[] }>('/users/pending-approvals');
    return response.data.data || response.data;
  },

  async approveUser(id: string): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/users/${id}/approve`);
    return response.data.data || response.data;
  },

  async rejectUser(id: string): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/users/${id}/reject`);
    return response.data.data || response.data;
  },

  async approveTransaction(id: string): Promise<any> {
    const response = await apiClient.patch<{ data: any }>(`/transactions/${id}/approve`);
    return response.data.data || response.data;
  },

  async rejectTransaction(id: string): Promise<any> {
    const response = await apiClient.patch<{ data: any }>(`/transactions/${id}/reject`);
    return response.data.data || response.data;
  },
};
