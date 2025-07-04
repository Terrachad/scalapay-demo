import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column()
  stripePaymentMethodId!: string;

  @Column()
  stripeCustomerId!: string;

  @Column()
  type!: string; // 'card'

  @Column({ type: 'json', nullable: true })
  cardDetails?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.paymentMethods)
  user!: User;
}
