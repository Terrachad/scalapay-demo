import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

export interface PlatformSettings {
  maxCreditLimit: number;
  defaultCreditLimit: number;
  interestRate: number;
  lateFeeAmount: number;
  gracePeroidDays: number;
  maxPaymentPlan: number;
  enableAutoApproval: boolean;
  enableEarlyPayment: boolean;
  requireKYC: boolean;
  merchantFeeRate: number;
  latePaymentFee: number;
  maxTransactionAmount: number;
  enableFraudDetection: boolean;
  requireMerchantApproval: boolean;
  enableEmailNotifications: boolean;
  maintenanceMode: boolean;
}

export interface UpdatePlatformSettingsRequest {
  maxCreditLimit?: number;
  defaultCreditLimit?: number;
  interestRate?: number;
  lateFeeAmount?: number;
  gracePeroidDays?: number;
  maxPaymentPlan?: number;
  enableAutoApproval?: boolean;
  enableEarlyPayment?: boolean;
  requireKYC?: boolean;
  merchantFeeRate?: number;
  latePaymentFee?: number;
  maxTransactionAmount?: number;
  enableFraudDetection?: boolean;
  requireMerchantApproval?: boolean;
  enableEmailNotifications?: boolean;
  maintenanceMode?: boolean;
}

export interface UpdatePlatformSettingsDto {
  merchantFeeRate?: number;
  latePaymentFee?: number;
  defaultCreditLimit?: number;
  maxTransactionAmount?: number;
  enableFraudDetection?: boolean;
  requireMerchantApproval?: boolean;
  enableEmailNotifications?: boolean;
  maintenanceMode?: boolean;
}

export interface PendingMerchant {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

class PlatformSettingsService {
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

  async getPlatformSettings(): Promise<PlatformSettings> {
    return this.makeRequest<PlatformSettings>('/admin/platform-settings');
  }

  async updatePlatformSettings(data: UpdatePlatformSettingsRequest): Promise<PlatformSettings> {
    return this.makeRequest<PlatformSettings>('/admin/platform-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetToDefaults(): Promise<PlatformSettings> {
    return this.makeRequest<PlatformSettings>('/admin/platform-settings/reset', {
      method: 'POST',
    });
  }

  // Missing methods that are called in admin settings page
  async getSettings(): Promise<PlatformSettings> {
    return this.getPlatformSettings();
  }

  async updateSettings(data: UpdatePlatformSettingsDto): Promise<PlatformSettings> {
    return this.updatePlatformSettings(data);
  }

  async getPendingMerchants(): Promise<PendingMerchant[]> {
    return this.makeRequest<PendingMerchant[]>('/admin/pending-merchants');
  }

  async approveMerchant(
    merchantId: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/admin/merchants/${merchantId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      },
    );
  }

  async rejectMerchant(
    merchantId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/admin/merchants/${merchantId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    );
  }

  validateSettings(settings: UpdatePlatformSettingsDto): string[] {
    const errors: string[] = [];

    if (
      settings.merchantFeeRate !== undefined &&
      (settings.merchantFeeRate < 0 || settings.merchantFeeRate > 10)
    ) {
      errors.push('Merchant fee rate must be between 0% and 10%');
    }

    if (settings.latePaymentFee !== undefined && settings.latePaymentFee < 0) {
      errors.push('Late payment fee cannot be negative');
    }

    if (settings.defaultCreditLimit !== undefined && settings.defaultCreditLimit < 0) {
      errors.push('Default credit limit cannot be negative');
    }

    if (settings.maxTransactionAmount !== undefined && settings.maxTransactionAmount < 0) {
      errors.push('Max transaction amount cannot be negative');
    }

    return errors;
  }
}

export const platformSettingsService = new PlatformSettingsService();
