import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Interfaces for early payment configuration
export interface DiscountTier {
  timeRange: string; // '0-7days', '8-14days', '15-30days', '31+days'
  discountRate: number; // 0.01 = 1%, 0.025 = 2.5%
  minimumAmount: number; // Minimum amount for this discount tier
  maximumDiscount: number; // Maximum discount amount (cap)
  description: string; // Human-readable description
}

export interface EarlyPaymentRestrictions {
  maxEarlyPaymentsPerMonth?: number; // Limit early payments per month
  maxEarlyPaymentsPerTransaction?: number; // Limit early payments per transaction
  excludedPaymentMethods?: string[]; // Payment method types to exclude
  businessRulesEngine?: string; // Custom business rules logic
  requireApprovalAmount?: number; // Amount requiring merchant approval
  minimumDaysBeforeEarly?: number; // Minimum days before early payment allowed
  blackoutDates?: Date[]; // Dates when early payment is not allowed
  userTierRestrictions?: {
    tier: string;
    allowEarlyPayment: boolean;
    maxDiscountRate: number;
  }[];
}

export interface EarlyPaymentAnalytics {
  totalEarlyPayments: number;
  totalSavingsProvided: number;
  averageDiscountRate: number;
  mostPopularTimeRange: string;
  earlyPaymentAdoptionRate: number; // Percentage of transactions that use early payment
  lastCalculatedAt: Date;
}

@Entity('early_payment_configs')
export class EarlyPaymentConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  merchantId!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'json' })
  discountTiers!: DiscountTier[];

  @Column({ default: true })
  allowPartialPayments!: boolean;

  @Column({ default: false })
  requireMerchantApproval!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  minimumEarlyPaymentAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumEarlyPaymentAmount?: number;

  @Column({ type: 'json', nullable: true })
  restrictions?: EarlyPaymentRestrictions;

  @Column({ type: 'json', nullable: true })
  analytics?: EarlyPaymentAnalytics;

  // Notification settings for early payments
  @Column({ type: 'json', nullable: true })
  notificationSettings?: {
    notifyMerchantOnEarlyPayment: boolean;
    notifyUserOnSavings: boolean;
    emailTemplate?: string;
    smsTemplate?: string;
  };

  // Advanced configuration
  @Column({ type: 'json', nullable: true })
  advancedConfig?: {
    compoundInterestCalculation: boolean;
    proRatedDiscounts: boolean;
    seasonalDiscountMultipliers?: {
      season: string;
      multiplier: number;
    }[];
    loyaltyBonusRates?: {
      transactionCount: number;
      bonusRate: number;
    }[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods for early payment logic
  getApplicableDiscountTier(daysBeforeOriginalDue: number, amount: number): DiscountTier | null {
    if (!this.enabled) return null;

    // Find applicable tiers based on time range
    const applicableTiers = this.discountTiers.filter((tier) => {
      return (
        this.isWithinTimeRange(tier.timeRange, daysBeforeOriginalDue) &&
        amount >= tier.minimumAmount
      );
    });

    // Return the tier with the highest discount rate
    return applicableTiers.reduce(
      (best, current) => (current.discountRate > (best?.discountRate || 0) ? current : best),
      null as DiscountTier | null,
    );
  }

  calculateEarlyPaymentDiscount(
    amount: number,
    daysBeforeOriginalDue: number,
  ): {
    discountAmount: number;
    discountRate: number;
    tier: DiscountTier | null;
    savings: number;
  } {
    const tier = this.getApplicableDiscountTier(daysBeforeOriginalDue, amount);

    if (!tier) {
      return {
        discountAmount: 0,
        discountRate: 0,
        tier: null,
        savings: 0,
      };
    }

    let discountAmount = amount * tier.discountRate;

    // Apply maximum discount cap
    if (discountAmount > tier.maximumDiscount) {
      discountAmount = tier.maximumDiscount;
    }

    // Apply advanced configuration modifiers
    if (this.advancedConfig) {
      discountAmount = this.applyAdvancedModifiers(discountAmount, amount, daysBeforeOriginalDue);
    }

    return {
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
      discountRate: tier.discountRate,
      tier,
      savings: discountAmount,
    };
  }

  canProcessEarlyPayment(
    amount: number,
    paymentCount: number,
    userTier?: string,
    paymentMethodType?: string,
  ): {
    allowed: boolean;
    reason?: string;
  } {
    if (!this.enabled) {
      return { allowed: false, reason: 'Early payment is disabled for this merchant' };
    }

    if (amount < this.minimumEarlyPaymentAmount) {
      return {
        allowed: false,
        reason: `Minimum early payment amount is $${this.minimumEarlyPaymentAmount}`,
      };
    }

    if (this.maximumEarlyPaymentAmount && amount > this.maximumEarlyPaymentAmount) {
      return {
        allowed: false,
        reason: `Maximum early payment amount is $${this.maximumEarlyPaymentAmount}`,
      };
    }

    if (this.restrictions) {
      // Check payment method restrictions
      if (
        paymentMethodType &&
        this.restrictions.excludedPaymentMethods?.includes(paymentMethodType)
      ) {
        return {
          allowed: false,
          reason: `Payment method ${paymentMethodType} not allowed for early payment`,
        };
      }

      // Check user tier restrictions
      if (userTier && this.restrictions.userTierRestrictions) {
        const tierRestriction = this.restrictions.userTierRestrictions.find(
          (r) => r.tier === userTier,
        );
        if (tierRestriction && !tierRestriction.allowEarlyPayment) {
          return { allowed: false, reason: `Early payment not allowed for ${userTier} tier users` };
        }
      }

      // Check approval requirement
      if (
        this.restrictions.requireApprovalAmount &&
        amount >= this.restrictions.requireApprovalAmount
      ) {
        return { allowed: false, reason: 'This amount requires merchant approval' };
      }
    }

    return { allowed: true };
  }

  isEarlyPaymentBeneficial(originalAmount: number, daysBeforeOriginalDue: number): boolean {
    const { discountAmount } = this.calculateEarlyPaymentDiscount(
      originalAmount,
      daysBeforeOriginalDue,
    );

    // Consider it beneficial if discount is at least $1 or 0.5% of the amount
    const minimumBenefit = Math.max(1, originalAmount * 0.005);

    return discountAmount >= minimumBenefit;
  }

  updateAnalytics(earlyPaymentData: {
    amount: number;
    discountProvided: number;
    timeRange: string;
  }): void {
    if (!this.analytics) {
      this.analytics = {
        totalEarlyPayments: 0,
        totalSavingsProvided: 0,
        averageDiscountRate: 0,
        mostPopularTimeRange: '',
        earlyPaymentAdoptionRate: 0,
        lastCalculatedAt: new Date(),
      };
    }

    this.analytics.totalEarlyPayments += 1;
    this.analytics.totalSavingsProvided += earlyPaymentData.discountProvided;
    this.analytics.averageDiscountRate =
      this.analytics.totalSavingsProvided /
      (this.analytics.totalEarlyPayments * earlyPaymentData.amount);
    this.analytics.lastCalculatedAt = new Date();
  }

  private isWithinTimeRange(timeRange: string, days: number): boolean {
    switch (timeRange) {
      case '0-7days':
        return days <= 7;
      case '8-14days':
        return days >= 8 && days <= 14;
      case '15-30days':
        return days >= 15 && days <= 30;
      case '31+days':
        return days >= 31;
      default:
        return false;
    }
  }

  private applyAdvancedModifiers(baseDiscount: number, amount: number, days: number): number {
    if (!this.advancedConfig) return baseDiscount;

    let modifiedDiscount = baseDiscount;

    // Apply seasonal multipliers
    if (this.advancedConfig.seasonalDiscountMultipliers) {
      const currentSeason = this.getCurrentSeason();
      const seasonalMultiplier = this.advancedConfig.seasonalDiscountMultipliers.find(
        (s) => s.season === currentSeason,
      );

      if (seasonalMultiplier) {
        modifiedDiscount *= seasonalMultiplier.multiplier;
      }
    }

    // Apply loyalty bonuses (would need transaction count from service layer)
    // This is a placeholder for loyalty bonus calculation

    return modifiedDiscount;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // Static method to create default configuration
  static createDefaultConfig(merchantId: string): Partial<EarlyPaymentConfig> {
    return {
      merchantId,
      enabled: true,
      allowPartialPayments: true,
      requireMerchantApproval: false,
      minimumEarlyPaymentAmount: 10.0,
      discountTiers: [
        {
          timeRange: '0-7days',
          discountRate: 0.02, // 2%
          minimumAmount: 10,
          maximumDiscount: 50,
          description: 'Pay within 7 days for 2% discount',
        },
        {
          timeRange: '8-14days',
          discountRate: 0.015, // 1.5%
          minimumAmount: 10,
          maximumDiscount: 30,
          description: 'Pay within 14 days for 1.5% discount',
        },
        {
          timeRange: '15-30days',
          discountRate: 0.01, // 1%
          minimumAmount: 10,
          maximumDiscount: 20,
          description: 'Pay within 30 days for 1% discount',
        },
      ],
      notificationSettings: {
        notifyMerchantOnEarlyPayment: true,
        notifyUserOnSavings: true,
      },
    };
  }

  // Method to validate configuration
  validateConfiguration(): string[] {
    const errors: string[] = [];

    if (!this.discountTiers || this.discountTiers.length === 0) {
      errors.push('At least one discount tier must be configured');
    }

    if (this.discountTiers) {
      this.discountTiers.forEach((tier, index) => {
        if (tier.discountRate <= 0 || tier.discountRate > 1) {
          errors.push(`Discount tier ${index + 1}: Rate must be between 0 and 1`);
        }
        if (tier.minimumAmount < 0) {
          errors.push(`Discount tier ${index + 1}: Minimum amount cannot be negative`);
        }
        if (tier.maximumDiscount <= 0) {
          errors.push(`Discount tier ${index + 1}: Maximum discount must be positive`);
        }
      });
    }

    if (this.minimumEarlyPaymentAmount < 0) {
      errors.push('Minimum early payment amount cannot be negative');
    }

    if (
      this.maximumEarlyPaymentAmount &&
      this.maximumEarlyPaymentAmount < this.minimumEarlyPaymentAmount
    ) {
      errors.push('Maximum early payment amount cannot be less than minimum');
    }

    return errors;
  }
}
