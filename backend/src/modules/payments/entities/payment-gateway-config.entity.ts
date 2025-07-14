import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export enum GatewayProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  BRAINTREE = 'braintree',
}

export enum ConfigCategory {
  GATEWAY = 'gateway',
  PROCESSING = 'processing',
  SECURITY = 'security',
  WEBHOOKS = 'webhooks',
  FRAUD = 'fraud',
  COMPLIANCE = 'compliance',
}

@Entity('payment_gateway_configs')
@Index(['configKey', 'environment'], { unique: true })
@Index(['category', 'environment'])
@Index(['provider', 'environment'])
export class PaymentGatewayConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'config_key', length: 100 })
  configKey!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({
    type: 'enum',
    enum: ConfigCategory,
    default: ConfigCategory.GATEWAY,
  })
  category!: ConfigCategory;

  @Column({
    type: 'enum',
    enum: Environment,
    default: Environment.DEVELOPMENT,
  })
  environment!: Environment;

  @Column({
    type: 'enum',
    enum: GatewayProvider,
    nullable: true,
  })
  provider?: GatewayProvider;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_encrypted', default: false })
  isEncrypted!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    dataType: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
    validation?: {
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
    };
    ui?: {
      label: string;
      placeholder?: string;
      helpText?: string;
      inputType?: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'switch';
      order?: number;
    };
  };

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_validated_at' })
  lastValidatedAt?: Date;

  @Column({ name: 'validation_status', default: 'pending' })
  validationStatus!: 'pending' | 'valid' | 'invalid' | 'expired';

  @Column({ type: 'text', nullable: true, name: 'validation_error' })
  validationError?: string;
}

// Type-safe configuration interfaces
export interface StripeGatewayConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
  captureMethod: 'automatic' | 'manual';
  currency: string;
  enablePaymentMethods: string[];
  enable3DSecure: boolean;
}

export interface ProcessingConfig {
  enableRetries: boolean;
  maxRetryAttempts: number;
  retryDelayMinutes: number;
  timeoutSeconds: number;
  enableDuplicateDetection: boolean;
  duplicateWindowMinutes: number;
}

export interface SecurityConfig {
  enableFraudDetection: boolean;
  fraudThreshold: number;
  enableCardTokenization: boolean;
  requireCVV: boolean;
  enableAddressVerification: boolean;
  maxDailyTransactionAmount: number;
  allowedCountries: string[];
  blockedCountries: string[];
}

export interface WebhookConfig {
  enableWebhooks: boolean;
  endpointUrl: string;
  timeoutSeconds: number;
  maxRetries: number;
  enabledEvents: string[];
  signatureValidation: boolean;
}
