import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentPlan {
  PAY_IN_2 = 'pay_in_2',
  PAY_IN_3 = 'pay_in_3',
  PAY_IN_4 = 'pay_in_4',
}

@Entity('transactions')
@Index(['status', 'createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Index()
  amount!: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({
    type: 'enum',
    enum: PaymentPlan,
  })
  paymentPlan!: PaymentPlan;

  @Column({ type: 'json' })
  items!: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;

  @Column({ type: 'integer', default: 0 })
  riskScore!: number;

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: 'varchar', default: 'credit' })
  paymentMethod!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cardAmount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  merchantId!: string;

  @ManyToOne(() => User, (user) => user.transactions)
  user!: User;

  @ManyToOne(() => Merchant, (merchant) => merchant.transactions)
  merchant!: Merchant;

  @OneToMany(() => Payment, (payment) => payment.transaction)
  payments!: Payment[];
}
