import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

/**
 * Platform Settings Interface
 * Complete interface for all platform configuration settings
 */
export interface PlatformSettings {
  // General Settings
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  timeZone: string;

  // Financial Settings
  defaultCreditLimit: number;
  maxCreditLimit: number;
  maxTransactionAmount: number;
  merchantFeeRate: number;
  lateFeeAmount: number;

  // Payment Settings
  paymentInterval: 'weekly' | 'biweekly' | 'monthly';
  gracePeriodDays: number;
  maxRetries: number;
  interestRate: number;

  // Feature Toggles
  enableAutoApproval: boolean;
  enableEarlyPayment: boolean;
  enableFraudDetection: boolean;
  requireMerchantApproval: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableWebhookNotifications: boolean;
  maintenanceMode: boolean;

  // Security Settings
  requireTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
}

/**
 * Default platform settings values
 */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  // General Settings
  platformName: 'ScalaPay',
  supportEmail: 'support@scalapay.com',
  defaultCurrency: 'USD',
  timeZone: 'UTC',

  // Financial Settings
  defaultCreditLimit: 1000,
  maxCreditLimit: 10000,
  maxTransactionAmount: 5000,
  merchantFeeRate: 2.9,
  lateFeeAmount: 25,

  // Payment Settings
  paymentInterval: 'biweekly',
  gracePeriodDays: 7,
  maxRetries: 3,
  interestRate: 0.0,

  // Feature Toggles
  enableAutoApproval: true,
  enableEarlyPayment: true,
  enableFraudDetection: true,
  requireMerchantApproval: true,
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  enableWebhookNotifications: true,
  maintenanceMode: false,

  // Security Settings
  requireTwoFactor: true,
  sessionTimeoutMinutes: 30,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
};

/**
 * API Response types
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: Date;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    requestId?: string;
  };
}

export interface SettingUpdateRequest {
  key: string;
  value: any;
  reason?: string;
}

export interface UpdatePlatformSettingsRequest {
  updates: SettingUpdateRequest[];
  reason?: string;
  environment?: string;
}

export interface ValidationResult {
  key: string;
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ValidateSettingsResponse {
  valid: boolean;
  results: ValidationResult[];
  errors: string[];
  warnings: string[];
}

export interface PendingMerchant {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Simple validation rules for settings
 */
const VALIDATION_RULES: Record<keyof PlatformSettings, any> = {
  // General Settings
  platformName: { type: 'string', min: 2, max: 50 },
  supportEmail: { type: 'email' },
  defaultCurrency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD'] },
  timeZone: { type: 'string' },

  // Financial Settings
  defaultCreditLimit: { type: 'number', min: 100, max: 50000 },
  maxCreditLimit: { type: 'number', min: 1000, max: 100000 },
  maxTransactionAmount: { type: 'number', min: 100, max: 50000 },
  merchantFeeRate: { type: 'number', min: 0, max: 10 },
  lateFeeAmount: { type: 'number', min: 0, max: 100 },

  // Payment Settings
  paymentInterval: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'] },
  gracePeriodDays: { type: 'number', min: 0, max: 30 },
  maxRetries: { type: 'number', min: 1, max: 10 },
  interestRate: { type: 'number', min: 0, max: 25 },

  // Feature Toggles
  enableAutoApproval: { type: 'boolean' },
  enableEarlyPayment: { type: 'boolean' },
  enableFraudDetection: { type: 'boolean' },
  requireMerchantApproval: { type: 'boolean' },
  enableEmailNotifications: { type: 'boolean' },
  enableSMSNotifications: { type: 'boolean' },
  enableWebhookNotifications: { type: 'boolean' },
  maintenanceMode: { type: 'boolean' },

  // Security Settings
  requireTwoFactor: { type: 'boolean' },
  sessionTimeoutMinutes: { type: 'number', min: 5, max: 480 },
  passwordExpiryDays: { type: 'number', min: 30, max: 365 },
  maxLoginAttempts: { type: 'number', min: 3, max: 10 },
};

/**
 * Enterprise-grade Platform Settings Service
 * Handles all platform settings API interactions with proper error handling,
 * type safety, and consistent API communication.
 */
class PlatformSettingsService {
  private readonly baseUrl = API_ENDPOINTS.BASE_URL;

  /**
   * Make authenticated HTTP request with proper error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiSuccessResponse<T>> {
    const token = useAuthStore.getState().token;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-environment': 'development',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API error responses
        if (data.success === false || (data.data && data.data.success === false)) {
          const errorMessage =
            data.error?.message ||
            data.data?.error?.message ||
            `HTTP error! status: ${response.status}`;
          throw new Error(errorMessage);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle nested response format from backend
      let actualData = data;
      if (data.data && typeof data.data === 'object' && data.data.success !== undefined) {
        // Backend returns nested format: { data: { success: true, data: {...} } }
        actualData = data.data;
      }

      // Ensure response has expected format
      if (actualData.success !== true) {
        throw new Error('Invalid API response format');
      }

      return actualData as ApiSuccessResponse<T>;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error instanceof Error ? error : new Error('Unknown API error');
    }
  }

  /**
   * Get all platform settings (handles both flat and nested API responses)
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const response = await this.makeRequest<any>('/admin/platform-settings');

      // Check if response is nested by categories or flat
      if (this.isNestedResponse(response.data)) {
        // Enterprise nested format - flatten it for UI consumption
        return this.flattenNestedSettings(response.data);
      } else {
        // Already flat format
        return response.data as PlatformSettings;
      }
    } catch (error) {
      console.warn('Failed to load platform settings, using defaults:', error);
      return DEFAULT_PLATFORM_SETTINGS;
    }
  }

  /**
   * Update platform settings using bulk update API
   */
  async updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    try {
      // Convert partial settings to update requests
      const updates: SettingUpdateRequest[] = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        reason: 'Updated via admin panel',
      }));

      const request: UpdatePlatformSettingsRequest = {
        updates,
        reason: 'Bulk update via admin panel',
        environment: 'development',
      };

      const response = await this.makeRequest<any>('/admin/platform-settings', {
        method: 'PATCH',
        body: JSON.stringify(request),
      });

      // Check if all updates were successful
      if (response.data.results) {
        const failedUpdates = response.data.results.filter((r: any) => !r.success);
        if (failedUpdates.length > 0) {
          const errors = failedUpdates.map((f: any) => f.error).join(', ');
          throw new Error(`Some settings failed to update: ${errors}`);
        }
      }

      // Return updated settings by fetching them again
      return await this.getPlatformSettings();
    } catch (error) {
      console.error('Failed to update platform settings:', error);
      throw error;
    }
  }

  /**
   * Reset platform settings to defaults
   */
  async resetToDefaults(): Promise<PlatformSettings> {
    try {
      const response = await this.makeRequest<PlatformSettings>('/admin/platform-settings/reset', {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to reset platform settings:', error);
      throw error;
    }
  }

  /**
   * Validate platform settings before saving
   */
  async validateSettings(settings: Partial<PlatformSettings>): Promise<ValidateSettingsResponse> {
    try {
      const request = {
        settings,
        environment: 'development',
      };

      const response = await this.makeRequest<ValidateSettingsResponse>(
        '/admin/platform-settings/validate',
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
      );

      return response.data;
    } catch (error) {
      console.error('Failed to validate settings:', error);
      throw error;
    }
  }

  /**
   * Get pending merchant approvals
   */
  async getPendingMerchants(): Promise<PendingMerchant[]> {
    try {
      const response = await this.makeRequest<PendingMerchant[]>('/admin/pending-merchants');
      return response.data;
    } catch (error) {
      console.warn('Failed to load pending merchants:', error);
      return [];
    }
  }

  /**
   * Approve a merchant account
   */
  async approveMerchant(
    merchantId: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(
        `/admin/merchants/${merchantId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to approve merchant:', error);
      throw error;
    }
  }

  /**
   * Reject a merchant account
   */
  async rejectMerchant(
    merchantId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(
        `/admin/merchants/${merchantId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to reject merchant:', error);
      throw error;
    }
  }

  /**
   * Client-side validation for settings before API calls
   */
  validateSettingsLocal(settings: Partial<PlatformSettings>): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const rules = VALIDATION_RULES[key as keyof PlatformSettings];
      if (!rules) {
        errors.push(`Unknown setting: ${key}`);
        continue;
      }

      // Type validation
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${key} must be a number`);
        continue;
      }

      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${key} must be a boolean`);
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${key} must be a string`);
        continue;
      }

      if (rules.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${key} must be a valid email address`);
          continue;
        }
      }

      // Range validation for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must be at most ${rules.max}`);
        }
      }

      // String length validation
      if (typeof value === 'string') {
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${key} must be at least ${rules.min} characters`);
        }

        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${key} must be at most ${rules.max} characters`);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
      }
    }

    return errors;
  }

  /**
   * Get default settings (useful for UI reset functionality)
   */
  getDefaultSettings(): PlatformSettings {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }

  /**
   * Check if API response is in nested format (enterprise structure)
   */
  private isNestedResponse(data: any): boolean {
    // Check if data has category keys that contain setting objects
    if (!data || typeof data !== 'object') return false;

    // Look for common category names that contain objects
    const possibleCategories = ['general', 'financial', 'security', 'features', 'notifications'];
    return possibleCategories.some(
      (category) => data[category] && typeof data[category] === 'object',
    );
  }

  /**
   * Flatten nested category-based settings to flat PlatformSettings object
   */
  private flattenNestedSettings(nestedData: any): PlatformSettings {
    const flattened: any = {};

    // Iterate through categories and merge all settings into flat structure
    for (const [, categorySettings] of Object.entries(nestedData)) {
      if (categorySettings && typeof categorySettings === 'object') {
        Object.assign(flattened, categorySettings);
      }
    }

    // Ensure all default settings are present
    return { ...DEFAULT_PLATFORM_SETTINGS, ...flattened };
  }

  /**
   * Get settings organized by category (for enterprise UI organization)
   */
  async getPlatformSettingsByCategory(): Promise<{ [category: string]: { [key: string]: any } }> {
    try {
      const response = await this.makeRequest<any>('/admin/platform-settings');

      if (this.isNestedResponse(response.data)) {
        return response.data;
      } else {
        // Convert flat to nested if needed
        return this.organizeSettingsByCategory(response.data);
      }
    } catch (error) {
      console.warn('Failed to load categorized settings, using defaults:', error);
      return this.organizeSettingsByCategory(DEFAULT_PLATFORM_SETTINGS);
    }
  }

  /**
   * Organize flat settings by category
   */
  private organizeSettingsByCategory(flatSettings: PlatformSettings): {
    [category: string]: { [key: string]: any };
  } {
    const categorized: { [category: string]: { [key: string]: any } } = {
      general: {},
      financial: {},
      security: {},
      features: {},
      notifications: {},
    };

    // Categorize settings based on their names (simple categorization)
    for (const [key, value] of Object.entries(flatSettings)) {
      if (
        key.includes('platformName') ||
        key.includes('supportEmail') ||
        key.includes('Currency') ||
        key.includes('timeZone')
      ) {
        categorized.general[key] = value;
      } else if (
        key.includes('Credit') ||
        key.includes('Amount') ||
        key.includes('Fee') ||
        key.includes('Rate') ||
        key.includes('payment') ||
        key.includes('grace') ||
        key.includes('retries') ||
        key.includes('interest')
      ) {
        categorized.financial[key] = value;
      } else if (
        key.includes('TwoFactor') ||
        key.includes('session') ||
        key.includes('password') ||
        key.includes('Login') ||
        key.includes('fraud')
      ) {
        categorized.security[key] = value;
      } else if (
        key.includes('enable') ||
        key.includes('require') ||
        key.includes('maintenance') ||
        key.includes('auto')
      ) {
        categorized.features[key] = value;
      } else if (
        key.includes('Notification') ||
        key.includes('Email') ||
        key.includes('SMS') ||
        key.includes('Webhook')
      ) {
        categorized.notifications[key] = value;
      } else {
        // Default to general if unsure
        categorized.general[key] = value;
      }
    }

    return categorized;
  }

  // Legacy method aliases for backward compatibility
  async getSettings(): Promise<PlatformSettings> {
    return this.getPlatformSettings();
  }

  async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return this.updatePlatformSettings(settings);
  }
}

export const platformSettingsService = new PlatformSettingsService();

// Export types for components to use - interfaces are already exported above
