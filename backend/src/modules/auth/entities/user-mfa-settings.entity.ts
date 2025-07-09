import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Interfaces for MFA functionality
export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  operatingSystem?: string;
  ipAddress: string;
  userAgent: string;
  firstTrusted: Date;
  lastUsed: Date;
  isActive: boolean;
  trustExpiresAt: Date; // Trusted devices expire after 30 days
}

export interface MFAMethod {
  type: 'totp' | 'sms' | 'email' | 'backup_codes';
  enabled: boolean;
  setupDate?: Date;
  lastUsed?: Date;
  failureCount: number;
  isVerified: boolean;
}

export interface MFAAttempt {
  method: string;
  timestamp: Date;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  failureReason?: string;
}

export interface BackupCode {
  code: string; // Hashed
  used: boolean;
  usedAt?: Date;
  usedFrom?: string; // IP address
}

export interface MFASecuritySettings {
  requireMFAForLogin: boolean;
  requireMFAForPayments: boolean;
  requireMFAForSettingsChange: boolean;
  requireMFAForHighValueTransactions: boolean;
  highValueThreshold: number; // Amount requiring MFA
  maxFailedAttempts: number;
  lockoutDuration: number; // Minutes
  trustedDeviceDuration: number; // Days
  requireMFAFrequency: number; // Hours between MFA requirements
}

@Entity('user_mfa_settings')
export class UserMFASettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column({ type: 'json' })
  enabledMethods!: {
    totp: boolean;
    sms: boolean;
    email: boolean;
    backupCodes: boolean;
  };

  @Column({ type: 'text', nullable: true })
  totpSecret?: string; // Encrypted TOTP secret

  @Column({ nullable: true })
  phoneNumber?: string; // For SMS MFA

  @Column({ nullable: true })
  emailAddress?: string; // For email MFA (can be different from login email)

  @Column({ type: 'json', nullable: true })
  backupCodes?: BackupCode[]; // Encrypted backup codes

  @Column({ type: 'json', nullable: true })
  trustedDevices?: TrustedDevice[];

  @Column({ type: 'json', nullable: true })
  securitySettings?: MFASecuritySettings;

  @Column({ type: 'json', nullable: true })
  attemptHistory?: MFAAttempt[]; // Last 100 attempts

  @Column({ default: false })
  isEnabled!: boolean;

  @Column({ default: false })
  isSetupComplete!: boolean;

  @Column({ nullable: true })
  lastMFAUsed?: Date;

  @Column({ type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'json', nullable: true })
  recoveryInfo?: {
    recoveryEmail?: string;
    recoveryPhone?: string;
    securityQuestions?: {
      question: string;
      answerHash: string;
    }[];
    emergencyContacts?: {
      name: string;
      email: string;
      phone: string;
      relationship: string;
    }[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods for MFA functionality
  isMFARequired(
    operation: 'login' | 'payment' | 'settings' | 'high_value',
    amount?: number,
  ): boolean {
    if (!this.isEnabled || !this.securitySettings) return false;

    switch (operation) {
      case 'login':
        return this.securitySettings.requireMFAForLogin;
      case 'payment':
        return this.securitySettings.requireMFAForPayments;
      case 'settings':
        return this.securitySettings.requireMFAForSettingsChange;
      case 'high_value':
        return (
          this.securitySettings.requireMFAForHighValueTransactions &&
          amount !== undefined &&
          amount >= this.securitySettings.highValueThreshold
        );
      default:
        return false;
    }
  }

  isDeviceTrusted(deviceId: string): boolean {
    if (!this.trustedDevices) return false;

    const device = this.trustedDevices.find((d) => d.deviceId === deviceId);
    if (!device || !device.isActive) return false;

    // Check if trust has expired
    return new Date() < device.trustExpiresAt;
  }

  canBypassMFAWithTrustedDevice(deviceId: string): boolean {
    if (!this.isDeviceTrusted(deviceId)) return false;

    // Check if enough time has passed since last MFA
    if (!this.lastMFAUsed) return false;

    const hoursSinceLastMFA = (Date.now() - this.lastMFAUsed.getTime()) / (1000 * 60 * 60);
    const requiredFrequency = this.securitySettings?.requireMFAFrequency || 24;

    return hoursSinceLastMFA < requiredFrequency;
  }

  isAccountLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  addTrustedDevice(
    deviceInfo: Omit<TrustedDevice, 'firstTrusted' | 'lastUsed' | 'isActive' | 'trustExpiresAt'>,
  ): void {
    const now = new Date();
    const trustDuration = this.securitySettings?.trustedDeviceDuration || 30; // 30 days default
    const expiresAt = new Date(now.getTime() + trustDuration * 24 * 60 * 60 * 1000);

    const newDevice: TrustedDevice = {
      ...deviceInfo,
      firstTrusted: now,
      lastUsed: now,
      isActive: true,
      trustExpiresAt: expiresAt,
    };

    if (!this.trustedDevices) {
      this.trustedDevices = [];
    }

    // Remove existing device with same deviceId
    this.trustedDevices = this.trustedDevices.filter((d) => d.deviceId !== deviceInfo.deviceId);

    // Add new device
    this.trustedDevices.push(newDevice);

    // Keep only last 10 trusted devices
    if (this.trustedDevices.length > 10) {
      this.trustedDevices = this.trustedDevices
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 10);
    }
  }

  revokeTrustedDevice(deviceId: string): void {
    if (!this.trustedDevices) return;

    const deviceIndex = this.trustedDevices.findIndex((d) => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      this.trustedDevices[deviceIndex].isActive = false;
    }
  }

  revokeAllTrustedDevices(): void {
    if (!this.trustedDevices) return;

    this.trustedDevices.forEach((device) => {
      device.isActive = false;
    });
  }

  recordMFAAttempt(attempt: MFAAttempt): void {
    if (!this.attemptHistory) {
      this.attemptHistory = [];
    }

    this.attemptHistory.push(attempt);

    // Keep only last 100 attempts
    if (this.attemptHistory.length > 100) {
      this.attemptHistory = this.attemptHistory.slice(-100);
    }

    // Update failure count and lock account if necessary
    if (!attempt.success) {
      this.failedAttempts += 1;

      const maxFailures = this.securitySettings?.maxFailedAttempts || 5;
      if (this.failedAttempts >= maxFailures) {
        this.lockAccount();
      }
    } else {
      this.failedAttempts = 0;
      this.lastMFAUsed = new Date();
    }
  }

  lockAccount(): void {
    const lockoutDuration = this.securitySettings?.lockoutDuration || 30; // 30 minutes default
    this.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
  }

  unlockAccount(): void {
    this.lockedUntil = undefined;
    this.failedAttempts = 0;
  }

  getAvailableMethods(): string[] {
    const methods: string[] = [];

    if (this.enabledMethods.totp && this.totpSecret) {
      methods.push('totp');
    }

    if (this.enabledMethods.sms && this.phoneNumber) {
      methods.push('sms');
    }

    if (this.enabledMethods.email && this.emailAddress) {
      methods.push('email');
    }

    if (this.enabledMethods.backupCodes && this.hasUnusedBackupCodes()) {
      methods.push('backup_codes');
    }

    return methods;
  }

  hasUnusedBackupCodes(): boolean {
    if (!this.backupCodes) return false;
    return this.backupCodes.some((code) => !code.used);
  }

  useBackupCode(codeToUse: string): boolean {
    if (!this.backupCodes) return false;

    const codeIndex = this.backupCodes.findIndex(
      (code) => !code.used && code.code === codeToUse, // Note: In real implementation, this should be hashed comparison
    );

    if (codeIndex >= 0) {
      this.backupCodes[codeIndex].used = true;
      this.backupCodes[codeIndex].usedAt = new Date();
      return true;
    }

    return false;
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    const backupCodes: BackupCode[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-digit backup code
      const code = Math.random().toString(36).substr(2, 8).toUpperCase();
      codes.push(code);

      backupCodes.push({
        code: code, // In real implementation, this should be hashed
        used: false,
      });
    }

    this.backupCodes = backupCodes;
    return codes;
  }

  getMFAStrength(): 'weak' | 'medium' | 'strong' {
    const enabledCount = Object.values(this.enabledMethods).filter(Boolean).length;

    if (enabledCount === 0) return 'weak';
    if (enabledCount === 1) return 'medium';
    return 'strong';
  }

  getSecurityScore(): number {
    let score = 0;

    // Base score for MFA being enabled
    if (this.isEnabled) score += 20;

    // Points for each method
    if (this.enabledMethods.totp) score += 30;
    if (this.enabledMethods.sms) score += 20;
    if (this.enabledMethods.email) score += 15;
    if (this.enabledMethods.backupCodes) score += 10;

    // Bonus for trusted devices
    if (this.trustedDevices && this.trustedDevices.length > 0) score += 5;

    // Bonus for recovery options
    if (this.recoveryInfo) score += 10;

    return Math.min(100, score);
  }

  // Static method to create default MFA settings
  static createDefaultSettings(userId: string): Partial<UserMFASettings> {
    return {
      userId,
      enabledMethods: {
        totp: false,
        sms: false,
        email: false,
        backupCodes: false,
      },
      isEnabled: false,
      isSetupComplete: false,
      failedAttempts: 0,
      securitySettings: {
        requireMFAForLogin: true,
        requireMFAForPayments: true,
        requireMFAForSettingsChange: true,
        requireMFAForHighValueTransactions: true,
        highValueThreshold: 1000,
        maxFailedAttempts: 5,
        lockoutDuration: 30, // 30 minutes
        trustedDeviceDuration: 30, // 30 days
        requireMFAFrequency: 24, // 24 hours
      },
    };
  }

  // Method to validate MFA setup
  validateSetup(): string[] {
    const errors: string[] = [];

    if (this.isEnabled && !this.isSetupComplete) {
      errors.push('MFA is enabled but setup is not complete');
    }

    if (this.enabledMethods.totp && !this.totpSecret) {
      errors.push('TOTP is enabled but no secret is configured');
    }

    if (this.enabledMethods.sms && !this.phoneNumber) {
      errors.push('SMS MFA is enabled but no phone number is configured');
    }

    if (this.enabledMethods.email && !this.emailAddress) {
      errors.push('Email MFA is enabled but no email address is configured');
    }

    if (this.isEnabled && this.getAvailableMethods().length === 0) {
      errors.push('MFA is enabled but no valid methods are available');
    }

    return errors;
  }

  // Cleanup expired trusted devices
  cleanupExpiredDevices(): void {
    if (!this.trustedDevices) return;

    const now = new Date();
    this.trustedDevices = this.trustedDevices.filter((device) => {
      return device.isActive && device.trustExpiresAt > now;
    });
  }
}
