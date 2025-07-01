import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumberString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '../entities/transaction.entity';

export class TransactionFilterDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
