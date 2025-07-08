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
import { User } from '../../users/entities/user.entity';

export enum SettingCategory {
  FINANCIAL = 'financial',
  SECURITY = 'security',
  NOTIFICATIONS = 'notifications',
  FEATURES = 'features',
  INTEGRATIONS = 'integrations',
  GENERAL = 'general',
}

export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  ENCRYPTED_STRING = 'encrypted_string',
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

@Entity('platform_settings')
@Index('IDX_PLATFORM_SETTINGS_COMPOSITE', ['category', 'environment', 'isActive'])
@Index('IDX_PLATFORM_SETTINGS_KEY_ENV_UNIQUE', ['key', 'environment'], { unique: true })
@Index('IDX_PLATFORM_SETTINGS_ENV', ['environment'])
@Index('IDX_PLATFORM_SETTINGS_ACTIVE_FLAG', ['isActive'])
export class PlatformSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  key!: string;

  @Column('text')
  value: any;

  @Column({
    type: 'enum',
    enum: SettingCategory,
    default: SettingCategory.GENERAL,
  })
  category!: SettingCategory;

  @Column({
    type: 'enum',
    enum: SettingDataType,
    default: SettingDataType.STRING,
  })
  dataType!: SettingDataType;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isEncrypted!: boolean;

  @Column({ default: false })
  requiresRestart!: boolean;

  @Column({
    type: 'enum',
    enum: Environment,
    default: Environment.PRODUCTION,
  })
  environment!: Environment;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;
}