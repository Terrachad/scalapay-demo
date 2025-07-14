import { apiClient } from '@/lib/api-client';
import { AxiosError } from 'axios';

// Types matching backend DTOs
export interface PaymentGatewayConfig {
  id: string;
  configKey: string;
  value: string;
  category: ConfigCategory;
  environment: Environment;
  provider?: GatewayProvider;
  description?: string;
  isEncrypted: boolean;
  isActive: boolean;
  isSensitive: boolean;
  metadata?: ConfigMetadata;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastValidatedAt?: Date;
  validationStatus: 'pending' | 'valid' | 'invalid' | 'expired';
  validationError?: string;
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export enum ConfigCategory {
  GATEWAY = 'gateway',
  PROCESSING = 'processing',
  SECURITY = 'security',
  WEBHOOKS = 'webhooks',
  FRAUD = 'fraud',
  COMPLIANCE = 'compliance',
}

export enum GatewayProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  BRAINTREE = 'braintree',
}

export interface ConfigMetadata {
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  ui?: {
    label: string;
    placeholder?: string;
    helpText?: string;
    inputType?: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'switch';
    order?: number;
  };
}

export interface PaymentConfigUpdateRequest {
  configKey: string;
  value: string;
  category: ConfigCategory;
  provider?: GatewayProvider;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  metadata?: ConfigMetadata;
}

export interface BulkUpdateRequest {
  updates: PaymentConfigUpdateRequest[];
  reason?: string;
}

export interface PaymentConfigResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: string[];
  requestId?: string;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ValidationResponse extends PaymentConfigResponse {
  data: ValidationResult;
}

export interface ConfigGroupedData {
  [category: string]: PaymentGatewayConfig[];
}

export interface ConfigSchema {
  [category: string]: {
    [configKey: string]: {
      dataType: string;
      validation?: any;
      ui?: any;
      description?: string;
      sensitive?: boolean;
    };
  };
}

export interface AuditRecord {
  id: string;
  configKey: string;
  oldValue?: string;
  newValue?: string;
  operation: string;
  category: ConfigCategory;
  environment: Environment;
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  reason?: string;
  metadata?: any;
  isSuccessful: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface AuditTrailSummary {
  configKey: string;
  totalChanges: number;
  lastModified: Date;
  lastModifiedBy: string;
  recentOperations: string[];
  hasErrors: boolean;
}

export interface AuditQueryFilters {
  environment?: Environment;
  configKey?: string;
  category?: ConfigCategory;
  operation?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isSuccessful?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditResponse {
  records: AuditRecord[];
  total: number;
  hasMore: boolean;
}

export interface HealthStatus {
  status: string;
  database: { status: string };
  configurations: { status: string };
  validation: { status: string };
  audit: { status: string };
}

export class PaymentGatewayConfigService {
  private readonly baseUrl = '/admin/payment-gateway-config';
  private currentEnvironment: Environment = Environment.DEVELOPMENT;
  private requestIdCounter = 0;

  /**
   * Set current environment for all operations
   */
  setEnvironment(environment: Environment): void {
    this.currentEnvironment = environment;
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Handle API errors with structured logging
   */
  private handleApiError(error: AxiosError, operation: string): never {
    const requestId = this.generateRequestId();
    const errorData = error.response?.data as any;
    const errorMessage = errorData?.message || error.message;
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';

    console.error(`PaymentGatewayConfigService: ${operation} failed`, {
      requestId,
      errorCode,
      errorMessage,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      timestamp: new Date().toISOString(),
    });

    throw new Error(`${operation} failed: ${errorMessage} (Request ID: ${requestId})`);
  }

  /**
   * Get all payment gateway configurations for current environment
   */
  async getAllConfigs(): Promise<ConfigGroupedData> {
    try {
      const response = await apiClient.get<PaymentConfigResponse>(
        `${this.baseUrl}?environment=${this.currentEnvironment}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch configurations');
      }

      return response.data.data || {};
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get All Configurations');
    }
  }

  /**
   * Bulk update multiple configurations with transaction support
   */
  async bulkUpdate(
    updates: PaymentConfigUpdateRequest[],
    reason?: string,
  ): Promise<{
    updated: number;
    batchId: string;
  }> {
    try {
      const bulkRequest: BulkUpdateRequest = {
        updates,
        reason,
      };

      const response = await apiClient.patch<PaymentConfigResponse>(
        `${this.baseUrl}?environment=${this.currentEnvironment}`,
        bulkRequest,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Bulk update failed');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Bulk Update');
    }
  }

  /**
   * Validate a single configuration value
   */
  async validateConfig(configKey: string, value: string): Promise<ValidationResult> {
    try {
      const response = await apiClient.post<ValidationResponse>(
        `${this.baseUrl}/validate?environment=${this.currentEnvironment}`,
        { configKey, value },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Validation failed');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Validate Configuration');
    }
  }

  /**
   * Reset all configurations to default values
   */
  async resetToDefaults(reason?: string): Promise<{ reset: number }> {
    try {
      const response = await apiClient.post<PaymentConfigResponse>(
        `${this.baseUrl}/reset?environment=${this.currentEnvironment}`,
        { reason },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Reset failed');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Reset to Defaults');
    }
  }

  /**
   * Get configuration schema for dynamic form generation
   */
  async getConfigSchema(): Promise<ConfigSchema> {
    try {
      const response = await apiClient.get<PaymentConfigResponse>(
        `${this.baseUrl}/schema?environment=${this.currentEnvironment}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch schema');
      }

      return response.data.data || {};
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get Configuration Schema');
    }
  }

  /**
   * Get audit trail with filtering and pagination
   */
  async getAuditTrail(filters: AuditQueryFilters = {}): Promise<AuditResponse> {
    try {
      const queryParams = new URLSearchParams({
        environment: filters.environment || this.currentEnvironment,
        ...(filters.configKey && { configKey: filters.configKey }),
        ...(filters.category && { category: filters.category }),
        ...(filters.operation && { operation: filters.operation }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.isSuccessful !== undefined && {
          isSuccessful: filters.isSuccessful.toString(),
        }),
        limit: (filters.limit || 50).toString(),
        offset: (filters.offset || 0).toString(),
      });

      const response = await apiClient.get<PaymentConfigResponse>(
        `${this.baseUrl}/audit?${queryParams}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch audit trail');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get Audit Trail');
    }
  }

  /**
   * Get audit trail for a specific configuration
   */
  async getConfigAuditTrail(
    configKey: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    summary: AuditTrailSummary;
    history: AuditRecord[];
  }> {
    try {
      const response = await apiClient.get<PaymentConfigResponse>(
        `${this.baseUrl}/audit/${configKey}?environment=${this.currentEnvironment}&limit=${limit}&offset=${offset}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch configuration audit trail');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get Configuration Audit Trail');
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const response = await apiClient.get<PaymentConfigResponse>(`${this.baseUrl}/health`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch health status');
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get Health Status');
    }
  }

  /**
   * Get environment-specific configuration defaults
   */
  async getDefaultConfigurations(environment: Environment): Promise<ConfigGroupedData> {
    try {
      const response = await apiClient.get<PaymentConfigResponse>(
        `${this.baseUrl}?environment=${environment}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch default configurations');
      }

      return response.data.data || {};
    } catch (error) {
      this.handleApiError(error as AxiosError, 'Get Default Configurations');
    }
  }

  /**
   * Real-time validation with debouncing
   */
  private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
  private validationDebounceTimers = new Map<string, NodeJS.Timeout>();

  async validateConfigDebounced(
    configKey: string,
    value: string,
    debounceMs: number = 300,
  ): Promise<ValidationResult> {
    const cacheKey = `${configKey}:${value}`;
    const cached = this.validationCache.get(cacheKey);

    // Return cached result if within 5 seconds
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.result;
    }

    return new Promise((resolve, reject) => {
      // Clear existing timer
      const existingTimer = this.validationDebounceTimers.get(configKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          const result = await this.validateConfig(configKey, value);

          // Cache result
          this.validationCache.set(cacheKey, {
            result,
            timestamp: Date.now(),
          });

          // Clean up timer
          this.validationDebounceTimers.delete(configKey);

          resolve(result);
        } catch (error) {
          this.validationDebounceTimers.delete(configKey);
          reject(error);
        }
      }, debounceMs);

      this.validationDebounceTimers.set(configKey, timer);
    });
  }

  /**
   * Utility method to transform flat config array to grouped structure
   */
  static groupConfigsByCategory(configs: PaymentGatewayConfig[]): ConfigGroupedData {
    return configs.reduce((groups, config) => {
      const category = config.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(config);
      return groups;
    }, {} as ConfigGroupedData);
  }

  /**
   * Utility method to validate environment transition
   */
  static validateEnvironmentTransition(
    from: Environment,
    to: Environment,
    configs: PaymentGatewayConfig[],
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for test keys in production
    if (to === Environment.PRODUCTION) {
      const testKeys = configs.filter(
        (config) => config.value.includes('_test_') || config.value.includes('sandbox'),
      );

      if (testKeys.length > 0) {
        warnings.push(`${testKeys.length} test/sandbox keys found in production environment`);
      }
    }

    // Check for production keys in development
    if (to === Environment.DEVELOPMENT) {
      const liveKeys = configs.filter(
        (config) => config.value.includes('_live_') || config.value.includes('production'),
      );

      if (liveKeys.length > 0) {
        warnings.push(`${liveKeys.length} live/production keys found in development environment`);
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Utility method to get configuration by key
   */
  static getConfigByKey(
    groupedConfigs: ConfigGroupedData,
    configKey: string,
  ): PaymentGatewayConfig | undefined {
    for (const category in groupedConfigs) {
      const config = groupedConfigs[category].find((c) => c.configKey === configKey);
      if (config) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Utility method to get sensitive configurations
   */
  static getSensitiveConfigs(groupedConfigs: ConfigGroupedData): PaymentGatewayConfig[] {
    const sensitiveConfigs: PaymentGatewayConfig[] = [];

    for (const category in groupedConfigs) {
      const configs = groupedConfigs[category].filter((c) => c.isSensitive);
      sensitiveConfigs.push(...configs);
    }

    return sensitiveConfigs;
  }

  /**
   * Utility method to check if configuration is properly encrypted
   */
  static isConfigProperlySecured(config: PaymentGatewayConfig): boolean {
    if (config.isSensitive) {
      return config.isEncrypted || config.value.startsWith('***');
    }
    return true;
  }
}

// Export singleton instance
export const paymentGatewayConfigService = new PaymentGatewayConfigService();
