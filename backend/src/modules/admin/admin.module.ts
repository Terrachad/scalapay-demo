import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [AuthModule, PlatformSettingsModule],
  controllers: [AdminController],
  providers: [RolesGuard],
  exports: [],
})
export class AdminModule {}
