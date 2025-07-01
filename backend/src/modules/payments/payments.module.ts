import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { StripeService } from './services/stripe.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { NotificationService } from './services/notification.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction, User]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [StripeService, PaymentWebhookService, NotificationService],
  exports: [StripeService, PaymentWebhookService],
})
export class PaymentsModule {}
