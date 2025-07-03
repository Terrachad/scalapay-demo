import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, raw } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security - helmet disabled temporarily
  // app.use(helmet());

  // Raw body parsing for Stripe webhooks only
  app.use('/payments/webhook/stripe', raw({ type: 'application/json' }));

  // CORS
  app.enableCors({
    origin: [
      configService.get('frontend.url') || 'http://localhost:3000',
      'https://affects-plc-processing-stars.trycloudflare.com',
      'https://scala.vlady.website',
      /\.vlady\.website$/,
      /\.trycloudflare\.com$/, // Allow all Cloudflare tunnel URLs
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Versioning disabled for now
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // Global prefix - Disabled because frontend rewrite handles /api routing
  // app.setGlobalPrefix('api');

  // Global pipes
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

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger documentation
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

  const port = configService.get('PORT', 3001);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Scalapay Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
