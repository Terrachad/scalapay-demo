import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessEarlyPaymentDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsString()
  @IsUUID()
  transactionId!: string;
}

export class ConfirmEarlyPaymentDto {
  @ApiProperty({ description: 'Stripe Payment Intent ID' })
  @IsString()
  paymentIntentId!: string;
}