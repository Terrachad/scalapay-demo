import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Interfaces for GDPR compliance
export interface ConsentData {
  paymentProcessing: boolean;
  marketingCommunications: boolean;
  dataAnalytics: boolean;
  thirdPartySharing: boolean;
  profileEnhancement: boolean;
  locationTracking: boolean;
  behavioralAnalysis: boolean;
  personalizedOffers: boolean;
  // Custom consent categories
  customConsents?: {
    [key: string]: boolean;
  };
}

export interface LegalBasis {
  processingType:
    | 'consent'
    | 'contract'
    | 'legal_obligation'
    | 'vital_interests'
    | 'public_task'
    | 'legitimate_interest';
  description: string;
  retentionPeriod: number; // in days
  automaticDeletion: boolean;
  reviewRequired: boolean;
  reviewDate?: Date;
  dataController: string;
  dataProcessor?: string;
  transferredToThirdCountries: boolean;
  safeguards?: string;
}

export interface DataSubjectRights {
  rightToAccess: boolean;
  rightToRectification: boolean;
  rightToErasure: boolean;
  rightToRestrictProcessing: boolean;
  rightToDataPortability: boolean;
  rightToObject: boolean;
  rightsRelatedToAutomatedDecision: boolean;
  rightToWithdrawConsent: boolean;
}

export interface ConsentHistory {
  action: 'granted' | 'withdrawn' | 'modified' | 'expired' | 'renewed';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  method: 'web' | 'mobile' | 'api' | 'admin' | 'automatic';
  details: string;
  previousState?: Partial<ConsentData>;
  newState?: Partial<ConsentData>;
}

export interface ComplianceMetadata {
  dataRetentionPolicy: {
    category: string;
    retentionPeriod: number;
    autoDeleteEnabled: boolean;
    lastReviewDate?: Date;
    nextReviewDate: Date;
  }[];
  crossBorderTransfers: {
    country: string;
    adequacyDecision: boolean;
    safeguards: string[];
    purpose: string;
  }[];
  dataProcessingActivities: {
    purpose: string;
    categories: string[];
    recipients: string[];
    retention: number;
    securityMeasures: string[];
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
    lastAssessed: Date;
    nextAssessment: Date;
  };
}

export interface DataRequest {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestDetails: string;
  responseDetails?: string;
  verificationMethod: string;
  verificationCompleted: boolean;
  escalationLevel: number;
  handlerUserId?: string;
}

@Entity('gdpr_consents')
export class GDPRConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column({ type: 'json' })
  consentData!: ConsentData;

  @Column()
  @Index()
  consentDate!: Date;

  @Column({ nullable: true })
  @Index()
  withdrawalDate?: Date;

  @Column()
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'json', nullable: true })
  geolocation?: {
    country: string;
    region: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  legalBasis?: LegalBasis[];

  @Column({ type: 'json', nullable: true })
  dataSubjectRights?: DataSubjectRights;

  @Column({ type: 'json', nullable: true })
  consentHistory?: ConsentHistory[];

  @Column({ type: 'json', nullable: true })
  complianceMetadata?: ComplianceMetadata;

  @Column({ type: 'json', nullable: true })
  dataRequests?: DataRequest[];

  // Consent management
  @Column({ default: false })
  isActive!: boolean;

  @Column({ nullable: true })
  expiryDate?: Date;

  @Column({ default: false })
  requiresRenewal!: boolean;

  @Column({ nullable: true })
  renewalReminderSent?: Date;

  @Column({ nullable: true })
  lastInteraction?: Date;

  // Verification and audit
  @Column({ type: 'json', nullable: true })
  verificationData?: {
    method: 'email' | 'sms' | 'document' | 'biometric' | 'web';
    verified: boolean;
    verificationDate?: Date;
    verificationToken?: string;
    verificationAttempts: number;
  };

  @Column({ type: 'json', nullable: true })
  auditTrail?: {
    createdBy: string;
    createdMethod: string;
    lastModifiedBy?: string;
    lastModifiedMethod?: string;
    accessLog: {
      timestamp: Date;
      accessor: string;
      method: string;
      purpose: string;
    }[];
    complianceChecks: {
      timestamp: Date;
      checkType: string;
      result: 'pass' | 'fail' | 'warning';
      details: string;
    }[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods for GDPR compliance
  isConsentValid(): boolean {
    if (!this.isActive) return false;
    if (this.withdrawalDate) return false;
    if (this.expiryDate && new Date() > this.expiryDate) return false;
    return true;
  }

  hasValidConsentFor(purpose: keyof ConsentData): boolean {
    if (!this.isConsentValid()) return false;
    return this.consentData[purpose] === true;
  }

  needsRenewal(): boolean {
    if (!this.isActive) return false;
    if (this.requiresRenewal) return true;
    if (this.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (this.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiry <= 30; // Renewal needed within 30 days
    }
    return false;
  }

  withdrawConsent(purpose?: keyof ConsentData, ipAddress?: string, userAgent?: string): void {
    const now = new Date();

    if (purpose) {
      // Withdraw specific consent
      const previousState = { ...this.consentData };

      if (purpose === 'customConsents') {
        // For custom consents, set all to false
        if (this.consentData.customConsents) {
          Object.keys(this.consentData.customConsents).forEach((key) => {
            this.consentData.customConsents![key] = false;
          });
        }
      } else {
        // For regular boolean properties
        (this.consentData as any)[purpose] = false;
      }

      this.recordConsentHistory({
        action: 'withdrawn',
        timestamp: now,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        method: 'web',
        details: `Consent withdrawn for ${purpose}`,
        previousState,
        newState: this.consentData,
      });
    } else {
      // Withdraw all consent
      this.withdrawalDate = now;
      this.isActive = false;

      // Set all boolean properties to false
      this.consentData.paymentProcessing = false;
      this.consentData.marketingCommunications = false;
      this.consentData.dataAnalytics = false;
      this.consentData.thirdPartySharing = false;
      this.consentData.profileEnhancement = false;
      this.consentData.locationTracking = false;
      this.consentData.behavioralAnalysis = false;
      this.consentData.personalizedOffers = false;

      // Set all custom consents to false
      if (this.consentData.customConsents) {
        Object.keys(this.consentData.customConsents).forEach((key) => {
          this.consentData.customConsents![key] = false;
        });
      }

      this.recordConsentHistory({
        action: 'withdrawn',
        timestamp: now,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        method: 'web',
        details: 'All consent withdrawn',
      });
    }

    this.lastInteraction = now;
  }

  updateConsent(newConsentData: Partial<ConsentData>, ipAddress: string, userAgent: string): void {
    const previousState = { ...this.consentData };

    Object.entries(newConsentData).forEach(([key, value]) => {
      if (key in this.consentData) {
        (this.consentData as any)[key] = value;
      }
    });

    this.recordConsentHistory({
      action: 'modified',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      method: 'web',
      details: 'Consent preferences updated',
      previousState,
      newState: this.consentData,
    });

    this.lastInteraction = new Date();
  }

  renewConsent(ipAddress: string, userAgent: string): void {
    const now = new Date();

    // Extend expiry date by 2 years
    this.expiryDate = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    this.requiresRenewal = false;
    this.renewalReminderSent = undefined;

    this.recordConsentHistory({
      action: 'renewed',
      timestamp: now,
      ipAddress,
      userAgent,
      method: 'web',
      details: 'Consent renewed for 2 years',
    });

    this.lastInteraction = now;
  }

  createDataRequest(
    type: DataRequest['type'],
    details: string,
    verificationMethod: string,
  ): string {
    if (!this.dataRequests) {
      this.dataRequests = [];
    }

    const request: DataRequest = {
      type,
      status: 'pending',
      requestDate: new Date(),
      requestDetails: details,
      verificationMethod,
      verificationCompleted: false,
      escalationLevel: 0,
    };

    this.dataRequests.push(request);

    // Return request identifier (index for now, could be UUID)
    return (this.dataRequests.length - 1).toString();
  }

  processDataRequest(
    requestIndex: number,
    status: DataRequest['status'],
    responseDetails?: string,
    handlerUserId?: string,
  ): void {
    if (!this.dataRequests || !this.dataRequests[requestIndex]) {
      throw new Error('Data request not found');
    }

    const request = this.dataRequests[requestIndex];
    request.status = status;
    request.responseDetails = responseDetails;
    request.handlerUserId = handlerUserId;

    if (status === 'completed' || status === 'rejected') {
      request.completionDate = new Date();
    }
  }

  getPendingDataRequests(): DataRequest[] {
    if (!this.dataRequests) return [];
    return this.dataRequests.filter(
      (request) => request.status === 'pending' || request.status === 'processing',
    );
  }

  getDataRetentionPeriod(category: string): number {
    if (!this.complianceMetadata?.dataRetentionPolicy) return 2557; // 7 years default

    const policy = this.complianceMetadata.dataRetentionPolicy.find((p) => p.category === category);
    return policy?.retentionPeriod || 2557;
  }

  shouldAutoDelete(category: string): boolean {
    if (!this.complianceMetadata?.dataRetentionPolicy) return false;

    const policy = this.complianceMetadata.dataRetentionPolicy.find((p) => p.category === category);
    if (!policy || !policy.autoDeleteEnabled) return false;

    const retentionExpiry = new Date(
      this.createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000,
    );
    return new Date() > retentionExpiry;
  }

  getComplianceScore(): number {
    let score = 0;

    // Base score for having active consent
    if (this.isConsentValid()) score += 20;

    // Score for having complete consent data
    const consentCount = Object.values(this.consentData).filter(Boolean).length;
    score += Math.min(30, consentCount * 5);

    // Score for having legal basis documented
    if (this.legalBasis && this.legalBasis.length > 0) score += 15;

    // Score for having data subject rights defined
    if (this.dataSubjectRights) score += 10;

    // Score for having verification
    if (this.verificationData?.verified) score += 10;

    // Score for having audit trail
    if (this.auditTrail && this.auditTrail.accessLog.length > 0) score += 10;

    // Score for having compliance metadata
    if (this.complianceMetadata) score += 15;

    return Math.min(100, score);
  }

  generateComplianceReport(): any {
    return {
      userId: this.userId,
      consentStatus: this.isConsentValid() ? 'valid' : 'invalid',
      consentDate: this.consentDate,
      withdrawalDate: this.withdrawalDate,
      consentCategories: Object.entries(this.consentData).filter(([_, value]) => value),
      dataSubjectRights: this.dataSubjectRights,
      legalBasis: this.legalBasis,
      pendingRequests: this.getPendingDataRequests().length,
      complianceScore: this.getComplianceScore(),
      lastInteraction: this.lastInteraction,
      needsRenewal: this.needsRenewal(),
      retentionStatus: this.complianceMetadata?.dataRetentionPolicy?.map((policy) => ({
        category: policy.category,
        expires: new Date(this.createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000),
        shouldAutoDelete: this.shouldAutoDelete(policy.category),
      })),
    };
  }

  private recordConsentHistory(entry: ConsentHistory): void {
    if (!this.consentHistory) {
      this.consentHistory = [];
    }

    this.consentHistory.push(entry);

    // Keep only last 100 entries
    if (this.consentHistory.length > 100) {
      this.consentHistory = this.consentHistory.slice(-100);
    }
  }

  // Static method to create default consent
  static createDefaultConsent(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Partial<GDPRConsent> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years

    return {
      userId,
      consentData: {
        paymentProcessing: true, // Required for service
        marketingCommunications: false,
        dataAnalytics: false,
        thirdPartySharing: false,
        profileEnhancement: false,
        locationTracking: false,
        behavioralAnalysis: false,
        personalizedOffers: false,
      },
      consentDate: now,
      ipAddress,
      userAgent,
      isActive: true,
      expiryDate,
      requiresRenewal: false,
      legalBasis: [
        {
          processingType: 'contract',
          description: 'Processing necessary for payment services contract',
          retentionPeriod: 2557, // 7 years for financial records
          automaticDeletion: false,
          reviewRequired: true,
          dataController: 'ScalaPay Ltd',
          transferredToThirdCountries: false,
        },
      ],
      dataSubjectRights: {
        rightToAccess: true,
        rightToRectification: true,
        rightToErasure: true,
        rightToRestrictProcessing: true,
        rightToDataPortability: true,
        rightToObject: true,
        rightsRelatedToAutomatedDecision: true,
        rightToWithdrawConsent: true,
      },
    };
  }

  // Method to validate consent configuration
  validateConsent(): string[] {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.consentData) {
      errors.push('Consent data is required');
    }

    if (!this.consentDate) {
      errors.push('Consent date is required');
    }

    if (!this.ipAddress) {
      errors.push('IP address is required for audit trail');
    }

    if (!this.userAgent) {
      errors.push('User agent is required for audit trail');
    }

    if (this.isActive && !this.legalBasis) {
      errors.push('Legal basis is required for active consent');
    }

    if (this.expiryDate && this.expiryDate <= new Date()) {
      errors.push('Consent has expired and needs renewal');
    }

    return errors;
  }
}
