import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EarlyPaymentOption,
  EarlyPaymentRequest,
  EarlyPaymentResult,
  EarlyPaymentRecord,
  EarlyPaymentInsights,
  EarlyPaymentConfig,
  PartialPaymentOption,
  DateRange,
  earlyPaymentService,
} from '@/services/early-payment-service';

interface EarlyPaymentState {
  // Core state
  earlyPaymentOptions: EarlyPaymentOption[];
  selectedTransaction: string | null;
  calculationResult: EarlyPaymentResult | null;
  paymentHistory: EarlyPaymentRecord[];
  insights: EarlyPaymentInsights | null;

  // Partial payment state
  partialPaymentOptions: PartialPaymentOption[];
  selectedInstallments: string[];

  // Config state
  merchantConfigs: Record<string, EarlyPaymentConfig>;

  // UI state
  isLoading: boolean;
  isCalculating: boolean;
  isProcessing: boolean;
  error: string | null;

  // Recommendations state
  recommendations: Array<{
    transactionId: string;
    merchantName: string;
    potentialSavings: number;
    discountPercentage: number;
    expiresAt: Date;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  totalPotentialSavings: number;

  // Analytics state
  analytics: {
    totalEarlyPayments: number;
    totalSavingsProvided: number;
    averageDiscountRate: number;
    adoptionRate: number;
    monthlyTrends: Array<{
      month: string;
      paymentsCount: number;
      savingsProvided: number;
    }>;
  } | null;

  // Actions - Core Operations
  fetchEarlyPaymentOptions: (transactionId: string) => Promise<void>;
  calculateEarlyPayment: (request: Omit<EarlyPaymentRequest, 'applyDiscount'>) => Promise<void>;
  processFullEarlyPayment: (request: EarlyPaymentRequest) => Promise<EarlyPaymentRecord>;
  processPartialEarlyPayment: (request: EarlyPaymentRequest) => Promise<EarlyPaymentRecord>;
  cancelEarlyPayment: (
    earlyPaymentId: string,
    reason: string,
  ) => Promise<{ cancelled: boolean; refundAmount: number }>;

  // Actions - History & Analytics
  fetchPaymentHistory: (userId: string, dateRange?: DateRange, limit?: number) => Promise<void>;
  fetchInsights: (userId: string) => Promise<void>;
  fetchAnalytics: (merchantId?: string, dateRange?: DateRange) => Promise<void>;
  exportEarlyPaymentHistory: (
    userId: string,
    options: {
      transactionIds?: string[];
      period?: string;
      status?: string;
      format?: 'csv' | 'json' | 'pdf';
    },
  ) => Promise<{ downloadUrl: string; fileName: string }>;
  clearHistoryError: () => void;

  // Actions - Partial Payments
  fetchPartialPaymentOptions: (transactionId: string, installmentIds: string[]) => Promise<void>;
  updateSelectedInstallments: (installmentIds: string[]) => void;

  // Actions - Configuration
  fetchMerchantConfig: (merchantId: string) => Promise<void>;

  // Actions - Recommendations
  fetchRecommendations: (userId: string) => Promise<void>;

  // Actions - Advanced Features
  calculateCustomPaymentSavings: (
    transactionId: string,
    customAmount: number,
    paymentMethodId: string,
  ) => Promise<{
    originalAmount: number;
    customAmount: number;
    discountAmount: number;
    finalAmount: number;
    savings: number;
  }>;

  simulateEarlyPaymentScenarios: (
    transactionId: string,
    scenarios: Array<{
      paymentType: 'full' | 'partial';
      amount?: number;
      installmentIds?: string[];
      paymentDate?: Date;
    }>,
  ) => Promise<
    Array<{
      scenario: any;
      savings: number;
      discountAmount: number;
      finalAmount: number;
      recommendationScore: number;
    }>
  >;

  // Selectors
  getEarlyPaymentOptionsByType: (type: 'full' | 'partial') => EarlyPaymentOption[];
  getBestEarlyPaymentOption: () => EarlyPaymentOption | null;
  getTotalSavings: () => number;
  getRecentPayments: (limit: number) => EarlyPaymentRecord[];
  getMerchantConfig: (merchantId: string) => EarlyPaymentConfig | null;
  getSelectedInstallmentOptions: () => PartialPaymentOption[];

  // Utility Actions
  setSelectedTransaction: (transactionId: string | null) => void;
  clearCalculationResult: () => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  earlyPaymentOptions: [],
  selectedTransaction: null,
  calculationResult: null,
  paymentHistory: [],
  insights: null,
  partialPaymentOptions: [],
  selectedInstallments: [],
  merchantConfigs: {},
  isLoading: false,
  isCalculating: false,
  isProcessing: false,
  error: null,
  recommendations: [],
  totalPotentialSavings: 0,
  analytics: null,
};

export const useEarlyPaymentStore = create<EarlyPaymentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== CORE OPERATIONS =====

      fetchEarlyPaymentOptions: async (transactionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const options = await earlyPaymentService.getEarlyPaymentOptions(transactionId);
          set({
            earlyPaymentOptions: options,
            selectedTransaction: transactionId,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch early payment options',
            isLoading: false,
          });
          throw error;
        }
      },

      calculateEarlyPayment: async (request) => {
        set({ isCalculating: true, error: null });
        try {
          const result = await earlyPaymentService.calculateEarlyPayment(request);
          set({
            calculationResult: result,
            isCalculating: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to calculate early payment',
            isCalculating: false,
          });
          throw error;
        }
      },

      processFullEarlyPayment: async (request) => {
        set({ isProcessing: true, error: null });
        try {
          const result = await earlyPaymentService.processFullEarlyPayment(request);

          // Update payment history
          set((state) => ({
            paymentHistory: [result, ...state.paymentHistory],
            calculationResult: null,
            isProcessing: false,
          }));

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to process early payment',
            isProcessing: false,
          });
          throw error;
        }
      },

      processPartialEarlyPayment: async (request) => {
        set({ isProcessing: true, error: null });
        try {
          const result = await earlyPaymentService.processPartialEarlyPayment(request);

          // Update payment history
          set((state) => ({
            paymentHistory: [result, ...state.paymentHistory],
            calculationResult: null,
            selectedInstallments: [],
            isProcessing: false,
          }));

          return result;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to process partial early payment',
            isProcessing: false,
          });
          throw error;
        }
      },

      cancelEarlyPayment: async (earlyPaymentId: string, reason: string) => {
        set({ isProcessing: true, error: null });
        try {
          const result = await earlyPaymentService.cancelEarlyPayment(earlyPaymentId, reason);

          // Update the payment history to reflect cancellation
          set((state) => ({
            paymentHistory: state.paymentHistory.map((payment) =>
              payment.id === earlyPaymentId ? { ...payment, status: 'refunded' as const } : payment,
            ),
            isProcessing: false,
          }));

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to cancel early payment',
            isProcessing: false,
          });
          throw error;
        }
      },

      // ===== HISTORY & ANALYTICS =====

      fetchPaymentHistory: async (userId: string, dateRange?: DateRange, limit?: number) => {
        set({ isLoading: true, error: null });
        try {
          const history = await earlyPaymentService.getEarlyPaymentHistory(
            userId,
            dateRange,
            limit,
          );
          set({
            paymentHistory: history,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch payment history',
            isLoading: false,
          });
          throw error;
        }
      },

      fetchInsights: async (userId: string) => {
        try {
          const insights = await earlyPaymentService.getEarlyPaymentInsights(userId);
          set({ insights });
        } catch (error) {
          console.error('Failed to fetch insights:', error);
        }
      },

      fetchAnalytics: async (merchantId?: string, dateRange?: DateRange) => {
        try {
          const analytics = await earlyPaymentService.getEarlyPaymentAnalytics(
            merchantId,
            dateRange,
          );
          set({ analytics });
        } catch (error) {
          console.error('Failed to fetch analytics:', error);
        }
      },

      exportEarlyPaymentHistory: async (userId: string, options) => {
        set({ isLoading: true, error: null });
        try {
          const result = await earlyPaymentService.exportEarlyPaymentHistory(userId, options);
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to export payment history',
            isLoading: false,
          });
          throw error;
        }
      },

      clearHistoryError: () => {
        set({ error: null });
      },

      // ===== PARTIAL PAYMENTS =====

      fetchPartialPaymentOptions: async (transactionId: string, installmentIds: string[]) => {
        set({ isLoading: true, error: null });
        try {
          const options = await earlyPaymentService.getPartialPaymentOptions(
            transactionId,
            installmentIds,
          );
          set({
            partialPaymentOptions: options,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch partial payment options',
            isLoading: false,
          });
          throw error;
        }
      },

      updateSelectedInstallments: (installmentIds: string[]) => {
        set({ selectedInstallments: installmentIds });

        // Update the selected state in partial payment options
        set((state) => ({
          partialPaymentOptions: state.partialPaymentOptions.map((option) => ({
            ...option,
            selected: installmentIds.includes(option.installmentId),
          })),
        }));
      },

      // ===== CONFIGURATION =====

      fetchMerchantConfig: async (merchantId: string) => {
        try {
          const config = await earlyPaymentService.getMerchantEarlyPaymentConfig(merchantId);
          set((state) => ({
            merchantConfigs: {
              ...state.merchantConfigs,
              [merchantId]: config,
            },
          }));
        } catch (error) {
          console.error('Failed to fetch merchant config:', error);
        }
      },

      // ===== RECOMMENDATIONS =====

      fetchRecommendations: async (userId: string) => {
        try {
          const result = await earlyPaymentService.getEarlyPaymentRecommendations(userId);
          set({
            recommendations: result.recommendations,
            totalPotentialSavings: result.totalPotentialSavings,
          });
        } catch (error) {
          console.error('Failed to fetch recommendations:', error);
        }
      },

      // ===== ADVANCED FEATURES =====

      calculateCustomPaymentSavings: async (
        transactionId: string,
        customAmount: number,
        paymentMethodId: string,
      ) => {
        try {
          return await earlyPaymentService.calculateCustomPaymentSavings(
            transactionId,
            customAmount,
            paymentMethodId,
          );
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to calculate custom savings',
          });
          throw error;
        }
      },

      simulateEarlyPaymentScenarios: async (transactionId: string, scenarios) => {
        try {
          return await earlyPaymentService.simulateEarlyPaymentScenarios(transactionId, scenarios);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to simulate scenarios',
          });
          throw error;
        }
      },

      // ===== SELECTORS =====

      getEarlyPaymentOptionsByType: (type: 'full' | 'partial') => {
        const { earlyPaymentOptions } = get();
        return earlyPaymentOptions.filter((option) => option.paymentType === type);
      },

      getBestEarlyPaymentOption: () => {
        const { earlyPaymentOptions } = get();
        if (earlyPaymentOptions.length === 0) return null;

        return earlyPaymentOptions.reduce((best, current) =>
          current.netSavings > best.netSavings ? current : best,
        );
      },

      getTotalSavings: () => {
        const { paymentHistory } = get();
        return paymentHistory
          .filter((payment) => payment.status === 'completed')
          .reduce((total, payment) => total + payment.savings, 0);
      },

      getRecentPayments: (limit: number) => {
        const { paymentHistory } = get();
        return paymentHistory
          .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
          .slice(0, limit);
      },

      getMerchantConfig: (merchantId: string) => {
        const { merchantConfigs } = get();
        return merchantConfigs[merchantId] || null;
      },

      getSelectedInstallmentOptions: () => {
        const { partialPaymentOptions, selectedInstallments } = get();
        return partialPaymentOptions.filter((option) =>
          selectedInstallments.includes(option.installmentId),
        );
      },

      // ===== UTILITY ACTIONS =====

      setSelectedTransaction: (transactionId) => {
        set({ selectedTransaction: transactionId });
      },

      clearCalculationResult: () => {
        set({ calculationResult: null });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'early-payment-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        insights: state.insights,
        analytics: state.analytics,
        totalPotentialSavings: state.totalPotentialSavings,
        // Don't persist payment history or options for security
      }),
    },
  ),
);
