import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

export interface PaymentConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentConfigRequest {
  key: string;
  value: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePaymentConfigRequest {
  value?: string;
  description?: string;
  isActive?: boolean;
}

class PaymentConfigService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().token;
    
    const response = await fetch(`${API_ENDPOINTS.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAllConfigs(): Promise<PaymentConfig[]> {
    return this.makeRequest<PaymentConfig[]>('/payment-config');
  }

  async getConfigByKey(key: string): Promise<PaymentConfig> {
    return this.makeRequest<PaymentConfig>(`/payment-config/${key}`);
  }

  async createConfig(data: CreatePaymentConfigRequest): Promise<PaymentConfig> {
    return this.makeRequest<PaymentConfig>('/payment-config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConfig(key: string, data: UpdatePaymentConfigRequest): Promise<PaymentConfig> {
    return this.makeRequest<PaymentConfig>(`/payment-config/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConfig(key: string): Promise<void> {
    await this.makeRequest<void>(`/payment-config/${key}`, {
      method: 'DELETE',
    });
  }

  // Missing methods that are called in PaymentConfigPanel
  async getPaymentConfig(merchantId: string): Promise<any> {
    return this.makeRequest<any>(`/payment-config/merchant/${merchantId}`);
  }

  async getDefaultPaymentConfig(): Promise<any> {
    return this.makeRequest<any>('/payment-config/default');
  }

  async updatePaymentConfig(merchantId: string, data: any): Promise<any> {
    return this.makeRequest<any>(`/payment-config/merchant/${merchantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateDefaultPaymentConfig(data: any): Promise<any> {
    return this.makeRequest<any>('/payment-config/default', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const paymentConfigService = new PaymentConfigService();