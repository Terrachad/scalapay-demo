import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { StripeService } from '../services/stripe.service';
import { PaymentWebhookService } from '../services/payment-webhook.service';
import Stripe from 'stripe';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: PaymentWebhookService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger docs for security
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      const rawBody = req.rawBody || req.body;
      const event = await this.stripeService.constructWebhookEvent(rawBody, signature);
      this.logger.log(`Received Stripe webhook: ${event.type} - ${event.id}`);

      await this.webhookService.handleStripeEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('payment-reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle internal payment reminder webhooks' })
  @ApiResponse({ status: 200, description: 'Reminder processed successfully' })
  async handlePaymentReminder(
    @Body() payload: { paymentId: string; reminderType: string },
  ): Promise<{ processed: boolean }> {
    try {
      await this.webhookService.handlePaymentReminder(payload.paymentId, payload.reminderType);

      return { processed: true };
    } catch (error) {
      this.logger.error('Payment reminder processing failed', error);
      throw new BadRequestException('Payment reminder processing failed');
    }
  }
}
