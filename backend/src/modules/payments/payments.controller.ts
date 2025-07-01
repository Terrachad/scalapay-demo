import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './services/stripe.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UsersService } from '../users/users.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: PaymentWebhookService,
    private readonly usersService: UsersService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPaymentIntent(@Body() createPaymentDto: CreatePaymentDto, @Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    
    // Create Stripe customer if doesn't exist
    if (!user.stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(user.email, user.name);
      user.stripeCustomerId = customer.id;
      await this.usersService.updateUser(user.id, { stripeCustomerId: customer.id });
    }

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: createPaymentDto.amount / 100, // Convert cents to dollars for service
      currency: createPaymentDto.currency,
      customerId: user.stripeCustomerId,
      metadata: createPaymentDto.metadata,
    });

    // Create payment record
    const payment = new Payment();
    payment.amount = createPaymentDto.amount / 100; // Convert cents to dollars
    payment.status = PaymentStatus.SCHEDULED;
    payment.stripePaymentIntentId = paymentIntent.paymentIntentId;
    payment.dueDate = new Date(); // Immediate payment
    
    const savedPayment = await this.paymentRepository.save(payment);

    return {
      id: savedPayment.id,
      paymentIntentId: paymentIntent.paymentIntentId,
      clientSecret: paymentIntent.clientSecret,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      status: paymentIntent.status,
    };
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async confirmPaymentIntent(
    @Param('id') paymentIntentId: string,
    @Body() confirmDto: { paymentMethodId: string },
    @Request() req: any,
  ) {
    const confirmedPayment = await this.stripeService.confirmPaymentIntent(paymentIntentId);

    return {
      paymentIntentId: confirmedPayment.id,
      status: confirmedPayment.status,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payments with pagination' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getUserPayments(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('user.id = :userId', { userId: req.user.userId });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate });
    }

    const [payments, total] = await queryBuilder
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: payments,
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPaymentById(@Param('id') id: string, @Request() req: any) {
    const payment = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('payment.id = :id', { id })
      .getOne();

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.transaction?.user?.id !== req.user.userId) {
      throw new Error('Access denied');
    }

    return payment;
  }

  @Post('schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Schedule a payment' })
  @ApiResponse({ status: 201, description: 'Payment scheduled successfully' })
  async schedulePayment(
    @Body() scheduleDto: CreatePaymentDto & { scheduledDate: Date },
    @Request() req: any,
  ) {
    const user = await this.usersService.findById(req.user.userId);

    if (new Date(scheduleDto.scheduledDate) <= new Date()) {
      throw new Error('Scheduled date must be in the future');
    }

    const payment = new Payment();
    payment.amount = scheduleDto.amount / 100;
    payment.status = PaymentStatus.SCHEDULED;
    payment.dueDate = new Date(scheduleDto.scheduledDate);

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      id: savedPayment.id,
      status: savedPayment.status,
      amount: scheduleDto.amount,
      scheduledDate: savedPayment.dueDate,
    };
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed payment' })
  @ApiResponse({ status: 200, description: 'Payment retry initiated' })
  async retryPayment(@Param('id') id: string, @Request() req: any) {
    const payment = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.transaction', 'transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('payment.id = :id', { id })
      .getOne();

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.transaction?.user?.id !== req.user.userId) {
      throw new Error('Access denied');
    }

    // Reset payment for retry
    payment.status = PaymentStatus.SCHEDULED;
    payment.retryCount = 0;
    payment.nextRetryAt = undefined;
    payment.failureReason = undefined;

    const updatedPayment = await this.paymentRepository.save(payment);

    return {
      id: updatedPayment.id,
      status: updatedPayment.status,
      retryCount: updatedPayment.retryCount,
    };
  }

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(@Body() body: any, @Request() req: any) {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // Use raw body for signature verification
      const rawBody = req.body;
      const event = await this.stripeService.constructWebhookEvent(rawBody, signature);
      this.logger.log(`Received Stripe webhook: ${event.type} - ${event.id}`);

      await this.webhookService.handleStripeEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }
}