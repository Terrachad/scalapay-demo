import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentConfig } from '../payments/entities/payment-config.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionRepository } from './repositories/transaction.repository';
import { BusinessRulesService } from './services/business-rules.service';
import { PaymentSchedulerService } from './services/payment-scheduler.service';
import { TransactionStateMachineService } from './services/transaction-state-machine.service';
import { PaymentOrderingFixService } from './services/payment-ordering-fix.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User, Merchant, Payment, PaymentConfig]),
    ConfigModule,
    ScheduleModule.forRoot(),
    HttpModule,
    WebSocketModule,
    PaymentsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionRepository,
    BusinessRulesService,
    PaymentSchedulerService,
    TransactionStateMachineService,
    PaymentOrderingFixService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
