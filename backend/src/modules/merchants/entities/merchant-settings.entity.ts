import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Merchant } from './merchant.entity';

export enum SettingType {
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
  SECURITY = 'security',
  STORE = 'store',
}

@Entity('merchant_settings')
@Index(['merchantId', 'settingType', 'settingKey'], { unique: true })
export class MerchantSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'merchant_id' })
  merchantId!: string;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;

  @Column({
    type: 'enum',
    enum: SettingType,
    name: 'setting_type',
  })
  settingType!: SettingType;

  @Column({ name: 'setting_key' })
  settingKey!: string;

  @Column({ type: 'text', name: 'setting_value' })
  settingValue!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

// Type definitions for structured settings
export interface PaymentSettings {
  enablePayIn2: boolean;
  enablePayIn3: boolean;
  enablePayIn4: boolean;
  minimumAmount: number;
  maximumAmount: number;
  autoApprove: boolean;
  requireManualReview: boolean;
}

export interface NotificationSettings {
  newOrders: boolean;
  paymentReceived: boolean;
  paymentFailed: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  webhookUrl: string;
  apiKey: string;
}

export interface StoreSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  feePercentage: number;
  isActive: boolean;
}