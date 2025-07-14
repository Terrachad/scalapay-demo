import { apiClient } from '@/lib/api-client';

// Enhanced PaymentMethod interface for enterprise features
export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet';
  status: 'active' | 'inactive' | 'expired' | 'pending_verification' | 'blocked';
  stripePaymentMethodId: string;
  stripeCustomerId?: string;

  // Card details
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: 'credit' | 'debit' | 'prepaid';

  // Enterprise features
  cardPosition: number; // Position in user's card list (1-10)
  isDefault: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
  riskScore: number; // 0-1 risk assessment
  fraudFlags: string[];

  // Auto-update functionality
  autoUpdateData?: {
    lastUpdateCheck: Date;
    updateSource: 'stripe_updater' | 'manual' | 'bank_notification';
    previousDetails?: {
      expMonth: number;
      expYear: number;
      brand: string;
    };
    updateHistory: Array<{
      date: Date;
      source: string;
      changes: Record<string, any>;
    }>;
  };

  // Usage restrictions for enterprise control
  usageRestrictions?: {
    maxDailyAmount?: number;
    maxMonthlyAmount?: number;
    allowedMerchants?: string[];
    restrictedCountries?: string[];
    timeRestrictions?: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };

  // GDPR compliance data
  complianceData?: {
    gdprConsent: boolean;
    consentDate: Date;
    dataRetentionExpiry: Date;
    processingPurposes: string[];
  };

  // Usage statistics
  usageCount: number;
  lastUsed?: Date;
  failureCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Request interfaces
export interface CreatePaymentMethodRequest {
  stripePaymentMethodId: string;
  isDefault?: boolean;
  position?: number;
  usageRestrictions?: PaymentMethod['usageRestrictions'];
}

export interface UpdatePaymentMethodRequest {
  isDefault?: boolean;
  position?: number;
  usageRestrictions?: PaymentMethod['usageRestrictions'];
  status?: PaymentMethod['status'];
}

export interface CardOrder {
  id: string;
  position: number;
}

export interface UsageRestrictions {
  maxDailyAmount?: number;
  maxMonthlyAmount?: number;
  allowedMerchants?: string[];
  restrictedCountries?: string[];
  timeRestrictions?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

// Analytics interfaces
export interface PaymentMethodAnalytics {
  usageStats: {
    totalTransactions: number;
    totalAmount: number;
    averageTransactionAmount: number;
    successRate: number;
    lastUsed?: Date;
  };
  riskAssessment: {
    currentScore: number;
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    recommendations: string[];
  };
  complianceStatus: {
    gdprCompliant: boolean;
    dataRetentionStatus: 'current' | 'expiring_soon' | 'expired';
    lastConsentUpdate?: Date;
  };
}

export interface PaymentMethodSummary {
  totalMethods: number;
  activeMethodsCount: number;
  defaultMethod?: PaymentMethod;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  brandDistribution: Record<string, number>;
  autoUpdateEligible: number;
  securityScore?: number;
}

/**
 * Enterprise-grade Payment Method Service
 * Handles advanced card management with positioning, restrictions, auto-updates, and compliance
 */
export class PaymentMethodService {
  /**
   * Get all payment methods for a user with enterprise features
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for payment methods');
    }
    const response = await apiClient.get<PaymentMethod[]>('/payment-methods');
    // The basic endpoint returns PaymentMethod[] directly for legacy compatibility
    return response.data;
  }

  /**
   * Add a new payment method with enterprise features
   */
  async addPaymentMethod(request: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    const response = await apiClient.post<PaymentMethod>('/payment-methods', request);
    return (response.data as any).data || response.data;
  }

  /**
   * Update an existing payment method
   */
  async updatePaymentMethod(
    id: string,
    updates: UpdatePaymentMethodRequest,
  ): Promise<PaymentMethod> {
    const response = await apiClient.put<PaymentMethod>(`/payment-methods/${id}`, updates);
    return (response.data as any).data || response.data;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: string): Promise<void> {
    await apiClient.delete(`/payment-methods/${id}`);
  }

  /**
   * Reorder payment methods (enterprise card positioning)
   */
  async reorderPaymentMethods(newOrder: CardOrder[]): Promise<void> {
    await apiClient.put('/payment-methods/reorder', { order: newOrder });
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(id: string): Promise<void> {
    await apiClient.put(`/payment-methods/${id}/default`);
  }

  /**
   * Update usage restrictions for enterprise control
   */
  async updateUsageRestrictions(id: string, restrictions: UsageRestrictions): Promise<void> {
    await apiClient.put(`/payment-methods/${id}/restrictions`, { restrictions });
  }

  /**
   * Verify a payment method (for compliance)
   */
  async verifyPaymentMethod(id: string): Promise<PaymentMethod> {
    const response = await apiClient.post<PaymentMethod>(`/payment-methods/${id}/verify`);
    return (response.data as any).data || response.data;
  }

  /**
   * Get detailed analytics for a payment method
   */
  async getPaymentMethodAnalytics(id: string): Promise<PaymentMethodAnalytics> {
    const response = await apiClient.get<PaymentMethodAnalytics>(
      `/payment-methods/${id}/analytics`,
    );
    return (response.data as any).data || response.data;
  }

  /**
   * Get summary analytics for all user's payment methods
   */
  async getPaymentMethodSummary(userId: string): Promise<PaymentMethodSummary> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for payment method summary');
    }
    try {
      const response = await apiClient.get<PaymentMethodSummary>(
        '/payment-methods/analytics/summary',
      );
      return (response.data as any).data || response.data;
    } catch (error: any) {
      // Fallback to default summary if endpoint not available
      if (error.response?.status === 404) {
        console.warn('Payment method summary endpoint not available, using default values');
        return this.getDefaultSummary();
      }
      throw error;
    }
  }

  /**
   * Generate default payment method summary
   */
  private getDefaultSummary(): PaymentMethodSummary {
    return {
      totalMethods: 0,
      activeMethodsCount: 0,
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
      },
      brandDistribution: {},
      autoUpdateEligible: 0,
    };
  }

  /**
   * Trigger auto-update check for a payment method
   */
  async triggerAutoUpdate(id: string): Promise<{ updated: boolean; changes?: any }> {
    const response = await apiClient.post<{ updated: boolean; changes?: any }>(
      `/payment-methods/${id}/auto-update`,
    );
    return (response.data as any).data || response.data;
  }

  /**
   * Get auto-update status for all user's payment methods
   */
  async getAutoUpdateStatus(userId: string): Promise<
    Array<{
      paymentMethodId: string;
      lastCheck: Date;
      nextCheck: Date;
      updateAvailable: boolean;
      eligibleForUpdate: boolean;
    }>
  > {
    const response = await apiClient.get('/payment-methods/auto-update/status', {
      params: { userId },
    });
    return (response.data as any).data || response.data;
  }

  /**
   * Check if user can add more cards (10 card limit)
   */
  async canAddMoreCards(
    userId: string,
  ): Promise<{ canAdd: boolean; currentCount: number; maxAllowed: number }> {
    const response = await apiClient.get('/payment-methods/can-add-more', {
      params: { userId },
    });
    return (response.data as any).data || response.data;
  }

  /**
   * Get recommended card for a transaction (risk-based selection)
   */
  async getRecommendedCard(
    userId: string,
    transactionData: {
      amount: number;
      merchantId: string;
      country: string;
    },
  ): Promise<{ recommendedCard: PaymentMethod; reason: string; alternatives: PaymentMethod[] }> {
    const response = await apiClient.post('/payment-methods/recommend', {
      userId,
      ...transactionData,
    });
    return (response.data as any).data || response.data;
  }
}

// Export singleton instance
export const paymentMethodService = new PaymentMethodService();
