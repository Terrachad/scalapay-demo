import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PaymentMethod,
  PaymentMethodSummary,
  PaymentMethodAnalytics,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  CardOrder,
  UsageRestrictions,
  paymentMethodService,
} from '@/services/payment-method-service';

interface PaymentMethodState {
  // Core state
  paymentMethods: PaymentMethod[];
  selectedMethod: PaymentMethod | null;
  defaultMethod: PaymentMethod | null;
  summary: PaymentMethodSummary | null;

  // UI state
  isLoading: boolean;
  isReordering: boolean;
  error: string | null;

  // Auto-update state
  autoUpdateSettings: {
    enabled: boolean;
    notificationEnabled: boolean;
    lastUpdateCheck?: Date;
  };

  // Analytics state
  analytics: Record<string, PaymentMethodAnalytics>;

  // Actions - Data Management
  fetchPaymentMethods: (userId: string) => Promise<void>;
  addPaymentMethod: (request: CreatePaymentMethodRequest) => Promise<PaymentMethod>;
  updatePaymentMethod: (id: string, updates: UpdatePaymentMethodRequest) => Promise<PaymentMethod>;
  deletePaymentMethod: (id: string) => Promise<void>;
  refreshPaymentMethods: (userId: string) => Promise<void>;

  // Actions - Card Management
  reorderPaymentMethods: (newOrder: CardOrder[]) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  updateUsageRestrictions: (id: string, restrictions: UsageRestrictions) => Promise<void>;
  verifyPaymentMethod: (id: string) => Promise<PaymentMethod>;

  // Actions - Analytics
  fetchPaymentMethodAnalytics: (id: string) => Promise<PaymentMethodAnalytics>;
  fetchSummary: (userId: string) => Promise<void>;

  // Actions - Auto-update
  triggerAutoUpdate: (id: string) => Promise<{ updated: boolean; changes?: any }>;
  updateAutoUpdateSettings: (settings: Partial<PaymentMethodState['autoUpdateSettings']>) => void;

  // Actions - Utility
  canAddMoreCards: (
    userId: string,
  ) => Promise<{ canAdd: boolean; currentCount: number; maxAllowed: number }>;
  getRecommendedCard: (
    userId: string,
    transactionData: {
      amount: number;
      merchantId: string;
      country: string;
    },
  ) => Promise<{ recommendedCard: PaymentMethod; reason: string; alternatives: PaymentMethod[] }>;

  // Selectors
  getPaymentMethodById: (id: string) => PaymentMethod | undefined;
  getPaymentMethodsByPosition: () => PaymentMethod[];
  getActivePaymentMethods: () => PaymentMethod[];
  getPaymentMethodsByBrand: (brand: string) => PaymentMethod[];
  getTotalCardCount: () => number;
  canAddMoreCardsSync: () => boolean;

  // State Management
  setSelectedMethod: (method: PaymentMethod | null) => void;
  setIsReordering: (reordering: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  paymentMethods: [],
  selectedMethod: null,
  defaultMethod: null,
  summary: null,
  isLoading: false,
  isReordering: false,
  error: null,
  autoUpdateSettings: {
    enabled: false,
    notificationEnabled: true,
  },
  analytics: {},
};

export const usePaymentMethodStore = create<PaymentMethodState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== DATA MANAGEMENT ACTIONS =====

      fetchPaymentMethods: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const methods = await paymentMethodService.getPaymentMethods(userId);
          const defaultMethod = methods.find((m) => m.isDefault) || null;

          set({
            paymentMethods: methods.sort((a, b) => a.cardPosition - b.cardPosition),
            defaultMethod,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch payment methods',
            isLoading: false,
          });
          throw error;
        }
      },

      addPaymentMethod: async (request: CreatePaymentMethodRequest) => {
        set({ isLoading: true, error: null });
        try {
          const newMethod = await paymentMethodService.addPaymentMethod(request);

          set((state) => {
            const updatedMethods = [...state.paymentMethods, newMethod].sort(
              (a, b) => a.cardPosition - b.cardPosition,
            );

            return {
              paymentMethods: updatedMethods,
              defaultMethod: newMethod.isDefault ? newMethod : state.defaultMethod,
              isLoading: false,
            };
          });

          return newMethod;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add payment method',
            isLoading: false,
          });
          throw error;
        }
      },

      updatePaymentMethod: async (id: string, updates: UpdatePaymentMethodRequest) => {
        const { paymentMethods } = get();

        // Optimistic update
        const optimisticMethods = paymentMethods.map((pm) =>
          pm.id === id ? { ...pm, ...updates } : pm,
        );
        set({ paymentMethods: optimisticMethods });

        try {
          const updatedMethod = await paymentMethodService.updatePaymentMethod(id, updates);

          set((state) => {
            const finalMethods = state.paymentMethods.map((pm) =>
              pm.id === id ? updatedMethod : pm,
            );

            return {
              paymentMethods: finalMethods,
              defaultMethod: updatedMethod.isDefault
                ? updatedMethod
                : state.defaultMethod?.id === id
                  ? null
                  : state.defaultMethod,
            };
          });

          return updatedMethod;
        } catch (error) {
          // Revert optimistic update
          set({ paymentMethods });
          set({
            error: error instanceof Error ? error.message : 'Failed to update payment method',
          });
          throw error;
        }
      },

      deletePaymentMethod: async (id: string) => {
        try {
          await paymentMethodService.deletePaymentMethod(id);

          set((state) => ({
            paymentMethods: state.paymentMethods.filter((pm) => pm.id !== id),
            defaultMethod: state.defaultMethod?.id === id ? null : state.defaultMethod,
            selectedMethod: state.selectedMethod?.id === id ? null : state.selectedMethod,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete payment method',
          });
          throw error;
        }
      },

      refreshPaymentMethods: async (userId: string) => {
        // Force refresh without loading state (for background updates)
        try {
          const methods = await paymentMethodService.getPaymentMethods(userId);
          const defaultMethod = methods.find((m) => m.isDefault) || null;

          set({
            paymentMethods: methods.sort((a, b) => a.cardPosition - b.cardPosition),
            defaultMethod,
          });
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      },

      // ===== CARD MANAGEMENT ACTIONS =====

      reorderPaymentMethods: async (newOrder: CardOrder[]) => {
        const { paymentMethods } = get();

        // Optimistic update
        const reorderedMethods = paymentMethods
          .map((pm) => {
            const orderItem = newOrder.find((o) => o.id === pm.id);
            return orderItem ? { ...pm, cardPosition: orderItem.position } : pm;
          })
          .sort((a, b) => a.cardPosition - b.cardPosition);

        set({ paymentMethods: reorderedMethods });

        try {
          await paymentMethodService.reorderPaymentMethods(newOrder);
        } catch (error) {
          // Revert on error
          set({ paymentMethods });
          set({
            error: error instanceof Error ? error.message : 'Failed to reorder payment methods',
          });
          throw error;
        }
      },

      setDefaultPaymentMethod: async (id: string) => {
        const { paymentMethods } = get();

        // Optimistic update
        const updatedMethods = paymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === id,
        }));
        const newDefaultMethod = updatedMethods.find((pm) => pm.id === id) || null;

        set({
          paymentMethods: updatedMethods,
          defaultMethod: newDefaultMethod,
        });

        try {
          await paymentMethodService.setDefaultPaymentMethod(id);
        } catch (error) {
          // Revert on error
          set({ paymentMethods });
          set({
            error: error instanceof Error ? error.message : 'Failed to set default payment method',
          });
          throw error;
        }
      },

      updateUsageRestrictions: async (id: string, restrictions: UsageRestrictions) => {
        const { paymentMethods } = get();

        // Optimistic update
        const updatedMethods = paymentMethods.map((pm) =>
          pm.id === id ? { ...pm, usageRestrictions: restrictions } : pm,
        );
        set({ paymentMethods: updatedMethods });

        try {
          await paymentMethodService.updateUsageRestrictions(id, restrictions);
        } catch (error) {
          // Revert on error
          set({ paymentMethods });
          set({
            error: error instanceof Error ? error.message : 'Failed to update usage restrictions',
          });
          throw error;
        }
      },

      verifyPaymentMethod: async (id: string) => {
        try {
          const verifiedMethod = await paymentMethodService.verifyPaymentMethod(id);

          set((state) => ({
            paymentMethods: state.paymentMethods.map((pm) => (pm.id === id ? verifiedMethod : pm)),
          }));

          return verifiedMethod;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to verify payment method',
          });
          throw error;
        }
      },

      // ===== ANALYTICS ACTIONS =====

      fetchPaymentMethodAnalytics: async (id: string) => {
        try {
          const analytics = await paymentMethodService.getPaymentMethodAnalytics(id);

          set((state) => ({
            analytics: {
              ...state.analytics,
              [id]: analytics,
            },
          }));

          return analytics;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch analytics',
          });
          throw error;
        }
      },

      fetchSummary: async (userId: string) => {
        try {
          const summary = await paymentMethodService.getPaymentMethodSummary(userId);
          set({ summary });
        } catch (error) {
          console.error('Failed to fetch summary:', error);
        }
      },

      // ===== AUTO-UPDATE ACTIONS =====

      triggerAutoUpdate: async (id: string) => {
        try {
          const result = await paymentMethodService.triggerAutoUpdate(id);

          if (result.updated) {
            // Refresh the specific payment method
            const { paymentMethods } = get();
            const updatedMethods = await paymentMethodService.getPaymentMethods(
              paymentMethods[0]?.userId || '',
            );
            set({
              paymentMethods: updatedMethods.sort((a, b) => a.cardPosition - b.cardPosition),
            });
          }

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to trigger auto-update',
          });
          throw error;
        }
      },

      updateAutoUpdateSettings: (settings) => {
        set((state) => ({
          autoUpdateSettings: {
            ...state.autoUpdateSettings,
            ...settings,
            lastUpdateCheck: new Date(),
          },
        }));
      },

      // ===== UTILITY ACTIONS =====

      canAddMoreCards: async (userId: string) => {
        try {
          return await paymentMethodService.canAddMoreCards(userId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check card limit',
          });
          throw error;
        }
      },

      getRecommendedCard: async (userId: string, transactionData) => {
        try {
          return await paymentMethodService.getRecommendedCard(userId, transactionData);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to get card recommendation',
          });
          throw error;
        }
      },

      // ===== SELECTORS =====

      getPaymentMethodById: (id: string) => {
        const { paymentMethods } = get();
        return paymentMethods.find((pm) => pm.id === id);
      },

      getPaymentMethodsByPosition: () => {
        const { paymentMethods } = get();
        return [...paymentMethods].sort((a, b) => a.cardPosition - b.cardPosition);
      },

      getActivePaymentMethods: () => {
        const { paymentMethods } = get();
        return paymentMethods.filter((pm) => pm.status === 'active');
      },

      getPaymentMethodsByBrand: (brand: string) => {
        const { paymentMethods } = get();
        return paymentMethods.filter((pm) => pm.brand.toLowerCase() === brand.toLowerCase());
      },

      getTotalCardCount: () => {
        const { paymentMethods } = get();
        return paymentMethods.length;
      },

      canAddMoreCardsSync: () => {
        const { paymentMethods } = get();
        return paymentMethods.length < 10;
      },

      // ===== STATE MANAGEMENT =====

      setSelectedMethod: (method) => set({ selectedMethod: method }),

      setIsReordering: (reordering) => set({ isReordering: reordering }),

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'payment-method-storage',
      partialize: (state) => ({
        autoUpdateSettings: state.autoUpdateSettings,
        // Don't persist sensitive payment method data for security
      }),
    },
  ),
);
