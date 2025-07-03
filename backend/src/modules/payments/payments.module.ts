import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentConfig } from './entities/payment-config.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { PaymentConfigController } from './controllers/payment-config.controller';
import { StripeConfigController } from './controllers/stripe-config.controller';
import { StripeService } from './services/stripe.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { NotificationService } from './services/notification.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentConfigService } from './services/payment-config.service';
import { PaymentRetryService } from './services/payment-retry.service';
import { EarlyPaymentService } from './services/early-payment.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, PaymentConfig, Transaction, User]),
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    UsersModule,
  ],
  controllers: [PaymentsController, WebhooksController, PaymentMethodController, PaymentConfigController, StripeConfigController],
  providers: [StripeService, PaymentWebhookService, NotificationService, PaymentMethodService, PaymentConfigService, PaymentRetryService, EarlyPaymentService],
  exports: [StripeService, PaymentWebhookService, NotificationService, PaymentMethodService, PaymentConfigService, PaymentRetryService, EarlyPaymentService],
})
export class PaymentsModule {}
