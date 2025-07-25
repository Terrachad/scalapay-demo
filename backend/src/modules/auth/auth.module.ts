import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EnterpriseJwtStrategy } from './strategies/enterprise-jwt.strategy';
import { EnterpriseAuthService } from './services/enterprise-auth.service';
import { EnterpriseAuthGuard } from './guards/enterprise-auth.guard';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { UserMFASettings } from './entities/user-mfa-settings.entity';
import { MFAController } from './controllers/mfa.controller';
import { MFAService } from './services/mfa.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMFASettings, User]),
    UsersModule,
    RedisModule,
    PassportModule.register({ defaultStrategy: 'enterprise-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          // Don't set expiresIn here since we set exp manually in enterprise auth
          issuer: 'scalapay-enterprise',
          audience: 'scalapay-users',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, MFAController],
  providers: [
    // Legacy auth service (for backward compatibility)
    AuthService,
    JwtStrategy,

    // Enterprise auth services
    EnterpriseAuthService,
    EnterpriseJwtStrategy,
    EnterpriseAuthGuard,

    // MFA services
    MFAService,
  ],
  exports: [AuthService, EnterpriseAuthService, EnterpriseAuthGuard, MFAService, JwtModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit() {
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
    this.logger.log('🔐 🚀 AuthModule Initialization Started');
    this.logger.log('🔐 📦 Imported modules: UsersModule, RedisModule, PassportModule, JwtModule');
    this.logger.log('🔐 🎯 Default strategy: enterprise-jwt');
    this.logger.log('🔐 🛡️ Controllers: AuthController');
    this.logger.log(
      '🔐 ⚙️ Providers: AuthService, JwtStrategy, EnterpriseAuthService, EnterpriseJwtStrategy, EnterpriseAuthGuard',
    );
    this.logger.log(
      '🔐 📤 Exports: AuthService, EnterpriseAuthService, EnterpriseAuthGuard, JwtModule',
    );
    this.logger.log('🔐 ✅ AuthModule Initialization Complete');
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
  }
}
