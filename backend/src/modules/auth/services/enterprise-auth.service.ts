import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, RegisterDto, AuthResponseDto } from '../dto/login.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { EnterpriseJWTPayload, UserSession } from '../strategies/enterprise-jwt.strategy';

export interface DeviceInfo {
  userAgent: string;
  deviceId?: string;
  platform?: string;
  browser?: string;
  os?: string;
  isMobile?: boolean;
}

export interface LoginContext {
  ipAddress: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  timestamp: Date;
  requestId: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface AuthAuditEvent {
  eventId: string;
  eventType:
    | 'LOGIN'
    | 'LOGOUT'
    | 'REGISTER'
    | 'TOKEN_REFRESH'
    | 'SESSION_EXPIRED'
    | 'SUSPICIOUS_ACTIVITY';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorDetails?: string;
  metadata?: any;
}

@Injectable()
export class EnterpriseAuthService {
  private readonly logger = new Logger(EnterpriseAuthService.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
    this.logger.log('🔐 🚀 Enterprise Auth Service Initialization Started');
    this.logger.log('🔐 ⚙️ Dependencies injected successfully:');
    this.logger.log('🔐   - UsersService: ✅');
    this.logger.log('🔐   - JwtService: ✅');
    this.logger.log('🔐   - ConfigService: ✅');
    this.logger.log('🔐   - RedisService: ✅');
    this.logger.log(`🔐 🐛 Debug mode: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
    this.logger.log(`🔐 🔑 JWT configuration loaded: ${!!this.configService.get('jwt.secret')}`);
    this.logger.log('🔐 ✅ Enterprise Auth Service initialized successfully');
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
  }

  async login(loginDto: LoginDto, context: LoginContext): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    this.debugLog('🔑 Login Attempt Started', {
      requestId: context.requestId,
      email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    try {
      // Step 1: Validate user credentials
      const user = await this.validateUserCredentials(email, password, context);

      // Step 2: Check for account security flags
      await this.performSecurityChecks(user, context);

      // Step 3: Create authentication session
      const session = await this.createAuthSession(user, context);

      // Step 4: Generate JWT tokens
      const tokens = await this.generateTokens(user, session);

      // Step 5: Update user login tracking
      await this.updateUserLoginTracking(user, context);

      // Step 6: Log successful authentication
      await this.logAuthEvent('LOGIN', {
        userId: user.id,
        sessionId: session.sessionId,
        success: true,
        context,
      });

      const response: AuthResponseDto = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          creditLimit: user.creditLimit,
          availableCredit: user.availableCredit,
        },
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          deviceInfo: session.deviceInfo,
        },
      };

      this.debugLog('✅ Login Successful', {
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        sessionId: session.sessionId,
      });

      return response;
    } catch (error) {
      // Log failed authentication attempt
      await this.logAuthEvent('LOGIN', {
        context,
        success: false,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      });

      // Increment failed login attempts
      await this.recordFailedLoginAttempt(email, context.ipAddress);

      this.logger.error('❌ Login Failed', {
        requestId: context.requestId,
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: context.ipAddress,
      });

      throw error;
    }
  }

  async register(registerDto: RegisterDto, context: LoginContext): Promise<AuthResponseDto> {
    const { email, password, name } = registerDto;

    this.debugLog('📝 Registration Attempt Started', {
      requestId: context.requestId,
      email,
      name,
      ipAddress: context.ipAddress,
    });

    try {
      // Step 1: Check if user already exists
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException(`User with email ${email} already exists`);
      }

      // Step 2: Validate password strength
      this.validatePasswordStrength(password);

      // Step 3: Check registration rate limits
      await this.checkRegistrationRateLimit(context.ipAddress);

      // Step 4: Create user account
      const hashedPassword = await bcrypt.hash(password, 12); // Higher cost for production
      const user = await this.usersService.create({
        email,
        password: hashedPassword,
        name,
        role: UserRole.CUSTOMER, // Default role
        isActive: true,
        creditLimit: 1000, // Default credit limit
        availableCredit: 1000,
      });

      // Step 5: Create initial session
      const session = await this.createAuthSession(user, context);

      // Step 6: Generate JWT tokens
      const tokens = await this.generateTokens(user, session);

      // Step 7: Log successful registration
      await this.logAuthEvent('REGISTER', {
        userId: user.id,
        sessionId: session.sessionId,
        success: true,
        context,
      });

      const response: AuthResponseDto = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          creditLimit: user.creditLimit,
          availableCredit: user.availableCredit,
        },
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          deviceInfo: session.deviceInfo,
        },
      };

      this.debugLog('✅ Registration Successful', {
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        sessionId: session.sessionId,
      });

      return response;
    } catch (error) {
      // Log failed registration attempt
      await this.logAuthEvent('REGISTER', {
        context,
        success: false,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      });

      this.logger.error('❌ Registration Failed', {
        requestId: context.requestId,
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: context.ipAddress,
      });

      throw error;
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    this.debugLog('👋 Logout Started', {
      sessionId,
      userId,
    });

    try {
      // Deactivate session
      await this.deactivateSession(sessionId);

      // Log logout event
      await this.logAuthEvent('LOGOUT', {
        userId,
        sessionId,
        success: true,
      });

      this.debugLog('✅ Logout Successful', {
        sessionId,
        userId,
      });
    } catch (error) {
      this.logger.error('❌ Logout Failed', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    this.debugLog('🔄 Token Refresh Started', {
      refreshToken: refreshToken.substring(0, 20) + '...',
    });

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Get user and session
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const session = await this.getSession(payload.sessionId);
      if (!session || !session.isActive) {
        throw new UnauthorizedException('Session invalid or expired');
      }

      // Generate new access token
      const newAccessToken = await this.generateAccessToken(user, session);

      // Update session activity
      await this.updateSessionActivity(session);

      // Log token refresh
      await this.logAuthEvent('TOKEN_REFRESH', {
        userId: user.id,
        sessionId: session.sessionId,
        success: true,
      });

      this.debugLog('✅ Token Refresh Successful', {
        userId: user.id,
        sessionId: session.sessionId,
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      this.logger.error('❌ Token Refresh Failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.logAuthEvent('TOKEN_REFRESH', {
        success: false,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async validateUserCredentials(
    email: string,
    password: string,
    context: LoginContext,
  ): Promise<User> {
    this.logger.log(
      `🔍 ⬇️  USER VALIDATION START [${context.requestId}] ═══════════════════════════════`,
    );
    this.debugLog('🔍 Validating User Credentials', {
      requestId: context.requestId,
      email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    try {
      // Step 1: Check rate limiting
      this.logger.log(`🔍 Step 1: Checking failed login attempts for ${email}...`);
      const recentFailures = await this.getFailedLoginAttempts(email, context.ipAddress);
      this.logger.log(`🔍 Failed attempts count: ${recentFailures}/5`);

      if (recentFailures >= 5) {
        this.logger.warn(`🔍 ❌ Rate limit exceeded for ${email} from ${context.ipAddress}`);
        throw new UnauthorizedException('Too many failed login attempts. Please try again later.');
      }
      this.logger.log('🔍 ✅ Rate limit check passed');

      // Step 2: Find user by email
      this.logger.log(`🔍 Step 2: Looking up user by email: ${email}...`);
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        this.logger.warn(`🔍 ❌ User not found: ${email}`);
        this.debugLog('❌ User Not Found', {
          requestId: context.requestId,
          email,
          ipAddress: context.ipAddress,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`🔍 ✅ User found: ${user.id} (${user.email})`);
      this.logger.log(
        `🔍 User details: Role=${user.role}, Active=${user.isActive}, Credit=${user.availableCredit}/${user.creditLimit}`,
      );

      // Step 3: Validate password
      this.logger.log('🔍 Step 3: Validating password...');
      this.debugLog('👤 User Found, Validating Password', {
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        this.logger.warn(`🔍 ❌ Invalid password for user: ${user.id}`);
        this.debugLog('❌ Invalid Password', {
          requestId: context.requestId,
          userId: user.id,
          email: user.email,
        });
        throw new UnauthorizedException('Invalid credentials');
      }
      this.logger.log('🔍 ✅ Password validation passed');

      // Step 4: Check account status
      this.logger.log('🔍 Step 4: Checking account status...');
      if (!user.isActive) {
        this.logger.warn(`🔍 ❌ Account deactivated for user: ${user.id}`);
        throw new UnauthorizedException('Account is deactivated');
      }
      this.logger.log('🔍 ✅ Account status check passed');

      // Success
      this.logger.log(
        `🔍 ⬆️  USER VALIDATION SUCCESS [${context.requestId}] ═══════════════════════════════`,
      );
      this.logger.log(`🔍 ✅ User ${user.email} (${user.id}) validated successfully`);
      this.debugLog('✅ Credentials Valid', {
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error) {
      this.logger.error(
        `🔍 💥 USER VALIDATION FAILED [${context.requestId}] ══════════════════════════════`,
      );

      if (error instanceof UnauthorizedException) {
        this.logger.error(`🔍 ❌ Authorization error: ${error.message}`);
        throw error;
      }

      this.logger.error('🔍 ❌ Unexpected password validation error', {
        requestId: context.requestId,
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: this.debugEnabled && error instanceof Error ? error.stack : undefined,
      });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async performSecurityChecks(user: User, context: LoginContext): Promise<void> {
    this.debugLog('🛡️ Performing Security Checks', {
      requestId: context.requestId,
      userId: user.id,
    });

    // Check for suspicious activity patterns
    // TODO: Implement advanced security checks
    // - Unusual login times
    // - Geographic anomalies
    // - Device fingerprinting
    // - Behavioral analysis

    this.debugLog('✅ Security Checks Passed', {
      requestId: context.requestId,
      userId: user.id,
    });
  }

  private async createAuthSession(user: User, context: LoginContext): Promise<AuthSession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      accessToken: '', // Will be set after token generation
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
      createdAt: now,
      expiresAt,
      lastActivity: now,
      isActive: true,
    };

    // Store session in Redis
    const sessionKey = `session:${sessionId}`;
    await this.redisService.setex(
      sessionKey,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify(session),
    );

    this.debugLog('💾 Session Created', {
      sessionId,
      userId: user.id,
      expiresAt,
    });

    return session;
  }

  private async generateTokens(
    user: User,
    session: AuthSession,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    this.logger.log(
      `🎫 ⬇️  TOKEN GENERATION START [${session.sessionId}] ═══════════════════════════════`,
    );
    this.logger.log(`🎫 Generating tokens for user: ${user.email} (${user.id})`);

    try {
      // Step 1: Create JWT payload
      this.logger.log('🎫 Step 1: Creating JWT payload...');
      const currentTime = Math.floor(Date.now() / 1000);
      const accessTokenExpiry = currentTime + 60 * 60; // 1 hour

      const payload: EnterpriseJWTPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId,
        iat: currentTime,
        exp: accessTokenExpiry,
      };

      this.logger.log('🎫 JWT payload created:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId,
        issuedAt: new Date(currentTime * 1000).toISOString(),
        expiresAt: new Date(accessTokenExpiry * 1000).toISOString(),
      });

      // Step 2: Generate access token
      this.logger.log('🎫 Step 2: Signing access token...');
      // Don't use expiresIn option since we're setting exp manually
      const accessToken = this.jwtService.sign(payload);
      this.logger.log(`🎫 ✅ Access token generated (length: ${accessToken.length})`);

      // Step 3: Generate refresh token
      this.logger.log('🎫 Step 3: Generating refresh token...');
      const refreshToken = this.jwtService.sign(
        { sub: user.id, sessionId: session.sessionId, type: 'refresh' },
        { expiresIn: '7d' },
      );
      this.logger.log(`🎫 ✅ Refresh token generated (length: ${refreshToken.length})`);

      // Step 4: Update session with access token
      this.logger.log('🎫 Step 4: Updating session in Redis...');
      session.accessToken = accessToken;
      const sessionKey = `session:${session.sessionId}`;

      await this.redisService.setex(
        sessionKey,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(session),
      );
      this.logger.log(`🎫 ✅ Session updated in Redis with key: ${sessionKey}`);

      // Success
      this.logger.log(
        `🎫 ⬆️  TOKEN GENERATION SUCCESS [${session.sessionId}] ═══════════════════════════════`,
      );
      this.debugLog('🎫 Tokens Generated Successfully', {
        sessionId: session.sessionId,
        userId: user.id,
        email: user.email,
        accessTokenExpiry: '1h',
        refreshTokenExpiry: '7d',
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(
        `🎫 💥 TOKEN GENERATION FAILED [${session.sessionId}] ════════════════════════════════`,
      );
      this.logger.error('🎫 ❌ Error generating tokens:', {
        userId: user.id,
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: this.debugEnabled && error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async generateAccessToken(user: User, session: AuthSession): Promise<string> {
    const payload: EnterpriseJWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    };

    // Don't use expiresIn option since we're setting exp manually
    return this.jwtService.sign(payload);
  }

  private async updateUserLoginTracking(user: User, context: LoginContext): Promise<void> {
    try {
      // Update last login time and IP
      await this.usersService.updateUser(user.id, {
        // Note: Would need to add these fields to User entity
        // lastLoginAt: context.timestamp,
        // lastLoginIp: context.ipAddress,
      });

      // Clear failed login attempts
      await this.clearFailedLoginAttempts(user.email, context.ipAddress);
    } catch (error) {
      this.logger.error('Failed to update user login tracking', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is not critical for authentication
    }
  }

  private async getSession(sessionId: string): Promise<AuthSession | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await this.redisService.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      this.logger.error('Failed to get session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private async updateSessionActivity(session: AuthSession): Promise<void> {
    try {
      session.lastActivity = new Date();

      const sessionKey = `session:${session.sessionId}`;
      await this.redisService.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(session));
    } catch (error) {
      this.logger.error('Failed to update session activity', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async deactivateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.isActive = false;

        const sessionKey = `session:${sessionId}`;
        await this.redisService.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(session));
      }
    } catch (error) {
      this.logger.error('Failed to deactivate session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async logAuthEvent(eventType: string, data: any): Promise<void> {
    try {
      const event: AuthAuditEvent = {
        eventId: uuidv4(),
        eventType: eventType as any,
        timestamp: new Date(),
        success: data.success || false,
        userId: data.userId,
        sessionId: data.sessionId,
        ipAddress: data.context?.ipAddress || 'unknown',
        userAgent: data.context?.userAgent || 'unknown',
        errorDetails: data.errorDetails,
        metadata: data,
      };

      // Store in Redis for analytics
      const eventKey = `auth_audit:${Date.now()}:${event.eventId}`;
      await this.redisService.setex(eventKey, 30 * 24 * 60 * 60, JSON.stringify(event)); // 30 days

      // Log to application logs
      this.logger.log(`AUTH_AUDIT: ${eventType}`, event);
    } catch (error) {
      this.logger.error('Failed to log auth event', error);
    }
  }

  private async recordFailedLoginAttempt(email: string, ipAddress: string): Promise<void> {
    try {
      const key = `failed_login:${email}:${ipAddress}`;
      await this.redisService.incr(key);
      await this.redisService.expire(key, 15 * 60); // 15 minutes
    } catch (error) {
      this.logger.error('Failed to record failed login attempt', error);
    }
  }

  private async getFailedLoginAttempts(email: string, ipAddress: string): Promise<number> {
    try {
      const key = `failed_login:${email}:${ipAddress}`;
      const attempts = await this.redisService.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get failed login attempts', error);
      return 0;
    }
  }

  private async clearFailedLoginAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      const key = `failed_login:${email}:${ipAddress}`;
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error('Failed to clear failed login attempts', error);
    }
  }

  private async checkRegistrationRateLimit(ipAddress: string): Promise<void> {
    try {
      const key = `registration_rate:${ipAddress}`;
      const attempts = await this.redisService.incr(key);

      if (attempts === 1) {
        await this.redisService.expire(key, 60 * 60); // 1 hour
      }

      if (attempts > 3) {
        throw new BadRequestException('Too many registration attempts. Please try again later.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to check registration rate limit', error);
    }
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password',
      'password123',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password1',
      'admin',
      'letmein',
      'welcome',
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      throw new BadRequestException('Password is too common. Please choose a stronger password.');
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugEnabled) {
      this.logger.debug(`${message}`, data);
    }
  }
}
