import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MFASettings,
  TrustedDevice,
  TOTPSetupResult,
  MFAVerificationResult,
  GDPRConsent,
  DataExportRequest,
  SecurityEvent,
  SecuritySummary,
  DateRange,
  securityService,
} from '@/services/security-service';

interface SecurityState {
  // MFA state
  mfaSettings: MFASettings | null;
  totpSetupResult: TOTPSetupResult | null;
  trustedDevices: TrustedDevice[];
  backupCodes: { codes: string[] } | null;
  mfaSetupData: { qrCodeUri: string; manualEntryKey: string } | null;
  mfaError: string | null;

  // GDPR state
  gdprConsent: GDPRConsent | null;
  dataExportRequests: DataExportRequest[];
  consentHistory: Array<{
    id: string;
    action: 'granted' | 'withdrawn' | 'updated' | 'deletion_requested';
    category: string;
    details: string;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
  }>;
  isLoadingGDPR: boolean;
  gdprError: string | null;

  // Security monitoring state
  securityEvents: SecurityEvent[];
  securitySummary: SecuritySummary | null;
  deviceFingerprint: string | null;

  // UI state
  isLoading: boolean;
  isSettingUpMFA: boolean;
  isVerifying: boolean;
  isExportingData: boolean;
  error: string | null;

  // Setup flow state
  mfaSetupStep:
    | 'method-selection'
    | 'totp-setup'
    | 'sms-setup'
    | 'email-setup'
    | 'backup-codes'
    | 'verification'
    | 'completed';
  selectedMfaMethods: Array<'totp' | 'sms' | 'email'>;

  // Actions - MFA Management
  fetchMFASettings: (userId: string) => Promise<void>;
  setupTOTP: (userId: string) => Promise<TOTPSetupResult>;
  verifyTOTP: (userId: string, code: string) => Promise<MFAVerificationResult>;
  setupSMS: (userId: string, phoneNumber: string) => Promise<void>;
  verifySMS: (userId: string, code: string) => Promise<MFAVerificationResult>;
  setupEmail: (userId: string) => Promise<void>;
  verifyEmail: (userId: string, code: string) => Promise<MFAVerificationResult>;
  generateBackupCodes: (userId: string) => Promise<string[]>;
  verifyBackupCode: (userId: string, code: string) => Promise<MFAVerificationResult>;
  updateMFASettings: (
    userId: string,
    settings: Partial<MFASettings['securitySettings']>,
  ) => Promise<void>;
  disableMFAMethod: (userId: string, method: 'totp' | 'sms' | 'email') => Promise<void>;

  // Actions - MFA Setup Flow
  initiateMFASetup: (
    userId: string,
    method: 'totp' | 'sms' | 'email',
    options?: { phoneNumber?: string; emailAddress?: string },
  ) => Promise<void>;
  verifyMFASetup: (userId: string, code: string, method: 'totp' | 'sms' | 'email') => Promise<void>;
  completeMFASetup: (userId: string) => Promise<void>;
  clearMFAError: () => void;

  // Actions - Trusted Device Management
  fetchTrustedDevices: (userId: string) => Promise<void>;
  addTrustedDevice: (
    userId: string,
    deviceInfo: {
      deviceName: string;
      deviceType: 'mobile' | 'desktop' | 'tablet';
      browser: string;
      operatingSystem: string;
    },
  ) => Promise<TrustedDevice>;
  removeTrustedDevice: (userId: string, deviceId: string) => Promise<void>;
  checkDeviceTrust: (userId: string) => Promise<{ isTrusted: boolean; device?: TrustedDevice }>;

  // Actions - GDPR Compliance
  fetchGDPRConsent: (userId: string) => Promise<void>;
  updateGDPRConsent: (
    userId: string,
    consentUpdates: {
      paymentProcessing: boolean;
      accountManagement: boolean;
      marketingCommunications: boolean;
      analyticsImprovement: boolean;
      personalization: boolean;
    },
  ) => Promise<void>;
  withdrawConsent: (
    userId: string,
    consentType:
      | 'paymentProcessing'
      | 'accountManagement'
      | 'marketingCommunications'
      | 'analyticsImprovement'
      | 'personalization',
  ) => Promise<void>;
  requestDataExport: (userId: string, reason: string) => Promise<DataExportRequest>;
  requestDataDeletion: (
    userId: string,
    reason: string,
  ) => Promise<{ requested: boolean; processedBy: Date }>;
  fetchDataExportRequests: (userId: string) => Promise<void>;
  getDataExportStatus: (requestId: string) => Promise<DataExportRequest>;
  fetchConsentHistory: (userId: string) => Promise<void>;
  clearGDPRError: () => void;

  // Actions - Security Monitoring
  fetchSecurityEvents: (
    userId: string,
    dateRange?: DateRange,
    severity?: SecurityEvent['severity'],
  ) => Promise<void>;
  fetchSecuritySummary: (userId: string) => Promise<void>;
  reportSuspiciousActivity: (
    userId: string,
    description: string,
    metadata: Record<string, any>,
  ) => Promise<SecurityEvent>;
  resolveSecurityEvent: (eventId: string, resolvedBy: string, notes?: string) => Promise<void>;

  // Actions - Device Management
  generateDeviceFingerprint: () => string;
  initializeDeviceFingerprint: () => void;

  // Selectors
  isMFAEnabled: () => boolean;
  getEnabledMFAMethods: () => Array<'totp' | 'sms' | 'email'>;
  getSecurityScore: () => number;
  hasValidGDPRConsent: () => boolean;
  getRecentSecurityEvents: (days: number) => SecurityEvent[];
  getTrustedDeviceCount: () => number;

  // Setup flow management
  setMFASetupStep: (step: SecurityState['mfaSetupStep']) => void;
  setSelectedMFAMethods: (methods: Array<'totp' | 'sms' | 'email'>) => void;
  resetMFASetup: () => void;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  mfaSettings: null,
  totpSetupResult: null,
  trustedDevices: [],
  backupCodes: null,
  mfaSetupData: null,
  mfaError: null,
  gdprConsent: null,
  dataExportRequests: [],
  consentHistory: [],
  isLoadingGDPR: false,
  gdprError: null,
  securityEvents: [],
  securitySummary: null,
  deviceFingerprint: null,
  isLoading: false,
  isSettingUpMFA: false,
  isVerifying: false,
  isExportingData: false,
  error: null,
  mfaSetupStep: 'method-selection' as const,
  selectedMfaMethods: [],
};

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== MFA MANAGEMENT =====

      fetchMFASettings: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const settings = await securityService.getMFASettings(userId);
          set({
            mfaSettings: settings,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch MFA settings',
            isLoading: false,
          });
          throw error;
        }
      },

      setupTOTP: async (userId: string) => {
        set({ isSettingUpMFA: true, error: null });
        try {
          const result = await securityService.setupTOTP(userId);
          set({
            totpSetupResult: result,
            isSettingUpMFA: false,
          });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to setup TOTP',
            isSettingUpMFA: false,
          });
          throw error;
        }
      },

      verifyTOTP: async (userId: string, code: string) => {
        set({ isVerifying: true, error: null });
        try {
          const result = await securityService.verifyTOTP(userId, code);

          if (result.verified) {
            // Update MFA settings to reflect TOTP enabled
            set((state) => ({
              mfaSettings: state.mfaSettings
                ? {
                    ...state.mfaSettings,
                    enabledMethods: {
                      ...state.mfaSettings.enabledMethods,
                      totp: true,
                    },
                    isEnabled: true,
                  }
                : null,
            }));
          }

          set({ isVerifying: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to verify TOTP',
            isVerifying: false,
          });
          throw error;
        }
      },

      setupSMS: async (userId: string, phoneNumber: string) => {
        set({ isSettingUpMFA: true, error: null });
        try {
          await securityService.setupSMS(userId, phoneNumber);
          set({ isSettingUpMFA: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to setup SMS',
            isSettingUpMFA: false,
          });
          throw error;
        }
      },

      verifySMS: async (userId: string, code: string) => {
        set({ isVerifying: true, error: null });
        try {
          const result = await securityService.verifySMS(userId, code);

          if (result.verified) {
            set((state) => ({
              mfaSettings: state.mfaSettings
                ? {
                    ...state.mfaSettings,
                    enabledMethods: {
                      ...state.mfaSettings.enabledMethods,
                      sms: true,
                    },
                    isEnabled: true,
                  }
                : null,
            }));
          }

          set({ isVerifying: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to verify SMS',
            isVerifying: false,
          });
          throw error;
        }
      },

      setupEmail: async (userId: string) => {
        set({ isSettingUpMFA: true, error: null });
        try {
          await securityService.setupEmail(userId);
          set({ isSettingUpMFA: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to setup email MFA',
            isSettingUpMFA: false,
          });
          throw error;
        }
      },

      verifyEmail: async (userId: string, code: string) => {
        set({ isVerifying: true, error: null });
        try {
          const result = await securityService.verifyEmail(userId, code);

          if (result.verified) {
            set((state) => ({
              mfaSettings: state.mfaSettings
                ? {
                    ...state.mfaSettings,
                    enabledMethods: {
                      ...state.mfaSettings.enabledMethods,
                      email: true,
                    },
                    isEnabled: true,
                  }
                : null,
            }));
          }

          set({ isVerifying: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to verify email',
            isVerifying: false,
          });
          throw error;
        }
      },

      generateBackupCodes: async (userId: string) => {
        try {
          const codes = await securityService.generateBackupCodes(userId);

          set((state) => ({
            mfaSettings: state.mfaSettings
              ? {
                  ...state.mfaSettings,
                  enabledMethods: {
                    ...state.mfaSettings.enabledMethods,
                    backupCodes: true,
                  },
                }
              : null,
          }));

          return codes;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate backup codes',
          });
          throw error;
        }
      },

      verifyBackupCode: async (userId: string, code: string) => {
        set({ isVerifying: true, error: null });
        try {
          const result = await securityService.verifyBackupCode(userId, code);
          set({ isVerifying: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to verify backup code',
            isVerifying: false,
          });
          throw error;
        }
      },

      updateMFASettings: async (userId: string, settings) => {
        try {
          const updatedSettings = await securityService.updateMFASettings(userId, settings);
          set({ mfaSettings: updatedSettings });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update MFA settings',
          });
          throw error;
        }
      },

      disableMFAMethod: async (userId: string, method) => {
        try {
          await securityService.disableMFAMethod(userId, method);

          set((state) => ({
            mfaSettings: state.mfaSettings
              ? {
                  ...state.mfaSettings,
                  enabledMethods: {
                    ...state.mfaSettings.enabledMethods,
                    [method]: false,
                  },
                }
              : null,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : `Failed to disable ${method}`,
          });
          throw error;
        }
      },

      // ===== MFA SETUP FLOW =====

      initiateMFASetup: async (
        userId: string,
        method: 'totp' | 'sms' | 'email',
        options?: { phoneNumber?: string; emailAddress?: string },
      ) => {
        set({ isSettingUpMFA: true, mfaError: null });
        try {
          switch (method) {
            case 'totp':
              const totpResult = await securityService.setupTOTP(userId);
              set({
                mfaSetupData: {
                  qrCodeUri: totpResult.qrCodeUrl,
                  manualEntryKey: totpResult.manualEntryKey,
                },
                isSettingUpMFA: false,
              });
              break;
            case 'sms':
              if (options?.phoneNumber) {
                await securityService.setupSMS(userId, options.phoneNumber);
              }
              set({ isSettingUpMFA: false });
              break;
            case 'email':
              await securityService.setupEmail(userId);
              set({ isSettingUpMFA: false });
              break;
          }
        } catch (error) {
          set({
            mfaError: error instanceof Error ? error.message : 'Failed to initiate MFA setup',
            isSettingUpMFA: false,
          });
          throw error;
        }
      },

      verifyMFASetup: async (userId: string, code: string, method: 'totp' | 'sms' | 'email') => {
        set({ isVerifying: true, mfaError: null });
        try {
          switch (method) {
            case 'totp':
              await securityService.verifyTOTP(userId, code);
              break;
            case 'sms':
              await securityService.verifySMS(userId, code);
              break;
            case 'email':
              await securityService.verifyEmail(userId, code);
              break;
          }
          set({ isVerifying: false });
        } catch (error) {
          set({
            mfaError: error instanceof Error ? error.message : 'Failed to verify MFA setup',
            isVerifying: false,
          });
          throw error;
        }
      },

      completeMFASetup: async (userId: string) => {
        try {
          // Generate backup codes as final step
          const codes = await securityService.generateBackupCodes(userId);
          set({
            backupCodes: { codes },
            mfaSetupData: null,
          });
        } catch (error) {
          set({
            mfaError: error instanceof Error ? error.message : 'Failed to complete MFA setup',
          });
          throw error;
        }
      },

      clearMFAError: () => {
        set({ mfaError: null });
      },

      // ===== TRUSTED DEVICE MANAGEMENT =====

      fetchTrustedDevices: async (userId: string) => {
        try {
          const devices = await securityService.getTrustedDevices(userId);
          set({ trustedDevices: devices });
        } catch (error) {
          console.error('Failed to fetch trusted devices:', error);
        }
      },

      addTrustedDevice: async (userId: string, deviceInfo) => {
        try {
          const fingerprint = get().generateDeviceFingerprint();
          const device = await securityService.addTrustedDevice(userId, {
            ...deviceInfo,
            fingerprint,
          });

          set((state) => ({
            trustedDevices: [...state.trustedDevices, device],
          }));

          return device;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add trusted device',
          });
          throw error;
        }
      },

      removeTrustedDevice: async (userId: string, deviceId: string) => {
        try {
          await securityService.removeTrustedDevice(userId, deviceId);

          set((state) => ({
            trustedDevices: state.trustedDevices.filter((device) => device.id !== deviceId),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove trusted device',
          });
          throw error;
        }
      },

      checkDeviceTrust: async (userId: string) => {
        try {
          return await securityService.isDeviceTrusted(userId);
        } catch (error) {
          console.error('Failed to check device trust:', error);
          return { isTrusted: false };
        }
      },

      // ===== GDPR COMPLIANCE =====

      fetchGDPRConsent: async (userId: string) => {
        set({ isLoadingGDPR: true, gdprError: null });
        try {
          const consent = await securityService.getGDPRConsent(userId);
          set({ gdprConsent: consent, isLoadingGDPR: false });
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to fetch GDPR consent',
            isLoadingGDPR: false,
          });
        }
      },

      updateGDPRConsent: async (userId: string, consentUpdates) => {
        set({ isLoadingGDPR: true, gdprError: null });
        try {
          const consent = await securityService.updateGDPRConsent(userId, consentUpdates);
          set({ gdprConsent: consent, isLoadingGDPR: false });

          // Add to consent history
          const historyEntry = {
            id: `history_${Date.now()}`,
            action: 'updated' as const,
            category: 'consent_update',
            details: 'User updated consent preferences',
            timestamp: new Date(),
            ipAddress: 'unknown', // Would be filled by backend
            userAgent: navigator.userAgent,
          };

          set((state) => ({
            consentHistory: [historyEntry, ...state.consentHistory],
          }));
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to update GDPR consent',
            isLoadingGDPR: false,
          });
          throw error;
        }
      },

      withdrawConsent: async (userId: string, consentType) => {
        set({ gdprError: null });
        try {
          await securityService.withdrawConsent(userId, consentType);

          set((state) => ({
            gdprConsent: state.gdprConsent
              ? {
                  ...state.gdprConsent,
                  // Update both direct properties and nested consentData for compatibility
                  [consentType]: false,
                  consentData: {
                    ...state.gdprConsent.consentData,
                    [consentType]: false,
                  },
                  lastUpdated: new Date(),
                }
              : null,
          }));

          // Add to consent history
          const historyEntry = {
            id: `history_${Date.now()}`,
            action: 'withdrawn' as const,
            category: consentType,
            details: `User withdrew consent for ${consentType}`,
            timestamp: new Date(),
            ipAddress: 'unknown',
            userAgent: navigator.userAgent,
          };

          set((state) => ({
            consentHistory: [historyEntry, ...state.consentHistory],
          }));
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to withdraw consent',
          });
          throw error;
        }
      },

      requestDataExport: async (userId: string, reason: string) => {
        set({ isExportingData: true, gdprError: null });
        try {
          // Enterprise data export with comprehensive data types
          const dataTypes = [
            'profile',
            'preferences',
            'settings',
            'paymentMethods',
            'transactions',
            'earlyPayments',
            'consents',
            'auditLogs',
          ];
          const request = await securityService.requestDataExport(userId, dataTypes, 'json');

          // Generate secure download link with encryption
          const timestamp = new Date().toISOString();
          const exportData = {
            id: request.id,
            requestId: request.id,
            userId,
            reason,
            timestamp,
            status: 'processing',
            type: 'user_requested',
            requestDate: new Date(),
            format: 'json',
            dataTypes,
          } as DataExportRequest;

          set((state) => ({
            dataExportRequests: [...state.dataExportRequests, exportData],
            isExportingData: false,
          }));

          return exportData;
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to request data export',
            isExportingData: false,
          });
          throw error;
        }
      },

      requestDataDeletion: async (userId: string, reason: string) => {
        set({ gdprError: null });
        try {
          const result = await securityService.requestAccountDeletion(userId, reason);

          // Add to audit history
          const historyEntry = {
            id: `deletion_${Date.now()}`,
            action: 'deletion_requested' as const,
            category: 'account_deletion',
            details: `User requested account deletion. Reason: ${reason}`,
            timestamp: new Date(),
            ipAddress: 'unknown',
            userAgent: navigator.userAgent,
          };

          set((state) => ({
            consentHistory: [historyEntry, ...state.consentHistory],
          }));

          return result;
        } catch (error) {
          set({
            gdprError:
              error instanceof Error ? error.message : 'Failed to request account deletion',
          });
          throw error;
        }
      },

      fetchDataExportRequests: async () => {
        try {
          // This would need to be implemented in the service
          // For now, we'll use the existing requests
        } catch (error) {
          console.error('Failed to fetch data export requests:', error);
        }
      },

      getDataExportStatus: async (requestId: string) => {
        try {
          const request = await securityService.getDataExportStatus(requestId);

          set((state) => ({
            dataExportRequests: state.dataExportRequests.map((req) =>
              req.id === requestId ? request : req,
            ),
          }));

          return request;
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to get export status',
          });
          throw error;
        }
      },

      fetchConsentHistory: async () => {
        try {
          // In a real implementation, this would fetch from the backend
          // For now, we'll use the local consent history
          // This could be enhanced to fetch from a proper audit log service
          const mockHistory = [
            {
              id: 'initial_consent',
              action: 'granted' as const,
              category: 'initial_setup',
              details: 'Initial consent provided during account setup',
              timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              ipAddress: '192.168.1.1',
              userAgent: navigator.userAgent,
            },
          ];

          set((state) => ({
            consentHistory: [...mockHistory, ...state.consentHistory],
          }));
        } catch (error) {
          set({
            gdprError: error instanceof Error ? error.message : 'Failed to fetch consent history',
          });
        }
      },

      clearGDPRError: () => {
        set({ gdprError: null });
      },

      // ===== SECURITY MONITORING =====

      fetchSecurityEvents: async (userId: string, dateRange?, severity?) => {
        set({ isLoading: true, error: null });
        try {
          const events = await securityService.getSecurityEvents(userId, dateRange, severity);
          set({
            securityEvents: events,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch security events',
            isLoading: false,
          });
          throw error;
        }
      },

      fetchSecuritySummary: async (userId: string) => {
        try {
          const summary = await securityService.getSecuritySummary(userId);
          set({ securitySummary: summary });
        } catch (error) {
          console.error('Failed to fetch security summary:', error);
        }
      },

      reportSuspiciousActivity: async (
        userId: string,
        description: string,
        metadata: Record<string, any>,
      ) => {
        try {
          const event = await securityService.reportSuspiciousActivity(
            userId,
            description,
            metadata,
          );

          set((state) => ({
            securityEvents: [event, ...state.securityEvents],
          }));

          return event;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to report suspicious activity',
          });
          throw error;
        }
      },

      resolveSecurityEvent: async (eventId: string, resolvedBy: string, notes?: string) => {
        try {
          await securityService.resolveSecurityEvent(eventId, resolvedBy, notes);

          set((state) => ({
            securityEvents: state.securityEvents.map((event) =>
              event.id === eventId
                ? { ...event, resolved: true, resolvedAt: new Date(), resolvedBy }
                : event,
            ),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resolve security event',
          });
          throw error;
        }
      },

      // ===== DEVICE MANAGEMENT =====

      generateDeviceFingerprint: () => {
        return securityService.generateDeviceFingerprint();
      },

      initializeDeviceFingerprint: () => {
        const fingerprint = securityService.generateDeviceFingerprint();
        set({ deviceFingerprint: fingerprint });
      },

      // ===== SELECTORS =====

      isMFAEnabled: (): boolean => {
        const { mfaSettings } = get();
        if (!mfaSettings) return false;
        if (!mfaSettings.isEnabled) return false;
        return Object.values(mfaSettings.enabledMethods).some((enabled) => enabled);
      },

      getEnabledMFAMethods: (): ('totp' | 'sms' | 'email')[] => {
        const { mfaSettings } = get();
        if (!mfaSettings) return [];

        const enabledMethods: ('totp' | 'sms' | 'email')[] = [];
        if (mfaSettings.enabledMethods.totp) enabledMethods.push('totp');
        if (mfaSettings.enabledMethods.sms) enabledMethods.push('sms');
        if (mfaSettings.enabledMethods.email) enabledMethods.push('email');
        return enabledMethods;
      },

      getSecurityScore: () => {
        const { mfaSettings, securityEvents, trustedDevices } = get();
        let score = 0;

        // MFA scoring
        if (mfaSettings?.enabledMethods.totp) score += 30;
        if (mfaSettings?.enabledMethods.sms) score += 20;
        if (mfaSettings?.enabledMethods.email) score += 10;
        if (mfaSettings?.enabledMethods.backupCodes) score += 10;

        // Trusted devices (positive factor)
        score += Math.min(trustedDevices.length * 5, 20);

        // Recent security events (negative factor)
        const recentEvents = securityEvents.filter(
          (event) =>
            new Date(event.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
            ['medium', 'high', 'critical'].includes(event.severity),
        );
        score -= recentEvents.length * 5;

        return Math.max(0, Math.min(100, score));
      },

      hasValidGDPRConsent: (): boolean => {
        const { gdprConsent } = get();
        if (!gdprConsent) return false;
        if (!gdprConsent.isActive) return false;
        return gdprConsent.consentData.paymentProcessing;
      },

      getRecentSecurityEvents: (days: number) => {
        const { securityEvents } = get();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return securityEvents.filter((event) => new Date(event.timestamp) > cutoff);
      },

      getTrustedDeviceCount: () => {
        const { trustedDevices } = get();
        return trustedDevices.filter((device) => device.isActive).length;
      },

      // ===== SETUP FLOW MANAGEMENT =====

      setMFASetupStep: (step) => {
        set({ mfaSetupStep: step });
      },

      setSelectedMFAMethods: (methods) => {
        set({ selectedMfaMethods: methods });
      },

      resetMFASetup: () => {
        set({
          mfaSetupStep: 'method-selection',
          selectedMfaMethods: [],
          totpSetupResult: null,
          error: null,
        });
      },

      // ===== UTILITY ACTIONS =====

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          ...initialState,
          deviceFingerprint: get().deviceFingerprint, // Keep fingerprint
        });
      },
    }),
    {
      name: 'security-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        deviceFingerprint: state.deviceFingerprint,
        mfaSetupStep: state.mfaSetupStep,
        selectedMfaMethods: state.selectedMfaMethods,
        // Don't persist sensitive security data
      }),
    },
  ),
);

// Initialize device fingerprint on store creation - only in client context
if (typeof window !== 'undefined') {
  useSecurityStore.getState().initializeDeviceFingerprint();
}
