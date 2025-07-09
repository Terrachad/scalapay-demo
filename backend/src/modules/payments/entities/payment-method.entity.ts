import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  PENDING_VERIFICATION = 'pending_verification',
  BLOCKED = 'blocked',
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  DIGITAL_WALLET = 'digital_wallet',
}

// Enhanced interfaces for new enterprise features
export interface CardUpdateRecord {
  date: Date;
  source: 'stripe_updater' | 'manual' | 'bank_notification';
  previousDetails?: {
    exp_month: number;
    exp_year: number;
    last4: string;
  };
  newDetails: {
    exp_month: number;
    exp_year: number;
    last4: string;
  };
  reason: string;
}

export interface TimeRestriction {
  startHour: number; // 0-23
  endHour: number; // 0-23
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timezone: string;
}

export interface UsageRestrictions {
  maxDailyAmount?: number;
  maxMonthlyAmount?: number;
  maxTransactionAmount?: number;
  allowedMerchants?: string[];
  restrictedMerchants?: string[];
  allowedCountries?: string[];
  restrictedCountries?: string[];
  timeRestrictions?: TimeRestriction[];
  requireMerchantApproval?: boolean;
}

export interface ComplianceData {
  gdprConsent: boolean;
  consentDate: Date;
  dataRetentionExpiry: Date;
  processingPurposes: string[];
  dataSubjectRights: {
    canExport: boolean;
    canDelete: boolean;
    canRectify: boolean;
  };
  auditTrail: {
    created: { date: Date; ipAddress: string; userAgent: string };
    lastModified?: { date: Date; ipAddress: string; userAgent: string };
    lastUsed?: { date: Date; ipAddress: string; transactionId?: string };
  };
}

export interface AutoUpdateData {
  lastUpdateCheck: Date;
  updateSource: 'stripe_updater' | 'manual' | 'bank_notification';
  previousDetails?: {
    exp_month: number;
    exp_year: number;
    last4: string;
    brand: string;
  };
  updateHistory: CardUpdateRecord[];
  autoUpdateEnabled: boolean;
  nextUpdateCheck?: Date;
  failedUpdateAttempts: number;
  lastSuccessfulUpdate?: Date;
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column()
  stripePaymentMethodId!: string;

  @Column()
  stripeCustomerId!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    default: PaymentMethodType.CARD,
  })
  type!: PaymentMethodType;

  @Column({
    type: 'enum',
    enum: PaymentMethodStatus,
    default: PaymentMethodStatus.ACTIVE,
  })
  status!: PaymentMethodStatus;

  @Column({ type: 'json', nullable: true })
  cardDetails?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string; // 'credit', 'debit', 'prepaid'
    country: string;
  };

  @Column({ type: 'json', nullable: true })
  bankAccountDetails?: {
    bank_name: string;
    last4: string;
    account_type: string;
    routing_number_last4: string;
  };

  @Column({ type: 'json', nullable: true })
  digitalWalletDetails?: {
    wallet_type: string; // 'apple_pay', 'google_pay', 'samsung_pay'
    email?: string;
  };

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore?: number;

  @Column({ type: 'json', nullable: true })
  verificationData?: {
    verifiedAt?: Date;
    verificationMethod?: string;
    verificationScore?: number;
    lastUsedAt?: Date;
    usageCount?: number;
    failureCount?: number;
  };

  @Column({ type: 'json', nullable: true })
  encryptedMetadata?: {
    fingerprint: string;
    networkTokenized: boolean;
    walletProvider?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'int', default: 0 })
  failureCount!: number;

  @Column({ nullable: true })
  blockedAt?: Date;

  @Column({ nullable: true })
  blockedReason?: string;

  // New fields for enhanced enterprise functionality
  @Column({ type: 'int', default: 0 })
  @Index()
  cardPosition!: number; // Order in user's card list (1-10)

  @Column({ type: 'json', nullable: true })
  autoUpdateData?: AutoUpdateData;

  @Column({ type: 'json', nullable: true })
  usageRestrictions?: UsageRestrictions;

  @Column({ type: 'json', nullable: true })
  complianceData?: ComplianceData;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.paymentMethods)
  user!: User;

  // Helper methods for enterprise functionality
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isBlocked(): boolean {
    return this.status === PaymentMethodStatus.BLOCKED;
  }

  canBeUsed(): boolean {
    return (
      this.status === PaymentMethodStatus.ACTIVE &&
      this.isVerified &&
      !this.isExpired() &&
      !this.isBlocked()
    );
  }

  getDisplayName(): string {
    switch (this.type) {
      case PaymentMethodType.CARD:
        return `${this.cardDetails?.brand || 'Card'} ending in ${this.cardDetails?.last4}`;
      case PaymentMethodType.BANK_ACCOUNT:
        return `${this.bankAccountDetails?.bank_name || 'Bank'} ending in ${this.bankAccountDetails?.last4}`;
      case PaymentMethodType.DIGITAL_WALLET:
        return `${this.digitalWalletDetails?.wallet_type || 'Digital Wallet'}`;
      default:
        return 'Payment Method';
    }
  }

  incrementUsage(): void {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
  }

  incrementFailure(): void {
    this.failureCount += 1;

    // Auto-block after 5 failures
    if (this.failureCount >= 5) {
      this.status = PaymentMethodStatus.BLOCKED;
      this.blockedAt = new Date();
      this.blockedReason = 'Excessive payment failures';
    }
  }

  updateRiskScore(score: number): void {
    this.riskScore = Math.max(0, Math.min(100, score));
  }

  // Enhanced methods for enterprise functionality
  canProcessAmount(amount: number): boolean {
    if (!this.canBeUsed()) return false;

    if (!this.usageRestrictions) return true;

    // Check transaction amount limit
    if (
      this.usageRestrictions.maxTransactionAmount &&
      amount > this.usageRestrictions.maxTransactionAmount
    ) {
      return false;
    }

    // Additional checks for daily/monthly limits would require transaction history
    // This would be implemented in the service layer
    return true;
  }

  canProcessAtTime(date: Date = new Date()): boolean {
    if (!this.usageRestrictions?.timeRestrictions) return true;

    return this.usageRestrictions.timeRestrictions.some((restriction) => {
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      return (
        hour >= restriction.startHour &&
        hour <= restriction.endHour &&
        restriction.daysOfWeek.includes(dayOfWeek)
      );
    });
  }

  canProcessForMerchant(merchantId: string): boolean {
    if (!this.usageRestrictions) return true;

    const { allowedMerchants, restrictedMerchants } = this.usageRestrictions;

    // If restricted merchants list exists and merchant is in it
    if (restrictedMerchants && restrictedMerchants.includes(merchantId)) {
      return false;
    }

    // If allowed merchants list exists and merchant is not in it
    if (allowedMerchants && allowedMerchants.length > 0 && !allowedMerchants.includes(merchantId)) {
      return false;
    }

    return true;
  }

  isEligibleForAutoUpdate(): boolean {
    if (!this.autoUpdateData?.autoUpdateEnabled) return false;
    if (this.type !== PaymentMethodType.CARD) return false;
    if (!this.cardDetails) return false;

    // Check if card is expiring in next 30 days
    const now = new Date();
    const expiryDate = new Date(this.cardDetails.exp_year, this.cardDetails.exp_month - 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return expiryDate <= thirtyDaysFromNow;
  }

  getComplianceStatus(): ComplianceStatus {
    if (!this.complianceData) return ComplianceStatus.NON_COMPLIANT;

    const { gdprConsent, dataRetentionExpiry } = this.complianceData;

    if (!gdprConsent) return ComplianceStatus.NON_COMPLIANT;

    const now = new Date();
    if (dataRetentionExpiry < now) return ComplianceStatus.EXPIRED;

    // Check if expiring within 30 days
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (dataRetentionExpiry < thirtyDaysFromNow) return ComplianceStatus.PENDING;

    return ComplianceStatus.COMPLIANT;
  }

  scheduleAutoUpdate(): void {
    if (!this.autoUpdateData) {
      this.autoUpdateData = {
        lastUpdateCheck: new Date(),
        updateSource: 'stripe_updater',
        updateHistory: [],
        autoUpdateEnabled: true,
        failedUpdateAttempts: 0,
      };
    }

    // Schedule next update check for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM

    this.autoUpdateData.nextUpdateCheck = tomorrow;
  }

  updateCardPosition(newPosition: number): void {
    if (newPosition < 1 || newPosition > 10) {
      throw new Error('Card position must be between 1 and 10');
    }
    this.cardPosition = newPosition;
  }

  recordCardUpdate(
    source: 'stripe_updater' | 'manual' | 'bank_notification',
    newDetails: any,
    reason: string,
  ): void {
    if (!this.autoUpdateData) {
      this.autoUpdateData = {
        lastUpdateCheck: new Date(),
        updateSource: source,
        updateHistory: [],
        autoUpdateEnabled: true,
        failedUpdateAttempts: 0,
      };
    }

    const updateRecord: CardUpdateRecord = {
      date: new Date(),
      source,
      previousDetails: this.cardDetails
        ? {
            exp_month: this.cardDetails.exp_month,
            exp_year: this.cardDetails.exp_year,
            last4: this.cardDetails.last4,
          }
        : undefined,
      newDetails,
      reason,
    };

    this.autoUpdateData.updateHistory.push(updateRecord);
    this.autoUpdateData.lastSuccessfulUpdate = new Date();
    this.autoUpdateData.failedUpdateAttempts = 0;
  }

  recordFailedUpdate(): void {
    if (!this.autoUpdateData) return;

    this.autoUpdateData.failedUpdateAttempts += 1;

    // Disable auto-update after 3 consecutive failures
    if (this.autoUpdateData.failedUpdateAttempts >= 3) {
      this.autoUpdateData.autoUpdateEnabled = false;
    }
  }

  initializeComplianceData(ipAddress: string, userAgent: string): void {
    const now = new Date();
    const retentionExpiry = new Date(now);
    retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7); // 7 years retention

    this.complianceData = {
      gdprConsent: true,
      consentDate: now,
      dataRetentionExpiry: retentionExpiry,
      processingPurposes: ['payment_processing', 'fraud_prevention', 'customer_service'],
      dataSubjectRights: {
        canExport: true,
        canDelete: true,
        canRectify: true,
      },
      auditTrail: {
        created: { date: now, ipAddress, userAgent },
      },
    };
  }

  updateComplianceUsage(ipAddress: string, transactionId?: string): void {
    if (!this.complianceData) return;

    this.complianceData.auditTrail.lastUsed = {
      date: new Date(),
      ipAddress,
      transactionId,
    };
  }

  // Enhanced display method with position
  getDisplayNameWithPosition(): string {
    const baseName = this.getDisplayName();
    return `${this.cardPosition}. ${baseName}`;
  }

  // Method to check if this payment method can be deleted
  canBeDeleted(): boolean {
    // Cannot delete if it's the only payment method and user has active transactions
    // This logic would need to be implemented in the service layer with transaction checks
    return !this.isDefault || this.cardPosition > 1;
  }

  // Method to get usage statistics summary
  getUsageStatistics(): {
    totalUsage: number;
    successRate: number;
    lastUsed?: Date;
    averageTransactionAmount?: number;
  } {
    const successfulTransactions = Math.max(0, this.usageCount - this.failureCount);
    const successRate = this.usageCount > 0 ? (successfulTransactions / this.usageCount) * 100 : 0;

    return {
      totalUsage: this.usageCount,
      successRate: Math.round(successRate * 100) / 100,
      lastUsed: this.lastUsedAt,
      // averageTransactionAmount would need to be calculated from transaction history
    };
  }

  // Method to get usage status
  getUsageStatus(): 'active' | 'inactive' | 'blocked' | 'expired' {
    if (this.isExpired()) return 'expired';
    if (this.isBlocked()) return 'blocked';
    if (this.status === PaymentMethodStatus.ACTIVE) return 'active';
    return 'inactive';
  }

  // Method to get security level
  getSecurityLevel(): 'high' | 'medium' | 'low' {
    let score = 0;

    // Base security score
    if (this.isVerified) score += 30;
    if (this.complianceData?.gdprConsent) score += 20;
    if (this.type === PaymentMethodType.CARD) score += 20;

    // Risk score contribution (inverted)
    if (this.riskScore !== undefined) {
      score += Math.max(0, 30 - this.riskScore); // Lower risk = higher security
    }

    // Usage patterns
    if (this.usageCount > 0) {
      const successRate = ((this.usageCount - this.failureCount) / this.usageCount) * 100;
      if (successRate > 95) score += 10;
      else if (successRate > 80) score += 5;
    }

    // Auto-update enabled
    if (this.autoUpdateData?.autoUpdateEnabled) score += 5;

    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}
