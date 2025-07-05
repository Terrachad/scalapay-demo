import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Merchant])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  private readonly logger = new Logger(UsersModule.name);

  onModuleInit() {
    this.logger.log('👥 ═══════════════════════════════════════════════════════');
    this.logger.log('👥 🚀 UsersModule Initialization Started');
    this.logger.log('👥 🗄️ Database entities: User, Transaction, Merchant');
    this.logger.log('👥 🛡️ Controllers: UsersController');
    this.logger.log('👥 ⚙️ Providers: UsersService');
    this.logger.log('👥 📤 Exports: UsersService');
    this.logger.log('👥 ✅ UsersModule Initialization Complete');
    this.logger.log('👥 ═══════════════════════════════════════════════════════');
  }
}
