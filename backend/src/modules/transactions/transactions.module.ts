import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { EnterprisePaymentSchedulerService } from '../payments/services/enterprise-payment-scheduler.service';
import { UnifiedPaymentSortingService } from '../payments/services/unified-payment-sorting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User, Merchant, Payment, PaymentConfig]),
    WebSocketModule,
    PaymentsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionRepository,
    BusinessRulesService,
    PaymentSchedulerService,
    EnterprisePaymentSchedulerService,
    UnifiedPaymentSortingService,
    TransactionStateMachineService,
    PaymentOrderingFixService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
