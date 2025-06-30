import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentEventHandler } from './handlers/payment-event.handler';
import { TransactionEventHandler } from './handlers/transaction-event.handler';
import { UserEventHandler } from './handlers/user-event.handler';
import { NotificationService } from '../payments/services/notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for event matching
      wildcard: false,
      // Set this to `true` to use wildcards
      delimiter: '.',
      // Set this to `true` if you want to emit the newListener event
      newListener: false,
      // Set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners are assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    TypeOrmModule.forFeature([User, Transaction, Payment]),
  ],
  providers: [
    PaymentEventHandler,
    TransactionEventHandler,
    UserEventHandler,
    NotificationService,
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}