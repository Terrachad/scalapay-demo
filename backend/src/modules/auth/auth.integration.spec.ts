import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import configuration from '../../config/configuration';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  const testEmails: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT || '3306', 10),
          username: process.env.MYSQL_USERNAME || 'scalapay_user',
          password: process.env.MYSQL_PASSWORD || 'scalapay_pass',
          database: process.env.MYSQL_DATABASE || 'scalapay_db', // Use same database as main app
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false, // Don't modify existing schema
          logging: false,
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 1000, // Higher limit for testing
          },
        ]),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  }, 30000); // 30 second timeout for database setup

  afterAll(async () => {
    // Clean up test users
    if (userRepository && testEmails.length > 0) {
      try {
        await userRepository
          .createQueryBuilder()
          .delete()
          .from(User)
          .where('email IN (:...emails)', { emails: testEmails })
          .execute();
      } catch (error) {
        console.warn(
          'Failed to clean up test users:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (app) {
      await app.close();
    }
  });

  // Helper function to track test emails for cleanup
  const trackTestEmail = (email: string) => {
    if (!testEmails.includes(email)) {
      testEmails.push(email);
    }
  };

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      const registerDto = {
        email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
        role: UserRole.CUSTOMER,
      };
      trackTestEmail(registerDto.email);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect((res: any) => {
          if (res.status !== 201) {
            console.log('Registration failed:', res.status, res.body);
          }
          expect(res.status).toBe(201);
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
        role: UserRole.CUSTOMER,
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should reject registration with weak password', () => {
      const registerDto = {
        email: `test-weak-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        password: '123',
        name: 'Test User',
        role: UserRole.CUSTOMER,
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should reject duplicate email registration', async () => {
      const registerDto = {
        email: `duplicate-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
        role: UserRole.CUSTOMER,
      };
      trackTestEmail(registerDto.email);

      // First registration should succeed
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      // Second registration with same email should fail
      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(409); // Conflict
    });
  });

  describe('/auth/login (POST)', () => {
    let loginTestEmail: string;

    beforeEach(async () => {
      // Register a user for login tests
      loginTestEmail = `login-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const registerDto = {
        email: loginTestEmail,
        password: 'TestPassword123!',
        name: 'Login Test User',
        role: UserRole.CUSTOMER,
      };
      trackTestEmail(loginTestEmail);

      await request(app.getHttpServer()).post('/auth/register').send(registerDto);
    });

    it('should login with valid credentials', () => {
      const loginDto = {
        email: loginTestEmail,
        password: 'TestPassword123!',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(loginDto.email);
        });
    });

    it('should reject login with invalid credentials', () => {
      const loginDto = {
        email: loginTestEmail,
        password: 'WrongPassword',
      };

      return request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(401);
    });

    it('should reject login with non-existent user', () => {
      const loginDto = {
        email: `nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        password: 'TestPassword123!',
      };

      return request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(401);
    });
  });

  describe('JWT Authentication', () => {
    let accessToken: string;
    let jwtTestEmail: string;

    beforeEach(async () => {
      // Register and login to get access token
      jwtTestEmail = `jwt-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const registerDto = {
        email: jwtTestEmail,
        password: 'TestPassword123!',
        name: 'JWT Test User',
        role: UserRole.CUSTOMER,
      };
      trackTestEmail(jwtTestEmail);

      const response = await request(app.getHttpServer()).post('/auth/register').send(registerDto);

      accessToken = response.body.accessToken;
    });

    it('should generate valid JWT token on registration', () => {
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(0);
    });

    it('should generate valid JWT token on login', async () => {
      const loginDto = {
        email: jwtTestEmail,
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
    });
  });
});
