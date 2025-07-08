import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PlatformSetting } from './entities/platform-setting.entity';
import { PlatformSettingHistory } from './entities/platform-setting-history.entity';
import { PlatformSettingSchema } from './entities/platform-setting-schema.entity';
import { PlatformSettingsService } from './services/platform-settings.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { SettingsCacheService } from './services/settings-cache.service';
import { SettingsAuditService } from './services/settings-audit.service';
import { SettingsEncryptionService } from './services/settings-encryption.service';
import { SettingsSeedService } from './services/settings-seed.service';
import { PlatformSettingsController } from './controllers/platform-settings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformSetting,
      PlatformSettingHistory,
      PlatformSettingSchema,
    ]),
    EventEmitterModule,
    ConfigModule,
    AuthModule,
  ],
  controllers: [PlatformSettingsController],
  providers: [
    PlatformSettingsService,
    SettingsValidationService,
    SettingsCacheService,
    SettingsAuditService,
    SettingsEncryptionService,
    SettingsSeedService,
  ],
  exports: [
    PlatformSettingsService,
    SettingsValidationService,
    SettingsCacheService,
    SettingsAuditService,
    SettingsEncryptionService,
    SettingsSeedService,
  ],
})
export class PlatformSettingsModule {}