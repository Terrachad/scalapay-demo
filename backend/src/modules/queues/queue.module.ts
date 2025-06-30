import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentProcessor } from './processors/payment.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { CreditCheckProcessor } from './processors/credit-check.processor';
import { FraudCheckProcessor } from './processors/fraud-check.processor';
import { QueueService } from './services/queue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { StripeService } from '../payments/services/stripe.service';
import { NotificationService } from '../payments/services/notification.service';
import { CreditCheckService } from '../integrations/services/credit-check.service';
import { FraudDetectionService } from '../integrations/services/fraud-detection.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB') || 0,
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'payment-processing' },
      { name: 'notifications' },
      { name: 'credit-checks' },
      { name: 'fraud-detection' },
    ),
    TypeOrmModule.forFeature([Payment, Transaction, User]),
  ],
  providers: [
    QueueService,
    PaymentProcessor,
    NotificationProcessor,
    CreditCheckProcessor,
    FraudCheckProcessor,
    StripeService,
    NotificationService,
    CreditCheckService,
    FraudDetectionService,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}