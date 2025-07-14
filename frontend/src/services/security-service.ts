import { apiClient } from '@/lib/api-client';

// MFA (Multi-Factor Authentication) interfaces
export type MFAMethod = 'totp' | 'sms' | 'email';
export interface MFASettings {
  id: string;
  userId: string;
  enabledMethods: {
    totp: boolean;
    sms: boolean;
    email: boolean;
    backupCodes: boolean;
  };
  totpSecret?: string; // Base32 encoded secret (encrypted on backend)
  backupCodes?: string[]; // Encrypted backup codes
  trustedDevices: TrustedDevice[];
  securitySettings: {
    requireMFAForHighRisk: boolean;
    requireMFAForPayments: boolean;
    sessionTimeout: number; // in minutes
    maxFailedAttempts: number;
    lockoutDuration: number; // in minutes
  };
  isEnabled: boolean;
  lastUpdated: Date;
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  fingerprint: string;
  addedAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

export interface TOTPSetupResult {
  secret: string; // Base32 encoded secret for QR code
  qrCodeUrl: string; // Data URL for QR code image
  backupCodes: string[]; // One-time backup codes
  manualEntryKey: string; // For manual entry in authenticator apps
}

export interface MFAVerificationRequest {
  userId: string;
  method: 'totp' | 'sms' | 'email' | 'backup';
  code: string;
  deviceFingerprint?: string;
  trustDevice?: boolean;
}

export interface MFAVerificationResult {
  verified: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  requiresAdditionalVerification?: boolean;
  trustedDevice?: TrustedDevice;
}

// GDPR Compliance interfaces
export interface GDPRConsent {
  id: string;
  userId: string;
  // Enterprise-grade direct access properties for component integration
  paymentProcessing: boolean;
  accountManagement: boolean;
  marketingCommunications: boolean;
  analyticsImprovement: boolean;
  personalization: boolean;
  // Legacy nested structure for API compatibility
  consentData: {
    paymentProcessing: boolean;
    marketingCommunications: boolean;
    dataAnalytics: boolean;
    thirdPartySharing: boolean;
    cookieConsent: boolean;
  };
  consentDate: Date;
  lastUpdated: Date; // Required by component
  withdrawalDate?: Date;
  ipAddress: string;
  userAgent: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  legalBasis: {
    processingType: 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest';
    description: string;
    retentionPeriod: number; // in days
  };
  version: string; // Consent version for tracking policy changes
  isActive: boolean;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dataTypes: string[];
  format: 'json' | 'csv' | 'pdf';
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  type: 'user_requested' | 'admin_requested' | 'regulatory_compliance'; // Required for enterprise tracking
  reason?: string;
}

export interface DeletionRequest {
  id: string;
  userId: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: string;
  scheduledDeletionDate?: Date;
  completedAt?: Date;
  type: 'user_requested' | 'admin_requested' | 'regulatory_compliance';
}

export interface UserDataExport {
  userData: {
    profile: any;
    preferences: any;
    settings: any;
  };
  paymentData: {
    paymentMethods: any[];
    transactions: any[];
    earlyPayments: any[];
  };
  complianceData: {
    consents: GDPRConsent[];
    dataRequests: DataExportRequest[];
    auditLogs: any[];
  };
  exportMetadata: {
    exportedAt: Date;
    dataVersion: string;
    requestId: string;
  };
}

// Security Event interfaces
export interface SecurityEvent {
  id: string;
  userId: string;
  eventType:
    | 'login'
    | 'logout'
    | 'mfa_setup'
    | 'mfa_verification'
    | 'password_change'
    | 'suspicious_activity'
    | 'payment_method_added'
    | 'payment_method_removed'
    | 'high_risk_transaction'
    | 'account_locked'
    | 'device_trusted';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SecuritySummary {
  userId: string;
  securityScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mfaStatus: {
    enabled: boolean;
    methodsCount: number;
    lastVerification: Date;
  };
  deviceSecurity: {
    trustedDevicesCount: number;
    suspiciousActivityCount: number;
    lastSecurityUpdate: Date;
  };
  complianceStatus: {
    gdprCompliant: boolean;
    dataRetentionStatus: 'current' | 'expiring_soon' | 'expired';
    lastConsentUpdate: Date;
  };
  recentEvents: SecurityEvent[];
  recommendations: string[];
}

// Date range for queries
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Enterprise-grade Security Service
 * Handles MFA, GDPR compliance, security events, and audit trails
 */
export class SecurityService {
  // ===== MFA MANAGEMENT =====

  /**
   * Get MFA settings for a user
   */
  async getMFASettings(userId: string): Promise<MFASettings> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for MFA settings');
    }
    const response = await apiClient.get<{
      message: string;
      status: MFASettings;
    }>('/mfa/status');
    return response.data.status;
  }

  /**
   * Setup TOTP (Time-based One-Time Password) authentication
   */
  async setupTOTP(userId: string): Promise<TOTPSetupResult> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for TOTP setup');
    }
    const response = await apiClient.post<{
      message: string;
      setup: TOTPSetupResult;
    }>('/mfa/totp/setup', {});
    return response.data.setup;
  }

  /**
   * Verify TOTP code and enable TOTP
   */
  async verifyTOTP(userId: string, code: string): Promise<MFAVerificationResult> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for TOTP verification');
    }
    const response = await apiClient.post<{
      message: string;
      result: MFAVerificationResult;
    }>('/mfa/totp/verify', {
      token: code,
    });
    return response.data.result;
  }

  /**
   * Setup SMS-based MFA
   */
  async setupSMS(userId: string, phoneNumber: string): Promise<{ verificationSent: boolean }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for SMS setup');
    }
    await apiClient.post<{
      message: string;
      verificationId: string;
    }>('/mfa/sms/setup', { phoneNumber });
    return { verificationSent: true };
  }

  /**
   * Verify SMS code and enable SMS MFA
   */
  async verifySMS(userId: string, code: string): Promise<MFAVerificationResult> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for SMS verification');
    }
    const response = await apiClient.post<{
      message: string;
      verified: boolean;
    }>('/mfa/sms/verify', { code });
    return { verified: response.data.verified };
  }

  /**
   * Setup email-based MFA
   */
  async setupEmail(userId: string): Promise<{ verificationSent: boolean }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for email setup');
    }
    await apiClient.post<{
      message: string;
      verificationId: string;
    }>('/mfa/email/setup', {});
    return { verificationSent: true };
  }

  /**
   * Verify email code and enable email MFA
   */
  async verifyEmail(userId: string, code: string): Promise<MFAVerificationResult> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for email verification');
    }
    const response = await apiClient.post<{
      message: string;
      verified: boolean;
    }>('/mfa/email/verify', { code });
    return { verified: response.data.verified };
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for backup code generation');
    }
    const response = await apiClient.post<{
      message: string;
      backupCodes: string[];
      warning: string;
    }>('/mfa/backup-codes/generate', {});
    return response.data.backupCodes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerificationResult> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for backup code verification');
    }
    const response = await apiClient.post<{
      message: string;
      verified: boolean;
      warning: string;
    }>('/mfa/backup-codes/verify', { code });
    return { verified: response.data.verified };
  }

  /**
   * Update MFA settings
   */
  async updateMFASettings(
    userId: string,
    settings: Partial<MFASettings['securitySettings']>,
  ): Promise<MFASettings> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for updating MFA settings');
    }
    const response = await apiClient.put<{
      message: string;
      settings: MFASettings;
    }>('/mfa/settings', { settings });
    return response.data.settings;
  }

  /**
   * Disable MFA method
   */
  async disableMFAMethod(
    userId: string,
    method: 'totp' | 'sms' | 'email',
  ): Promise<{ disabled: boolean }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for disabling MFA method');
    }
    await apiClient.post<{
      message: string;
    }>(`/mfa/${method}/disable`, {});
    return { disabled: true };
  }

  // ===== TRUSTED DEVICE MANAGEMENT =====

  /**
   * Add a trusted device
   */
  async addTrustedDevice(
    userId: string,
    deviceInfo: {
      deviceName: string;
      deviceType: 'mobile' | 'desktop' | 'tablet';
      browser: string;
      operatingSystem: string;
      fingerprint: string;
    },
  ): Promise<TrustedDevice> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for adding trusted device');
    }
    const response = await apiClient.post<{
      message: string;
      device: TrustedDevice;
    }>('/auth/trusted-devices', deviceInfo);
    return response.data.device;
  }

  /**
   * Remove a trusted device
   */
  async removeTrustedDevice(userId: string, deviceId: string): Promise<{ removed: boolean }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for removing trusted device');
    }
    await apiClient.delete<{
      message: string;
    }>(`/auth/trusted-devices/${deviceId}`);
    return { removed: true };
  }

  /**
   * Get all trusted devices for a user
   */
  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for getting trusted devices');
    }
    const response = await apiClient.get<{
      message: string;
      trustedDevices: TrustedDevice[];
    }>('/mfa/trusted-devices');
    return response.data.trustedDevices;
  }

  // ===== GDPR COMPLIANCE =====

  /**
   * Get current GDPR consent status
   */
  async getGDPRConsent(userId: string): Promise<GDPRConsent | null> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for getting GDPR consent');
    }
    const response = await apiClient.get<{
      message: string;
      consent: GDPRConsent;
    }>('/gdpr/consent');
    return response.data.consent;
  }

  /**
   * Update GDPR consent - Enterprise-grade with direct property updates
   */
  async updateGDPRConsent(
    userId: string,
    consentUpdates: {
      paymentProcessing: boolean;
      accountManagement: boolean;
      marketingCommunications: boolean;
      analyticsImprovement: boolean;
      personalization: boolean;
    },
  ): Promise<GDPRConsent> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for updating GDPR consent');
    }
    const response = await apiClient.post<{
      message: string;
      consent: GDPRConsent;
    }>('/gdpr/consent', {
      consentData: {
        paymentProcessing: consentUpdates.paymentProcessing,
        marketingCommunications: consentUpdates.marketingCommunications,
        dataAnalytics: consentUpdates.analyticsImprovement,
        thirdPartySharing: false, // Default enterprise setting
        cookieConsent: true, // Required for functionality
      },
      // Also include direct properties for enterprise compatibility
      ...consentUpdates,
    });
    return response.data.consent;
  }

  /**
   * Withdraw specific consent type - Enterprise-grade consent management
   */
  async withdrawConsent(
    userId: string,
    consentType:
      | 'paymentProcessing'
      | 'accountManagement'
      | 'marketingCommunications'
      | 'analyticsImprovement'
      | 'personalization',
  ): Promise<{ withdrawn: boolean }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for withdrawing consent');
    }
    await apiClient.delete<{
      message: string;
    }>(`/gdpr/consent/${consentType}`);
    return { withdrawn: true };
  }

  /**
   * Request data export (Right to portability)
   */
  async requestDataExport(
    userId: string,
    dataTypes: string[],
    format: 'json' | 'csv' | 'pdf',
  ): Promise<DataExportRequest> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for data export request');
    }
    const response = await apiClient.post<{
      message: string;
      request: DataExportRequest;
    }>('/gdpr/data-export', {
      dataTypes,
      format,
    });
    return response.data.request;
  }

  /**
   * Get data export status
   */
  async getDataExportStatus(requestId: string): Promise<DataExportRequest> {
    const response = await apiClient.get<{
      message: string;
      request: DataExportRequest;
    }>(`/gdpr/data-export/${requestId}`);
    return response.data.request;
  }

  /**
   * Request account deletion (Right to erasure)
   */
  async requestAccountDeletion(
    userId: string,
    reason: string,
  ): Promise<{ requested: boolean; processedBy: Date }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for account deletion request');
    }
    const response = await apiClient.post<{
      message: string;
      requested: boolean;
      processedBy: Date;
    }>('/gdpr/delete-account', { reason });
    return {
      requested: response.data.requested,
      processedBy: response.data.processedBy,
    };
  }

  // ===== SECURITY EVENTS & MONITORING =====

  /**
   * Get security events for a user
   */
  async getSecurityEvents(
    userId: string,
    dateRange?: DateRange,
    severity?: SecurityEvent['severity'],
  ): Promise<SecurityEvent[]> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for getting security events');
    }
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.startDate.toISOString();
      params.endDate = dateRange.endDate.toISOString();
    }
    if (severity) {
      params.severity = severity;
    }

    const response = await apiClient.get<{
      message: string;
      events: SecurityEvent[];
    }>('/security/events', { params });
    return response.data.events;
  }

  /**
   * Get security summary and score for a user
   */
  async getSecuritySummary(userId: string): Promise<SecuritySummary> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for security summary');
    }
    const response = await apiClient.get<{
      message: string;
      summary: SecuritySummary;
    }>('/security/summary');
    return response.data.summary;
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(
    userId: string,
    description: string,
    metadata: Record<string, any>,
  ): Promise<SecurityEvent> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for reporting suspicious activity');
    }
    const response = await apiClient.post<{
      message: string;
      event: SecurityEvent;
    }>('/security/report-suspicious', {
      description,
      metadata,
    });
    return response.data.event;
  }

  /**
   * Mark security event as resolved
   */
  async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<SecurityEvent> {
    const response = await apiClient.put<{
      message: string;
      event: SecurityEvent;
    }>(`/security/events/${eventId}/resolve`, {
      resolvedBy,
      notes,
    });
    return response.data.event;
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate device fingerprint for security tracking
   * Enterprise-grade implementation with SSR compatibility
   */
  generateDeviceFingerprint(): string {
    // Check if we're in a browser environment
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof navigator === 'undefined'
    ) {
      // Return a server-side placeholder that will be replaced on client
      return 'ssr-placeholder-' + Date.now();
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);

      const fingerprint = [
        navigator.userAgent || 'unknown',
        navigator.language || 'unknown',
        typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : 'unknown',
        new Date().getTimezoneOffset().toString(),
        (typeof window.sessionStorage !== 'undefined').toString(),
        (typeof window.localStorage !== 'undefined').toString(),
        (navigator.hardwareConcurrency || 'unknown').toString(),
        canvas.toDataURL(),
      ].join('|');

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(36);
    } catch (error) {
      // Fallback for any browser environment issues
      console.warn('Device fingerprint generation failed:', error);
      return 'fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  }

  /**
   * Check if current device is trusted
   */
  async isDeviceTrusted(userId: string): Promise<{ isTrusted: boolean; device?: TrustedDevice }> {
    // Validate userId is provided (backend gets it from JWT but we need it for validation)
    if (!userId) {
      throw new Error('User ID is required for checking device trust');
    }
    const fingerprint = this.generateDeviceFingerprint();
    const response = await apiClient.post<{
      message: string;
      isTrusted: boolean;
      device?: TrustedDevice;
    }>('/auth/check-device-trust', {
      deviceFingerprint: fingerprint,
    });
    return {
      isTrusted: response.data.isTrusted,
      device: response.data.device,
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
