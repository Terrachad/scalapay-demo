import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { EarlyPaymentConfig } from './entities/early-payment-config.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { MerchantSettings } from '../merchants/entities/merchant-settings.entity';
import { PlatformSetting } from '../platform-settings/entities/platform-setting.entity';
import { PlatformSettingHistory } from '../platform-settings/entities/platform-setting-history.entity';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { StripeConfigController } from './controllers/stripe-config.controller';
import { EarlyPaymentController } from './controllers/early-payment.controller';
import { StripeService } from './services/stripe.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentRetryService } from './services/payment-retry.service';
import { EarlyPaymentService } from './services/early-payment.service';
import { EnterprisePaymentSchedulerService } from './services/enterprise-payment-scheduler.service';
import { UnifiedPaymentSortingService } from './services/unified-payment-sorting.service';
import { AutomatedPaymentProcessorService } from './services/automated-payment-processor.service';
import { CardAutoUpdateService } from './services/card-auto-update.service';
import { PaymentBusinessLogicService } from './services/payment-business-logic.service';
import { CreditCheckService } from '../integrations/services/credit-check.service';
import { FraudDetectionService } from '../integrations/services/fraud-detection.service';
import { PaymentGatewayConfigModule } from './payment-gateway-config.module';
import { UsersModule } from '../users/users.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentMethod,
      EarlyPaymentConfig,
      Transaction,
      User,
      MerchantSettings,
      PlatformSetting,
      PlatformSettingHistory,
    ]),
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    HttpModule,
    PaymentGatewayConfigModule,
    UsersModule,
    PlatformSettingsModule,
  ],
  controllers: [
    PaymentsController,
    WebhooksController,
    PaymentMethodController,
    StripeConfigController,
    EarlyPaymentController,
  ],
  providers: [
    StripeService,
    PaymentWebhookService,
    PaymentMethodService,
    PaymentRetryService,
    EarlyPaymentService,
    EnterprisePaymentSchedulerService,
    UnifiedPaymentSortingService,
    AutomatedPaymentProcessorService,
    CardAutoUpdateService,
    PaymentBusinessLogicService,
    CreditCheckService,
    FraudDetectionService,
  ],
  exports: [
    StripeService,
    PaymentWebhookService,
    PaymentMethodService,
    PaymentRetryService,
    EarlyPaymentService,
    EnterprisePaymentSchedulerService,
    UnifiedPaymentSortingService,
    AutomatedPaymentProcessorService,
    CardAutoUpdateService,
    PaymentBusinessLogicService,
    CreditCheckService,
    FraudDetectionService,
  ],
})
export class PaymentsModule {}
