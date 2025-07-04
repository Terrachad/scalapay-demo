import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethodService } from '../services/payment-method.service';

@ApiTags('payment-methods')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post('setup-intent')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create setup intent for storing payment method' })
  @ApiResponse({ status: 201, description: 'Setup intent created successfully' })
  async createSetupIntent(@Request() req: any) {
    return this.paymentMethodService.createSetupIntent(req.user.userId);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Store payment method after setup intent confirmation' })
  @ApiResponse({ status: 201, description: 'Payment method stored successfully' })
  async storePaymentMethod(
    @Body() body: { setupIntentId: string; makeDefault?: boolean },
    @Request() req: any,
  ) {
    return this.paymentMethodService.storePaymentMethod(
      req.user.userId,
      body.setupIntentId,
      body.makeDefault,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getUserPaymentMethods(@Request() req: any) {
    return this.paymentMethodService.getUserPaymentMethods(req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  async deletePaymentMethod(@Param('id') id: string, @Request() req: any) {
    return this.paymentMethodService.deletePaymentMethod(id, req.user.userId);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set payment method as default' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setAsDefault(@Param('id') id: string, @Request() req: any) {
    return this.paymentMethodService.setAsDefault(id, req.user.userId);
  }
}
