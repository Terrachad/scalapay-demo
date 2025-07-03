import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPlan } from '../entities/transaction.entity';

export class TransactionItemDto {
  @ApiProperty({ description: 'Item name', example: 'iPhone 14 Pro' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Item price', example: 999.99, minimum: 0.01 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @ApiProperty({ description: 'Item quantity', example: 1, minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Total transaction amount',
    example: 999.99,
    minimum: 1,
    maximum: 50000,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(50000) // Maximum transaction amount
  amount!: number;

  @ApiProperty({
    description: 'Merchant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  merchantId!: string;

  @ApiProperty({
    description: 'Payment plan option',
    enum: PaymentPlan,
    example: PaymentPlan.PAY_IN_4,
  })
  @IsNotEmpty()
  @IsEnum(PaymentPlan)
  paymentPlan!: PaymentPlan;

  @ApiProperty({
    description: 'Items in the transaction',
    type: [TransactionItemDto],
    example: [{ name: 'iPhone 14 Pro', price: 999.99, quantity: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @ApiPropertyOptional({
    description: 'Payment method preference',
    example: { type: 'split', creditAmount: 500, cardAmount: 499.99 }
  })
  @IsOptional()
  paymentMethodPreference?: {
    type: 'credit' | 'stripe' | 'split';
    creditAmount?: number;
    cardAmount?: number;
  };

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'mobile_app', campaign: 'summer_sale' },
  })
  @IsOptional()
  metadata?: object;

  @ApiPropertyOptional({
    description: 'User ID - will be set from authenticated user if not provided',
    example: '500a126c-b32a-4888-8301-9f61ca950c98',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
