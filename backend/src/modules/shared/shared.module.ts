import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { NotificationService } from './services/notification.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class SharedModule {}
