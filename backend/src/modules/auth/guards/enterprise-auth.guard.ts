import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  path: string;
  method: string;
  timestamp: Date;
  authStartTime: number;
  isPublicRoute: boolean;
}

export interface AuthMetrics {
  totalRequests: number;
  successfulAuth: number;
  failedAuth: number;
  averageAuthTime: number;
  uniqueUsers: Set<string>;
  uniqueIPs: Set<string>;
}

@Injectable()
export class EnterpriseAuthGuard extends AuthGuard('enterprise-jwt') {
  private readonly logger = new Logger(EnterpriseAuthGuard.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';
  private readonly authMetrics: AuthMetrics = {
    totalRequests: 0,
    successfulAuth: 0,
    failedAuth: 0,
    averageAuthTime: 0,
    uniqueUsers: new Set(),
    uniqueIPs: new Set(),
  };

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {
    super();
    this.logger.log('🛡️ Enterprise Auth Guard initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Create request context
    const requestContext = this.createRequestContext(request);
    
    // Add request context to request object for downstream use
    (request as any).authContext = requestContext;

    this.debugLog('🔐 Authentication Request Started', {
      requestId: requestContext.requestId,
      method: requestContext.method,
      path: requestContext.path,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    try {
      // Check if route is public (optional authentication)
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        requestContext.isPublicRoute = true;
        this.debugLog('🌐 Public route - skipping authentication', {
          requestId: requestContext.requestId,
        });
        return true;
      }

      // Perform rate limiting check
      await this.performRateLimiting(requestContext);

      // Execute authentication
      const result = await super.canActivate(context);
      
      if (result) {
        // Authentication successful
        const authTime = Date.now() - requestContext.authStartTime;
        await this.handleAuthSuccess(request, requestContext, authTime);
        
        // Add auth timing to response headers (for debugging)
        if (this.debugEnabled) {
          response.setHeader('X-Auth-Time', `${authTime}ms`);
          response.setHeader('X-Request-ID', requestContext.requestId);
        }
      }

      return result as boolean;

    } catch (error) {
      // Authentication failed
      const authTime = Date.now() - requestContext.authStartTime;
      await this.handleAuthFailure(requestContext, error, authTime);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext): any {
    const request = context.switchToHttp().getRequest<Request>();
    const requestContext = (request as any).authContext as RequestContext;

    this.debugLog('🔍 Handling Authentication Result', {
      requestId: requestContext.requestId,
      hasError: !!err,
      hasUser: !!user,
      hasInfo: !!info,
      userId: user?.id,
    });

    if (err) {
      this.logger.error('Authentication error in handleRequest', {
        requestId: requestContext.requestId,
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }

    if (!user) {
      const authError = new UnauthorizedException({
        message: 'Authentication required',
        requestId: requestContext.requestId,
        timestamp: new Date(),
        debugInfo: this.debugEnabled ? {
          info: info?.message,
          path: requestContext.path,
          method: requestContext.method,
        } : undefined,
      });

      this.logger.warn('Authentication failed - no user returned', {
        requestId: requestContext.requestId,
        info: info?.message,
        path: requestContext.path,
      });

      throw authError;
    }

    // Update request context with user info
    requestContext.userId = user.id;
    requestContext.sessionId = user.sessionId;

    // Add user to request object
    (request as any).user = user;

    this.debugLog('✅ Authentication Successful', {
      requestId: requestContext.requestId,
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId,
    });

    return user;
  }

  private createRequestContext(request: Request): RequestContext {
    const requestId = uuidv4();
    const ipAddress = this.extractIpAddress(request);
    
    return {
      requestId,
      ipAddress,
      userAgent: request.get('User-Agent') || 'Unknown',
      path: request.path,
      method: request.method,
      timestamp: new Date(),
      authStartTime: Date.now(),
      isPublicRoute: false,
    };
  }

  private async performRateLimiting(context: RequestContext): Promise<void> {
    this.debugLog('⚡ Performing Rate Limiting Check', {
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    try {
      // IP-based rate limiting
      const ipKey = `rate_limit:ip:${context.ipAddress}`;
      const ipRequests = await this.redisService.incr(ipKey);
      
      if (ipRequests === 1) {
        // Set expiration on first request
        await this.redisService.expire(ipKey, 60); // 1 minute window
      }

      // Check IP rate limit (100 requests per minute)
      if (ipRequests > 100) {
        this.logger.warn('IP rate limit exceeded', {
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          requests: ipRequests,
        });
        
        throw new ForbiddenException({
          message: 'Rate limit exceeded',
          requestId: context.requestId,
          retryAfter: 60,
        });
      }

      // Path-based rate limiting for sensitive endpoints
      if (this.isSensitiveEndpoint(context.path)) {
        const pathKey = `rate_limit:path:${context.ipAddress}:${context.path}`;
        const pathRequests = await this.redisService.incr(pathKey);
        
        if (pathRequests === 1) {
          await this.redisService.expire(pathKey, 300); // 5 minute window
        }

        // Check sensitive endpoint rate limit (development: 100 requests per 5 minutes, production: 10)
        const sensitiveEndpointLimit = this.debugEnabled ? 100 : 10;
        if (pathRequests > sensitiveEndpointLimit) {
          this.logger.warn('Sensitive endpoint rate limit exceeded', {
            requestId: context.requestId,
            ipAddress: context.ipAddress,
            path: context.path,
            requests: pathRequests,
            limit: sensitiveEndpointLimit,
            environment: this.debugEnabled ? 'development' : 'production',
          });
          
          throw new ForbiddenException({
            message: 'Sensitive endpoint rate limit exceeded',
            requestId: context.requestId,
            retryAfter: 300,
          });
        }
      }

      this.debugLog('✅ Rate Limiting Check Passed', {
        requestId: context.requestId,
        ipRequests,
      });

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Rate limiting check failed', {
        requestId: context.requestId,
        error: errorMessage,
      });
      // Don't block requests if rate limiting fails
    }
  }

  private async handleAuthSuccess(
    request: Request,
    context: RequestContext,
    authTime: number,
  ): Promise<void> {
    const user = (request as any).user;

    this.debugLog('🎉 Authentication Success Handler', {
      requestId: context.requestId,
      userId: user.id,
      authTime: `${authTime}ms`,
    });

    // Update metrics
    this.authMetrics.totalRequests++;
    this.authMetrics.successfulAuth++;
    this.authMetrics.uniqueUsers.add(user.id);
    this.authMetrics.uniqueIPs.add(context.ipAddress);
    this.authMetrics.averageAuthTime = 
      (this.authMetrics.averageAuthTime + authTime) / 2;

    // Log successful authentication
    await this.logAuthEvent('AUTH_SUCCESS', {
      requestId: context.requestId,
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId,
      authTime,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method,
    });

    // Reset failed attempts counter
    try {
      const failedKey = `failed_attempts:${user.id}:${context.ipAddress}`;
      await this.redisService.del(failedKey);
    } catch (error) {
      this.logger.error('Failed to reset failed attempts counter', error);
    }
  }

  private async handleAuthFailure(
    context: RequestContext,
    error: any,
    authTime: number,
  ): Promise<void> {
    this.debugLog('❌ Authentication Failure Handler', {
      requestId: context.requestId,
      error: error.message,
      authTime: `${authTime}ms`,
    });

    // Update metrics
    this.authMetrics.totalRequests++;
    this.authMetrics.failedAuth++;
    this.authMetrics.uniqueIPs.add(context.ipAddress);

    // Log failed authentication
    await this.logAuthEvent('AUTH_FAILURE', {
      requestId: context.requestId,
      error: error.message,
      authTime,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method,
    });

    // Increment failed attempts counter
    try {
      if (context.userId) {
        const failedKey = `failed_attempts:${context.userId}:${context.ipAddress}`;
        await this.redisService.incr(failedKey);
        await this.redisService.expire(failedKey, 3600); // 1 hour
      }

      // Track IP-based failures
      const ipFailedKey = `ip_failed:${context.ipAddress}`;
      await this.redisService.incr(ipFailedKey);
      await this.redisService.expire(ipFailedKey, 3600); // 1 hour
    } catch (redisError) {
      this.logger.error('Failed to increment failure counters', redisError);
    }
  }

  private async logAuthEvent(eventType: string, data: any): Promise<void> {
    try {
      // Store auth event in Redis for analytics
      const eventKey = `auth_event:${Date.now()}:${uuidv4()}`;
      const eventData = {
        eventType,
        timestamp: new Date(),
        ...data,
      };
      
      await this.redisService.setex(eventKey, 24 * 60 * 60, JSON.stringify(eventData)); // 24 hours
      
      // Also log to application logs
      this.logger.log(`AUTH_EVENT: ${eventType}`, eventData);
    } catch (error) {
      this.logger.error('Failed to log auth event', error);
    }
  }

  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/auth/login',
      '/auth/register',
      '/transactions',
      '/payments',
      '/admin',
      '/users',
    ];
    
    return sensitivePatterns.some(pattern => path.startsWith(pattern));
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

  // Public method to get authentication metrics (for admin dashboard)
  getAuthMetrics(): AuthMetrics & { 
    uniqueUsersCount: number; 
    uniqueIPsCount: number;
    successRate: number;
  } {
    return {
      ...this.authMetrics,
      uniqueUsersCount: this.authMetrics.uniqueUsers.size,
      uniqueIPsCount: this.authMetrics.uniqueIPs.size,
      successRate: this.authMetrics.totalRequests > 0 
        ? (this.authMetrics.successfulAuth / this.authMetrics.totalRequests) * 100 
        : 0,
    };
  }
}