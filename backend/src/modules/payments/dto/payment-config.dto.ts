import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'Configuration value' })
  @IsString()
  value!: string;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether config is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaymentConfigDto {
  @ApiProperty({ description: 'Configuration value', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether config is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
