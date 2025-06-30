import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 100,
        }]),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body.user.name).toBe(registerDto.name);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should reject registration with invalid email', () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        name: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration with weak password', () => {
      const registerDto = {
        email: 'test2@example.com',
        password: '123',
        name: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Register a user for login tests
      const registerDto = {
        email: 'login-test@example.com',
        password: 'TestPassword123!',
        name: 'Login Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);
    });

    it('should login with valid credentials', () => {
      const loginDto = {
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(loginDto.email);
        });
    });

    it('should reject login with invalid credentials', () => {
      const loginDto = {
        email: 'login-test@example.com',
        password: 'WrongPassword',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should reject login with non-existent user', () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('JWT Authentication', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and login to get access token
      const registerDto = {
        email: 'jwt-test@example.com',
        password: 'TestPassword123!',
        name: 'JWT Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      accessToken = response.body.accessToken;
    });

    it('should accept valid JWT token', () => {
      return request(app.getHttpServer())
        .get('/transactions') // Protected endpoint
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          expect(res.status).not.toBe(401);
        });
    });

    it('should reject invalid JWT token', () => {
      return request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request without JWT token', () => {
      return request(app.getHttpServer())
        .get('/transactions')
        .expect(401);
    });
  });
});