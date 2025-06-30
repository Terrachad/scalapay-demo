import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
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
  amount!: number;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SCHEDULED,
  })
  status!: PaymentStatus;

  @Column({ nullable: true })
  paymentDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  transactionId!: string;

  @ManyToOne(() => Transaction, transaction => transaction.payments)
  transaction!: Transaction;
}
