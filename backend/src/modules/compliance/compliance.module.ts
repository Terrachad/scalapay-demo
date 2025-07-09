import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GDPRConsent } from './entities/gdpr-consent.entity';
import { GDPRController } from './controllers/gdpr.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GDPRConsent, User])],
  controllers: [GDPRController],
  providers: [],
  exports: [],
})
export class ComplianceModule {}
