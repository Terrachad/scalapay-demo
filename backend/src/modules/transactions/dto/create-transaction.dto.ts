import { IsNotEmpty, IsString, IsNumber, IsEnum, IsArray, ValidateNested, IsUUID, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentPlan } from '../entities/transaction.entity';

export class TransactionItemDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(50000) // Maximum transaction amount
  amount!: number;

  @IsNotEmpty()
  @IsUUID()
  merchantId!: string;

  @IsNotEmpty()
  @IsEnum(PaymentPlan)
  paymentPlan!: PaymentPlan;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @IsOptional()
  metadata?: object;

  // This will be set by the controller from the authenticated user
  userId?: string;
}