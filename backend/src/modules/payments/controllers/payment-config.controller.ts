import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentConfigService } from '../services/payment-config.service';
import { CreatePaymentConfigDto, UpdatePaymentConfigDto } from '../dto/payment-config.dto';

@ApiTags('payment-config')
@Controller('payment-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentConfigController {
  constructor(private readonly paymentConfigService: PaymentConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payment configurations' })
  @ApiResponse({ status: 200, description: 'Payment configurations retrieved successfully' })
  async getAllConfigs() {
    return this.paymentConfigService.getAllConfigs();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get payment configuration by key' })
  @ApiResponse({ status: 200, description: 'Payment configuration retrieved successfully' })
  async getConfigByKey(@Param('key') key: string) {
    return this.paymentConfigService.getConfigByKey(key);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create payment configuration' })
  @ApiResponse({ status: 201, description: 'Payment configuration created successfully' })
  async createConfig(@Body() createDto: CreatePaymentConfigDto) {
    return this.paymentConfigService.createConfig(createDto);
  }

  @Put(':key')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update payment configuration' })
  @ApiResponse({ status: 200, description: 'Payment configuration updated successfully' })
  async updateConfig(@Param('key') key: string, @Body() updateDto: UpdatePaymentConfigDto) {
    return this.paymentConfigService.updateConfig(key, updateDto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete payment configuration' })
  @ApiResponse({ status: 200, description: 'Payment configuration deleted successfully' })
  async deleteConfig(@Param('key') key: string) {
    return this.paymentConfigService.deleteConfig(key);
  }
}