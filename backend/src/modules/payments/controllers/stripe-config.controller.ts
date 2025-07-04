import { Controller, Get, Post, Body, UseGuards, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeService } from '../services/stripe.service';

@ApiTags('stripe-config')
@Controller('stripe-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StripeConfigController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'Get Stripe publishable key' })
  @ApiResponse({ status: 200, description: 'Stripe public key retrieved successfully' })
  async getPublicKey() {
    return {
      publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
  }

  @Post('webhook-test')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Test Stripe webhook configuration' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  async testWebhook(@Body() body: { eventType: string }) {
    // This would be used for testing webhook functionality
    return {
      message: `Webhook test for ${body.eventType} completed`,
      timestamp: new Date().toISOString(),
    };
  }
}
