import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SettingCategory, SettingDataType } from './platform-setting.entity';
import { UserRole } from '../../users/entities/user.entity';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message: string;
  customValidator?: string;
}

@Entity('platform_settings_schema')
export class PlatformSettingSchema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

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

  @Column('json')
  validationRules!: ValidationRule[];

  @Column('json', { nullable: true })
  defaultValue?: any;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isRequired!: boolean;

  @Column({ default: false })
  isEncrypted!: boolean;

  @Column({ default: false })
  requiresRestart!: boolean;

  @Column({ default: true })
  isUserConfigurable!: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  minimumRole!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}