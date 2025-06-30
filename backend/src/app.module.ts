import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { RedisModule } from './modules/redis/redis.module';
import { DynamoDBModule } from './modules/dynamodb/dynamodb.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.mysql.host'),
        port: configService.get('database.mysql.port'),
        username: configService.get('database.mysql.username'),
        password: configService.get('database.mysql.password'),
        database: configService.get('database.mysql.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 900000, // 15 minutes
        limit: 5, // 5 login attempts per 15 minutes
      },
      {
        name: 'transactions',
        ttl: 60000, // 1 minute
        limit: 10, // 10 transaction creations per minute
      },
    ]),
    CqrsModule.forRoot(),
    RedisModule,
    DynamoDBModule,
    AuthModule,
    UsersModule,
    MerchantsModule,
    TransactionsModule,
    PaymentsModule,
    AnalyticsModule,
    WebSocketModule,
  ],
})
export class AppModule {}
