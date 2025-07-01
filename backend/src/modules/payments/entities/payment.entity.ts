import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Index()
  amount!: number;

  @Column({ type: 'date' })
  @Index()
  dueDate!: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SCHEDULED,
  })
  status!: PaymentStatus;

  @Column({ nullable: true })
  paymentDate!: Date;

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true })
  stripePaymentMethodId?: string;

  @Column({ type: 'int', nullable: true })
  installmentNumber?: number;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ nullable: true })
  nextRetryAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  @Index()
  transactionId!: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.payments)
  transaction!: Transaction;
}
