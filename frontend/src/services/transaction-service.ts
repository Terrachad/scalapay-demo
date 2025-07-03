import { apiClient } from '@/lib/api-client';

export interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  paymentPlan: 'pay_in_2' | 'pay_in_3' | 'pay_in_4';
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  merchant: {
    id: string;
    name: string;
    businessName: string;
  };
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
  // Payment processing fields (optional - only present when payment is required)
  requiresPayment?: boolean;
  clientSecret?: string;
  firstInstallmentCardAmount?: number;
  paymentBreakdown?: {
    creditAmount: number;
    cardAmount: number;
    totalAmount: number;
  };
}

export interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  paymentDate?: string;
}

export interface CreateTransactionDto {
  amount: number;
  merchantId: string;
  paymentPlan: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export const transactionService = {
  async create(data: CreateTransactionDto): Promise<{ data: Transaction; statusCode: number; message: string; timestamp: string }> {
    const response = await apiClient.post<{ data: Transaction; statusCode: number; message: string; timestamp: string }>('/transactions', data);
    return response.data;
  },

  async getMyTransactions(): Promise<Transaction[]> {
    const response = await apiClient.get<{ data: Transaction[] }>('/transactions/my');
    return response.data.data;
  },

  async getById(id: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async getMerchantTransactions(): Promise<Transaction[]> {
    const response = await apiClient.get<{ data: Transaction[] }>('/transactions/merchant');
    return response.data.data || response.data;
  },

  async updateStatus(id: string, status: string): Promise<Transaction> {
    const response = await apiClient.patch<Transaction>(`/transactions/${id}/status`, { status });
    return response.data;
  },

  async processPayment(transactionId: string, paymentId: string): Promise<Payment> {
    const response = await apiClient.post<Payment>(
      `/transactions/${transactionId}/payments/${paymentId}/process`,
    );
    return response.data;
  },
};
