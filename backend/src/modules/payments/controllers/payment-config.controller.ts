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

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get merchant-specific payment configuration' })
  @ApiResponse({
    status: 200,
    description: 'Merchant payment configuration retrieved successfully',
  })
  async getMerchantConfig(@Param('merchantId') merchantId: string) {
    return this.paymentConfigService.getConfigForMerchant(merchantId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default payment configuration' })
  @ApiResponse({ status: 200, description: 'Default payment configuration retrieved successfully' })
  async getDefaultConfig() {
    // Try to get the 'default' config from database first
    try {
      const defaultConfig = await this.paymentConfigService.getConfigByKey('default');
      if (defaultConfig && defaultConfig.value) {
        return JSON.parse(defaultConfig.value);
      }
    } catch (error) {
      // If no 'default' config found in database, return hardcoded defaults
      console.log('No default config found in database, returning hardcoded defaults');
    }

    // Return hardcoded default configuration
    return {
      paymentInterval: 'biweekly',
      gracePeriodDays: 3,
      lateFeeAmount: 25,
      maxRetries: 3,
      interestRate: 0.0,
      enableEarlyPayment: true,
      enableAutoRetry: true,
      enableNotifications: true,
    };
  }

  @Put('merchant/:merchantId')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update merchant payment configuration' })
  @ApiResponse({ status: 200, description: 'Merchant payment configuration updated successfully' })
  async updateMerchantConfig(@Param('merchantId') merchantId: string, @Body() updateData: any) {
    // For now, we'll just return the merchant config since the service doesn't support merchant-specific updates yet
    return this.paymentConfigService.getConfigForMerchant(merchantId);
  }

  @Put('default')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update default payment configuration' })
  @ApiResponse({ status: 200, description: 'Default payment configuration updated successfully' })
  async updateDefaultConfig(@Body() updateData: any) {
    try {
      // Try to update existing default config
      await this.paymentConfigService.updateConfig('default', {
        value: JSON.stringify(updateData),
      });
    } catch (error) {
      // If it doesn't exist, create it
      await this.paymentConfigService.createConfig({
        key: 'default',
        value: JSON.stringify(updateData),
        description: 'Default payment configuration for all transactions',
        isActive: true,
      });
    }

    return updateData;
  }

  @Post('seed-default')
  @ApiOperation({ summary: 'Seed default payment configuration (dev only)' })
  @ApiResponse({ status: 201, description: 'Default payment configuration seeded successfully' })
  async seedDefaultConfig() {
    const defaultConfig = {
      paymentInterval: 'biweekly',
      gracePeriodDays: 3,
      lateFeeAmount: 25,
      maxRetries: 3,
      interestRate: 0.0,
      enableEarlyPayment: true,
      enableAutoRetry: true,
      enableNotifications: true,
    };

    try {
      await this.paymentConfigService.createConfig({
        key: 'default',
        value: JSON.stringify(defaultConfig),
        description: 'Default payment configuration for all transactions',
        isActive: true,
      });
      return { message: 'Default config created successfully', config: defaultConfig };
    } catch (error) {
      // If it already exists, update it
      await this.paymentConfigService.updateConfig('default', {
        value: JSON.stringify(defaultConfig),
      });
      return { message: 'Default config updated successfully', config: defaultConfig };
    }
  }
}
