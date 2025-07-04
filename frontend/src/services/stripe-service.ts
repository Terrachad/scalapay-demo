import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

export interface StripeConfig {
  publicKey: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  cardDetails?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface SetupIntentResponse {
  setupIntentId: string;
  clientSecret: string;
}

class StripeService {
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

  async getPublicKey(): Promise<StripeConfig> {
    return this.makeRequest<StripeConfig>('/stripe-config/public-key');
  }

  async createSetupIntent(): Promise<SetupIntentResponse> {
    return this.makeRequest<SetupIntentResponse>('/payment-methods/setup-intent', {
      method: 'POST',
    });
  }

  async storePaymentMethod(setupIntentId: string, makeDefault = false): Promise<PaymentMethod> {
    return this.makeRequest<PaymentMethod>('/payment-methods', {
      method: 'POST',
      body: JSON.stringify({ setupIntentId, makeDefault }),
    });
  }

  async getUserPaymentMethods(): Promise<PaymentMethod[]> {
    return this.makeRequest<PaymentMethod[]>('/payment-methods');
  }

  async deletePaymentMethod(id: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/payment-methods/${id}`, {
      method: 'DELETE',
    });
  }

  async setAsDefault(id: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/payment-methods/${id}/default`, {
      method: 'POST',
    });
  }
}

export const stripeService = new StripeService();
