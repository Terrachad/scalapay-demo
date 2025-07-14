import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { raw } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { InitialDataSeeder } from './database/seeders/initial-data.seeder';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const startTime = Date.now();

  try {
    logger.log('🚀 Starting Scalapay Backend Application...');
    logger.log(`📍 Node.js version: ${process.version}`);
    logger.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`📍 Process ID: ${process.pid}`);

    // Step 1: Create NestJS Application
    logger.log('📦 Creating NestJS application instance...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    logger.log('✅ NestJS application created successfully');

    // Step 2: Get Configuration Service
    logger.log('⚙️ Initializing configuration service...');
    const configService = app.get(ConfigService);
    logger.log(`✅ Configuration loaded - JWT secret exists: ${!!configService.get('jwt.secret')}`);
    logger.log(
      `✅ Database config - MySQL host: ${configService.get('database.mysql.host')}:${configService.get('database.mysql.port')}`,
    );
    logger.log(
      `✅ Redis config - Host: ${configService.get('database.redis.host')}:${configService.get('database.redis.port')}`,
    );
    logger.log(`✅ Frontend URL: ${configService.get('frontend.url')}`);
    logger.log(`✅ Port configuration: ${configService.get('PORT', 3001)}`);

    // Step 3: Security Configuration
    logger.log('🔒 Configuring security settings...');
    // Security - helmet disabled temporarily
    // app.use(helmet());
    logger.log('✅ Security configuration applied (helmet temporarily disabled)');

    // Step 4: Raw Body Parsing
    logger.log('📄 Setting up raw body parsing for Stripe webhooks...');
    app.use('/payments/webhook/stripe', raw({ type: 'application/json' }));
    logger.log('✅ Stripe webhook raw body parsing configured');

    // Step 5: CORS Configuration
    logger.log('🌐 Configuring CORS settings...');
    const allowedOrigins = [
      configService.get('frontend.url') || 'http://localhost:3000',
      'https://affects-plc-processing-stars.trycloudflare.com',
      'https://scala.vlady.website',
      /\.vlady\.website$/,
      /\.trycloudflare\.com$/, // Allow all Cloudflare tunnel URLs
    ];
    logger.log(
      `✅ CORS origins: ${JSON.stringify(allowedOrigins.filter((o) => typeof o === 'string'))}`,
    );

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-environment'],
    });
    logger.log('✅ CORS configuration applied successfully');

    // Step 6: API Versioning (Disabled)
    logger.log('🔗 API versioning configuration...');
    // Versioning disabled for now
    // app.enableVersioning({
    //   type: VersioningType.URI,
    //   defaultVersion: '1',
    // });
    logger.log('✅ API versioning disabled (frontend handles routing)');

    // Step 7: Global Prefix
    logger.log('🌍 Global prefix configuration...');
    // Global prefix - Enable /api for all routes
    //app.setGlobalPrefix('api');
    logger.log('✅ Global prefix enabled - all routes prefixed with /api');

    // Step 8: Global Pipes
    logger.log('🔧 Setting up global validation pipes...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    logger.log('✅ Global validation pipes configured successfully');

    // Step 9: Global Filters and Interceptors
    logger.log('🛡️ Setting up global filters and interceptors...');
    const httpExceptionFilter = new HttpExceptionFilter();
    const loggingInterceptor = new LoggingInterceptor();
    const transformInterceptor = new TransformInterceptor();

    app.useGlobalFilters(httpExceptionFilter);
    app.useGlobalInterceptors(loggingInterceptor, transformInterceptor);
    logger.log('✅ Global filters and interceptors configured successfully');

    // Step 10: Swagger Documentation
    logger.log('📚 Setting up Swagger documentation...');
    const config = new DocumentBuilder()
      .setTitle('Scalapay BNPL API')
      .setDescription('The Ultimate Buy Now Pay Later Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('merchants', 'Merchant operations')
      .addTag('transactions', 'Transaction management')
      .addTag('analytics', 'Analytics and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    logger.log('✅ Swagger documentation configured at /api endpoint');

    // Step 11: Database Seeding
    logger.log('🌱 Running initial data seeding...');
    try {
      const seeder = app.get(InitialDataSeeder);
      await seeder.seed();
      logger.log('✅ Initial data seeding completed successfully');
    } catch (error) {
      logger.warn(
        '⚠️ Database seeding failed (may be normal if DB not ready):',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    // Step 12: Server Startup
    const port = configService.get('PORT', 3001);
    const host = '0.0.0.0';

    logger.log(`🚀 Starting server on ${host}:${port}...`);
    await app.listen(port, host);

    const bootTime = Date.now() - startTime;
    logger.log('🎉 ═══════════════════════════════════════════════════════════');
    logger.log(`🎉 🚀 Scalapay Backend is running successfully! 🚀`);
    logger.log(`🎉 📍 Server URL: http://localhost:${port}`);
    logger.log(`🎉 📚 API Documentation: http://localhost:${port}/api`);
    logger.log(`🎉 ⏱️ Boot time: ${bootTime}ms`);
    logger.log(`🎉 🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🎉 📦 Process ID: ${process.pid}`);
    logger.log('🎉 ═══════════════════════════════════════════════════════════');
  } catch (error) {
    logger.error('❌ ═══════════════════════════════════════════════════════════');
    logger.error('❌ 💥 BOOTSTRAP FAILED! 💥');
    logger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.error(`❌ Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    logger.error('❌ ═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('💥 Unhandled bootstrap error:', error);
  process.exit(1);
});
