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
}
