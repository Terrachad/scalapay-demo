import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EnterpriseJwtStrategy } from './strategies/enterprise-jwt.strategy';
import { EnterpriseAuthService } from './services/enterprise-auth.service';
import { EnterpriseAuthGuard } from './guards/enterprise-auth.guard';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
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
  controllers: [AuthController],
  providers: [
    // Legacy auth service (for backward compatibility)
    AuthService,
    JwtStrategy,
    
    // Enterprise auth services
    EnterpriseAuthService,
    EnterpriseJwtStrategy,
    EnterpriseAuthGuard,
  ],
  exports: [
    AuthService,
    EnterpriseAuthService,
    EnterpriseAuthGuard,
    JwtModule,
  ],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit() {
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
    this.logger.log('🔐 🚀 AuthModule Initialization Started');
    this.logger.log('🔐 📦 Imported modules: UsersModule, RedisModule, PassportModule, JwtModule');
    this.logger.log('🔐 🎯 Default strategy: enterprise-jwt');
    this.logger.log('🔐 🛡️ Controllers: AuthController');
    this.logger.log('🔐 ⚙️ Providers: AuthService, JwtStrategy, EnterpriseAuthService, EnterpriseJwtStrategy, EnterpriseAuthGuard');
    this.logger.log('🔐 📤 Exports: AuthService, EnterpriseAuthService, EnterpriseAuthGuard, JwtModule');
    this.logger.log('🔐 ✅ AuthModule Initialization Complete');
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
  }
}
