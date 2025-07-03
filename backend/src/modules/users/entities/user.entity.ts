import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { PaymentMethod } from '../../payments/entities/payment-method.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
  creditLimit!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
  availableCredit!: number;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  // Merchant-specific fields
  @Column({ nullable: true })
  businessName?: string;

  @Column({ nullable: true })
  businessAddress?: string;

  @Column({ nullable: true })
  businessPhone?: string;

  @Column({ type: 'json', nullable: true })
  businessDocuments?: any;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore?: number;

  // Approval tracking
  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ nullable: true })
  approvalNotes?: string;

  @Column({ nullable: true })
  rejectedAt?: Date;

  @Column({ nullable: true })
  rejectedBy?: string;

  @Column({ nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions!: Transaction[];

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.user)
  paymentMethods!: PaymentMethod[];
}
