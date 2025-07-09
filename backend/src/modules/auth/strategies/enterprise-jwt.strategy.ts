import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface EnterpriseJWTPayload {
  sub: string; // User ID
  email: string; // User email
  role: string; // User role
  permissions?: string[]; // User permissions
  sessionId?: string; // Session identifier
  deviceId?: string; // Device fingerprint
  ipAddress?: string; // Request IP
  iat: number; // Issued at
  exp: number; // Expires at
}

export interface AuthContext {
  requestId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  path: string;
  method: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    deviceId?: string;
    platform?: string;
  };
  ipAddress: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  permissions: string[];
  securityFlags: {
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    failedAttempts: number;
  };
}

@Injectable()
export class EnterpriseJwtStrategy extends PassportStrategy(Strategy, 'enterprise-jwt') {
  private readonly logger = new Logger(EnterpriseJwtStrategy.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true, // Enable request context
    });

    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
    this.logger.log('🔐 🚀 Enterprise JWT Strategy Initialization Started');
    this.logger.log('🔐 ⚙️ Dependencies injected successfully:');
    this.logger.log('🔐   - ConfigService: ✅');
    this.logger.log('🔐   - UsersService: ✅');
    this.logger.log('🔐   - RedisService: ✅');
    this.logger.log(`🔐 🔑 JWT Secret configured: ${!!configService.get('jwt.secret')}`);
    this.logger.log('🔐 🎯 Token extraction: Authorization header (Bearer)');
    this.logger.log('🔐 ⏰ Expiration check: ENABLED');
    this.logger.log('🔐 📋 Request callback: ENABLED');
    this.logger.log(`🔐 🐛 Debug mode: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
    this.logger.log('🔐 ✅ Enterprise JWT Strategy initialized successfully');
    this.logger.log('🔐 ═══════════════════════════════════════════════════════');
  }

  async validate(request: Request, payload: EnterpriseJWTPayload): Promise<any> {
    const requestId = uuidv4();
    const authContext: AuthContext = {
      requestId,
      timestamp: new Date(),
      ipAddress: this.extractIpAddress(request),
      userAgent: request.get('User-Agent') || 'Unknown',
      path: request.path,
      method: request.method,
    };

    this.logger.log(
      `🔍 ⬇️  JWT VALIDATION START [${requestId}] ═══════════════════════════════════════`,
    );
    this.logger.log(`🔍 Request: ${authContext.method} ${authContext.path}`);
    this.logger.log(`🔍 IP: ${authContext.ipAddress}`);
    this.logger.log(`🔍 User-Agent: ${authContext.userAgent}`);
    this.logger.log('🔍 JWT Payload:');
    this.logger.log(`🔍   - User ID: ${payload.sub}`);
    this.logger.log(`🔍   - Email: ${payload.email}`);
    this.logger.log(`🔍   - Role: ${payload.role}`);
    this.logger.log(`🔍   - Session ID: ${payload.sessionId || 'None'}`);
    this.logger.log(`🔍   - Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
    this.logger.log(`🔍   - Expires At: ${new Date(payload.exp * 1000).toISOString()}`);

    this.debugLog('🔍 JWT Validation Started', {
      requestId,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      path: authContext.path,
      method: authContext.method,
      ipAddress: authContext.ipAddress,
      issuedAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
    });

    try {
      // Step 1: Validate JWT payload structure
      this.logger.log('🔍 Step 1: Validating JWT payload structure...');
      await this.validateJWTPayload(payload, authContext);
      this.logger.log('🔍 ✅ Step 1 complete: JWT payload structure valid');

      // Step 2: Resolve and validate user
      this.logger.log('🔍 Step 2: Resolving and validating user...');
      const user = await this.resolveAndValidateUser(payload, authContext);
      this.logger.log(`🔍 ✅ Step 2 complete: User resolved - ${user.email} (${user.id})`);

      // Step 3: Validate session if session management is enabled
      this.logger.log('🔍 Step 3: Validating session...');
      const session = await this.validateSession(payload, authContext);
      this.logger.log(
        `🔍 ✅ Step 3 complete: Session validation ${session ? 'passed' : 'skipped (no session)'}`,
      );

      // Step 4: Check security flags and rate limits
      this.logger.log('🔍 Step 4: Performing security checks...');
      await this.performSecurityChecks(user, authContext);
      this.logger.log('🔍 ✅ Step 4 complete: Security checks passed');

      // Step 5: Update session activity
      this.logger.log('🔍 Step 5: Updating session activity...');
      await this.updateSessionActivity(session, authContext);
      this.logger.log('🔍 ✅ Step 5 complete: Session activity updated');

      // Step 6: Prepare enhanced user context
      this.logger.log('🔍 Step 6: Preparing enhanced user context...');
      const enhancedUser = await this.prepareUserContext(user, session, authContext);
      this.logger.log(
        `🔍 ✅ Step 6 complete: Enhanced user context prepared (${enhancedUser.permissions?.length || 0} permissions)`,
      );

      // Success logging
      this.logger.log(
        `🔍 ⬆️  JWT VALIDATION SUCCESS [${requestId}] ═══════════════════════════════════════`,
      );
      this.logger.log(`🔍 ✅ User ${user.email} (${user.id}) authenticated successfully`);
      this.logger.log(`🔍 ✅ Session: ${session?.sessionId || 'None'}`);
      this.logger.log(`🔍 ✅ Permissions: ${enhancedUser.permissions?.length || 0}`);
      this.logger.log(
        `🔍 ✅ Security level: ${enhancedUser.securityFlags?.riskLevel || 'unknown'}`,
      );

      this.debugLog('✅ JWT Validation Successful', {
        requestId,
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: session?.sessionId,
        permissions: enhancedUser.permissions?.length || 0,
      });

      // Log successful authentication
      await this.logAuthEvent('JWT_VALIDATION_SUCCESS', {
        userId: user.id,
        authContext,
        session,
      });

      return enhancedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `🔍 💥 JWT VALIDATION FAILED [${requestId}] ════════════════════════════════════════`,
      );
      this.logger.error(`🔍 ❌ Request: ${authContext.method} ${authContext.path}`);
      this.logger.error(
        `🔍 ❌ User: ${payload?.email || 'Unknown'} (${payload?.sub || 'Unknown'})`,
      );
      this.logger.error(`🔍 ❌ IP: ${authContext.ipAddress}`);
      this.logger.error(`🔍 ❌ Error: ${errorMessage}`);
      this.logger.error(`🔍 ❌ Error Type: ${error?.constructor?.name || 'Unknown'}`);

      if (this.debugEnabled && error instanceof Error && error.stack) {
        this.logger.error(`🔍 ❌ Stack Trace:\n${error.stack}`);
      }

      this.logger.error(`🔍 ❌ JWT Payload Debug:`, {
        hasUserId: !!payload?.sub,
        hasEmail: !!payload?.email,
        hasRole: !!payload?.role,
        hasSessionId: !!payload?.sessionId,
        tokenExpired: payload?.exp ? payload.exp < Math.floor(Date.now() / 1000) : 'unknown',
      });

      this.logger.error(
        '🔍 ═══════════════════════════════════════════════════════════════════════',
      );

      this.logger.error(`❌ JWT Validation Failed - ${errorMessage}`, {
        requestId,
        userId: payload?.sub,
        email: payload?.email,
        error: errorMessage,
        stack: this.debugEnabled && error instanceof Error ? error.stack : undefined,
        authContext,
      });

      // Log failed authentication attempt
      await this.logAuthEvent('JWT_VALIDATION_FAILURE', {
        userId: payload?.sub,
        authContext,
        error: errorMessage,
      });

      throw new UnauthorizedException({
        message: 'Authentication failed',
        requestId,
        timestamp: authContext.timestamp,
        debugInfo: this.debugEnabled
          ? {
              originalError: errorMessage,
              userId: payload?.sub,
              email: payload?.email,
              authContext,
            }
          : undefined,
      });
    }
  }

  private async validateJWTPayload(
    payload: EnterpriseJWTPayload,
    context: AuthContext,
  ): Promise<void> {
    this.debugLog('🔎 Validating JWT Payload Structure', {
      requestId: context.requestId,
      hasUserId: !!payload.sub,
      hasEmail: !!payload.email,
      hasRole: !!payload.role,
      hasSessionId: !!payload.sessionId,
    });

    if (!payload.sub) {
      throw new Error('JWT payload missing user ID (sub)');
    }

    if (!payload.email) {
      throw new Error('JWT payload missing email');
    }

    if (!payload.role) {
      throw new Error('JWT payload missing role');
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('JWT token has expired');
    }

    this.debugLog('✅ JWT Payload Structure Valid', { requestId: context.requestId });
  }

  private async resolveAndValidateUser(
    payload: EnterpriseJWTPayload,
    context: AuthContext,
  ): Promise<any> {
    this.debugLog('👤 Resolving User from Database', {
      requestId: context.requestId,
      userId: payload.sub,
      email: payload.email,
    });

    try {
      // First try to find by ID
      let user = await this.usersService.findById(payload.sub);

      if (!user) {
        this.debugLog('⚠️ User not found by ID, trying email lookup', {
          requestId: context.requestId,
          userId: payload.sub,
          email: payload.email,
        });

        // Fallback to email lookup
        const userByEmail = await this.usersService.findByEmail(payload.email);

        if (!userByEmail) {
          throw new Error(`User not found: ID=${payload.sub}, Email=${payload.email}`);
        }

        user = userByEmail;

        this.logger.warn(`User found by email but not by ID - possible data inconsistency`, {
          tokenUserId: payload.sub,
          actualUserId: user.id,
          email: payload.email,
        });
      }

      // Validate user is active
      if (!user.isActive) {
        throw new Error(`User account is deactivated: ${user.email}`);
      }

      // Validate email matches (security check)
      if (user.email !== payload.email) {
        throw new Error(`Email mismatch in JWT token for user ${user.id}`);
      }

      // Validate role matches (security check)
      if (user.role !== payload.role) {
        this.logger.warn(`Role mismatch in JWT token`, {
          userId: user.id,
          tokenRole: payload.role,
          userRole: user.role,
        });
        // Update the role in the user object to current role
        user.role = user.role; // Use the database role as authoritative
      }

      this.debugLog('✅ User Successfully Resolved', {
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });

      return user;
    } catch (error) {
      this.debugLog('❌ User Resolution Failed', {
        requestId: context.requestId,
        userId: payload.sub,
        email: payload.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async validateSession(
    payload: EnterpriseJWTPayload,
    context: AuthContext,
  ): Promise<UserSession | null> {
    if (!payload.sessionId) {
      this.debugLog('📋 No session ID in JWT payload - skipping session validation', {
        requestId: context.requestId,
      });
      return null;
    }

    this.debugLog('🔄 Validating User Session', {
      requestId: context.requestId,
      sessionId: payload.sessionId,
    });

    try {
      const sessionKey = `session:${payload.sessionId}`;
      const sessionData = await this.redisService.get(sessionKey);

      if (!sessionData) {
        this.logger.warn('Session not found in Redis', {
          sessionId: payload.sessionId,
          userId: payload.sub,
        });
        return null;
      }

      const session: UserSession = JSON.parse(sessionData);

      // Validate session belongs to user
      if (session.userId !== payload.sub) {
        throw new Error(`Session belongs to different user: ${session.userId} vs ${payload.sub}`);
      }

      // Check if session is active
      if (!session.isActive) {
        throw new Error('Session is deactivated');
      }

      // Check session expiration (if configured)
      const sessionMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      if (sessionAge > sessionMaxAge) {
        throw new Error('Session has expired');
      }

      this.debugLog('✅ Session Valid', {
        requestId: context.requestId,
        sessionId: session.sessionId,
        userId: session.userId,
        lastActivity: session.lastActivity,
        isActive: session.isActive,
      });

      return session;
    } catch (error) {
      this.logger.error('Session validation failed', {
        sessionId: payload.sessionId,
        userId: payload.sub,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw here - allow authentication without session for backward compatibility
      return null;
    }
  }

  private async performSecurityChecks(user: any, context: AuthContext): Promise<void> {
    this.debugLog('🛡️ Performing Security Checks', {
      requestId: context.requestId,
      userId: user.id,
      ipAddress: context.ipAddress,
    });

    // Check for suspicious activity patterns
    const recentFailures = await this.getRecentFailedAttempts(user.id, context.ipAddress);
    if (recentFailures > 10) {
      throw new Error('Too many recent failed authentication attempts');
    }

    // Check IP-based rate limiting
    const ipAttempts = await this.getRecentIPAttempts(context.ipAddress);
    if (ipAttempts > 50) {
      throw new Error('Too many authentication attempts from this IP address');
    }

    this.debugLog('✅ Security Checks Passed', {
      requestId: context.requestId,
      recentFailures,
      ipAttempts,
    });
  }

  private async updateSessionActivity(
    session: UserSession | null,
    context: AuthContext,
  ): Promise<void> {
    if (!session) {
      return;
    }

    this.debugLog('📝 Updating Session Activity', {
      requestId: context.requestId,
      sessionId: session.sessionId,
    });

    try {
      session.lastActivity = context.timestamp;
      session.ipAddress = context.ipAddress; // Update with current IP

      const sessionKey = `session:${session.sessionId}`;
      await this.redisService.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(session)); // 7 days

      this.debugLog('✅ Session Activity Updated', {
        requestId: context.requestId,
        sessionId: session.sessionId,
      });
    } catch (error) {
      this.logger.error('Failed to update session activity', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is not critical for authentication
    }
  }

  private async prepareUserContext(
    user: any,
    session: UserSession | null,
    context: AuthContext,
  ): Promise<any> {
    this.debugLog('🔧 Preparing Enhanced User Context', {
      requestId: context.requestId,
      userId: user.id,
    });

    // Get user permissions based on role
    const permissions = await this.getUserPermissions(user.role);

    const enhancedUser = {
      ...user,
      sessionId: session?.sessionId,
      permissions,
      authContext: {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
      },
      securityFlags: session?.securityFlags || {
        isSuspicious: false,
        riskLevel: 'low' as const,
        failedAttempts: 0,
      },
    };

    this.debugLog('✅ Enhanced User Context Prepared', {
      requestId: context.requestId,
      userId: user.id,
      permissionsCount: permissions.length,
      hasSession: !!session,
    });

    return enhancedUser;
  }

  private async getUserPermissions(role: string): Promise<string[]> {
    // TODO: Implement dynamic permission resolution
    // For now, return basic permissions based on role
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // All permissions
      merchant: ['transactions:read', 'transactions:create', 'payments:read', 'analytics:read'],
      customer: ['transactions:read:own', 'payments:read:own', 'profile:update'],
    };

    return rolePermissions[role] || ['profile:read'];
  }

  private async logAuthEvent(eventType: string, data: any): Promise<void> {
    try {
      // TODO: Implement comprehensive auth audit logging
      this.logger.log(`AUTH_EVENT: ${eventType}`, {
        eventType,
        timestamp: new Date(),
        ...data,
      });
    } catch (error) {
      this.logger.error('Failed to log auth event', error);
    }
  }

  private async getRecentFailedAttempts(userId: string, ipAddress: string): Promise<number> {
    try {
      const key = `failed_attempts:${userId}:${ipAddress}`;
      const attempts = await this.redisService.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get recent failed attempts', error);
      return 0;
    }
  }

  private async getRecentIPAttempts(ipAddress: string): Promise<number> {
    try {
      const key = `ip_attempts:${ipAddress}`;
      const attempts = await this.redisService.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get recent IP attempts', error);
      return 0;
    }
  }

  private extractIpAddress(request: Request): string {
    return (
      request.ip ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      (request.connection as any)?.socket?.remoteAddress ||
      request.get('X-Forwarded-For')?.split(',')[0] ||
      request.get('X-Real-IP') ||
      'unknown'
    );
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugEnabled) {
      this.logger.debug(`${message}`, data);
    }
  }
}
