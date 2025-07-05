import { Module, Global, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule implements OnModuleInit {
  private readonly logger = new Logger(RedisModule.name);

  onModuleInit() {
    this.logger.log('🔴 ═══════════════════════════════════════════════════════');
    this.logger.log('🔴 🚀 RedisModule Initialization Started');
    this.logger.log('🔴 🌍 Global module: Available across entire application');
    this.logger.log('🔴 ⚙️ Providers: RedisService');
    this.logger.log('🔴 📤 Exports: RedisService');
    this.logger.log('🔴 ✅ RedisModule Initialization Complete');
    this.logger.log('🔴 ═══════════════════════════════════════════════════════');
  }
}
