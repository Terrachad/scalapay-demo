import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(1000000) // $10,000 max
  amount!: number;

  @IsNotEmpty()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP'])
  currency!: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
