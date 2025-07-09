import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SettingOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('platform_settings_history')
@Index('IDX_PLATFORM_SETTINGS_HISTORY_SETTING', ['settingId'])
@Index('IDX_PLATFORM_SETTINGS_HISTORY_DATE', ['changedAt'])
@Index('IDX_PLATFORM_SETTINGS_HISTORY_USER', ['changedBy'])
@Index('IDX_PLATFORM_SETTINGS_HISTORY_KEY_NAME', ['key'])
export class PlatformSettingHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  settingId!: string;

  @Column()
  key!: string;

  @Column('json', { nullable: true })
  oldValue?: any;

  @Column('json', { nullable: true })
  newValue?: any;

  @Column({
    type: 'enum',
    enum: SettingOperation,
  })
  operation!: SettingOperation;

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  changedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedBy?: User;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  requestId?: string;
}
