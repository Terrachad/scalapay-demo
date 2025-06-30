import { Exclude, Expose, Type } from 'class-transformer';
import { TransactionStatus, PaymentPlan } from '../entities/transaction.entity';

export class TransactionItemResponseDto {
  @Expose()
  name!: string;

  @Expose()
  price!: number;

  @Expose()
  quantity!: number;
}

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string;

  @Exclude()
  password!: string;
}

export class MerchantResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string;
}

export class PaymentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  amount!: number;

  @Expose()
  dueDate!: Date;

  @Expose()
  status!: string;

  @Expose()
  paidAt?: Date;
}

export class TransactionResponseDto {
  @Expose()
  id!: string;

  @Expose()
  amount!: number;

  @Expose()
  status!: TransactionStatus;

  @Expose()
  paymentPlan!: PaymentPlan;

  @Expose()
  @Type(() => TransactionItemResponseDto)
  items!: TransactionItemResponseDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;

  @Expose()
  @Type(() => MerchantResponseDto)
  merchant!: MerchantResponseDto;

  @Expose()
  @Type(() => PaymentResponseDto)
  payments!: PaymentResponseDto[];

  @Expose()
  metadata?: object;
}

export class TransactionListResponseDto {
  @Expose()
  @Type(() => TransactionResponseDto)
  transactions!: TransactionResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  totalPages!: number;
}