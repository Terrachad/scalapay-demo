import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentConfig } from './entities/payment-config.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { MerchantSettings } from '../merchants/entities/merchant-settings.entity';
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
import { EnterprisePaymentSchedulerService } from './services/enterprise-payment-scheduler.service';
import { UnifiedPaymentSortingService } from './services/unified-payment-sorting.service';
import { AutomatedPaymentProcessorService } from './services/automated-payment-processor.service';
import { CreditCheckService } from '../integrations/services/credit-check.service';
import { FraudDetectionService } from '../integrations/services/fraud-detection.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, PaymentConfig, Transaction, User, MerchantSettings]),
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    HttpModule,
    UsersModule,
  ],
  controllers: [
    PaymentsController,
    WebhooksController,
    PaymentMethodController,
    PaymentConfigController,
    StripeConfigController,
  ],
  providers: [
    StripeService,
    PaymentWebhookService,
    NotificationService,
    PaymentMethodService,
    PaymentConfigService,
    PaymentRetryService,
    EarlyPaymentService,
    EnterprisePaymentSchedulerService,
    UnifiedPaymentSortingService,
    AutomatedPaymentProcessorService,
    CreditCheckService,
    FraudDetectionService,
  ],
  exports: [
    StripeService,
    PaymentWebhookService,
    NotificationService,
    PaymentMethodService,
    PaymentConfigService,
    PaymentRetryService,
    EarlyPaymentService,
    EnterprisePaymentSchedulerService,
    UnifiedPaymentSortingService,
    AutomatedPaymentProcessorService,
    CreditCheckService,
    FraudDetectionService,
  ],
})
export class PaymentsModule {}
