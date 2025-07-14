import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentGatewayConfig } from './entities/payment-gateway-config.entity';
import { PlatformSetting } from '../platform-settings/entities/platform-setting.entity';
import { PlatformSettingHistory } from '../platform-settings/entities/platform-setting-history.entity';
import { MerchantSettings } from '../merchants/entities/merchant-settings.entity';
import { PaymentGatewayConfigService } from './services/payment-gateway-config.service';
import { PaymentBusinessLogicService } from './services/payment-business-logic.service';
import { PaymentGatewayConfigController } from './controllers/payment-gateway-config.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentGatewayConfig,
      PlatformSetting,
      PlatformSettingHistory,
      MerchantSettings,
    ]),
    PlatformSettingsModule,
  ],
  providers: [PaymentGatewayConfigService, PaymentBusinessLogicService],
  controllers: [PaymentGatewayConfigController],
  exports: [PaymentGatewayConfigService, PaymentBusinessLogicService],
})
export class PaymentGatewayConfigModule {}
