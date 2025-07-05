import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Options,
  ValidationPipe,
  UsePipes,
  Req,
  Logger,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { EnterpriseAuthService, LoginContext, DeviceInfo } from './services/enterprise-auth.service';
import { EnterpriseAuthGuard } from './guards/enterprise-auth.guard';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';

  constructor(
    private authService: AuthService,
    private enterpriseAuthService: EnterpriseAuthService,
  ) {
    this.logger.log('🔐 Enterprise Auth Controller initialized');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 attempts per 15 minutes (increased for enterprise)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Enterprise user login with comprehensive authentication' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto, @Req() request: Request): Promise<AuthResponseDto> {
    const requestId = uuidv4();
    const context = this.createLoginContext(request, requestId);

    this.debugLog('🔑 Enterprise Login Request', {
      requestId,
      email: loginDto.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: context.timestamp,
    });

    try {
      const result = await this.enterpriseAuthService.login(loginDto, context);
      
      this.debugLog('✅ Enterprise Login Successful', {
        requestId,
        userId: result.user.id,
        email: result.user.email,
        sessionId: result.session?.sessionId,
      });

      // Add debug headers in development
      if (this.debugEnabled && request.res) {
        request.res.setHeader('X-Request-ID', requestId);
        request.res.setHeader('X-Auth-Type', 'enterprise');
        request.res.setHeader('X-Session-ID', result.session?.sessionId || 'none');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('❌ Enterprise Login Failed', {
        requestId,
        email: loginDto.email,
        error: errorMessage,
        ipAddress: context.ipAddress,
        stack: this.debugEnabled ? errorStack : undefined,
      });
      throw error;
    }
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 registrations per hour
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Enterprise user registration with enhanced security' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() registerDto: RegisterDto, @Req() request: Request): Promise<AuthResponseDto> {
    const requestId = uuidv4();
    const context = this.createLoginContext(request, requestId);

    this.debugLog('📝 Enterprise Registration Request', {
      requestId,
      email: registerDto.email,
      name: registerDto.name,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    try {
      const result = await this.enterpriseAuthService.register(registerDto, context);
      
      this.debugLog('✅ Enterprise Registration Successful', {
        requestId,
        userId: result.user.id,
        email: result.user.email,
        sessionId: result.session?.sessionId,
      });

      // Add debug headers in development
      if (this.debugEnabled && request.res) {
        request.res.setHeader('X-Request-ID', requestId);
        request.res.setHeader('X-Auth-Type', 'enterprise');
        request.res.setHeader('X-Session-ID', result.session?.sessionId || 'none');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('❌ Enterprise Registration Failed', {
        requestId,
        email: registerDto.email,
        error: errorMessage,
        ipAddress: context.ipAddress,
        stack: this.debugEnabled ? errorStack : undefined,
      });
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(EnterpriseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() request: Request): Promise<{ message: string }> {
    const user = (request as any).user;
    const requestId = uuidv4();

    this.debugLog('👋 Enterprise Logout Request', {
      requestId,
      userId: user.id,
      sessionId: user.sessionId,
    });

    try {
      await this.enterpriseAuthService.logout(user.sessionId, user.id);
      
      this.debugLog('✅ Enterprise Logout Successful', {
        requestId,
        userId: user.id,
        sessionId: user.sessionId,
      });

      return { message: 'Logout successful' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('❌ Enterprise Logout Failed', {
        requestId,
        userId: user.id,
        sessionId: user.sessionId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: { refreshToken: string }): Promise<{ accessToken: string }> {
    const requestId = uuidv4();

    this.debugLog('🔄 Token Refresh Request', {
      requestId,
      refreshToken: body.refreshToken.substring(0, 20) + '...',
    });

    try {
      const result = await this.enterpriseAuthService.refreshToken(body.refreshToken);
      
      this.debugLog('✅ Token Refresh Successful', {
        requestId,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('❌ Token Refresh Failed', {
        requestId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get('me')
  @UseGuards(EnterpriseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() request: Request): Promise<any> {
    const user = (request as any).user;
    const requestId = uuidv4();

    this.debugLog('👤 Get Current User Request', {
      requestId,
      userId: user.id,
      sessionId: user.sessionId,
    });

    // Return enhanced user information with authentication context
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      creditLimit: user.creditLimit,
      availableCredit: user.availableCredit,
      isActive: user.isActive,
      sessionId: user.sessionId,
      permissions: user.permissions,
      authContext: {
        requestId,
        authenticated: true,
        authType: 'enterprise',
        lastActivity: new Date(),
      },
      securityFlags: user.securityFlags,
    };
  }

  @Get('debug/metrics')
  @UseGuards(EnterpriseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authentication metrics (admin only)' })
  @ApiResponse({ status: 200, description: 'Authentication metrics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAuthMetrics(@Req() request: Request): Promise<any> {
    const user = (request as any).user;

    // Only allow admin access to metrics
    if (user.role !== 'admin') {
      this.logger.warn('Unauthorized access to auth metrics', {
        userId: user.id,
        role: user.role,
      });
      throw new Error('Insufficient permissions');
    }

    // Get metrics from the auth guard
    const authGuard = new EnterpriseAuthGuard(null as any, null as any);
    const metrics = authGuard.getAuthMetrics();

    this.debugLog('📊 Auth Metrics Retrieved', {
      userId: user.id,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successRate,
        uniqueUsers: metrics.uniqueUsersCount,
      },
    });

    return {
      timestamp: new Date(),
      metrics,
      debug: this.debugEnabled,
    };
  }

  @Options('login')
  loginOptions() {
    return {};
  }

  @Options('register')
  registerOptions() {
    return {};
  }

  @Options('logout')
  logoutOptions() {
    return {};
  }

  @Options('refresh')
  refreshOptions() {
    return {};
  }

  @Options('me')
  meOptions() {
    return {};
  }

  private createLoginContext(request: Request, requestId: string): LoginContext {
    const userAgent = request.get('User-Agent') || 'Unknown';
    const ipAddress = this.extractIpAddress(request);

    const deviceInfo: DeviceInfo = {
      userAgent,
      deviceId: request.get('X-Device-ID'),
      platform: this.extractPlatform(userAgent),
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      isMobile: this.isMobileDevice(userAgent),
    };

    return {
      requestId,
      ipAddress,
      userAgent,
      deviceInfo,
      timestamp: new Date(),
    };
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

  private extractPlatform(userAgent: string): string {
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Macintosh/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  private extractBrowser(userAgent: string): string {
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Edge/i.test(userAgent)) return 'Edge';
    if (/Opera/i.test(userAgent)) return 'Opera';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (/Windows NT 10/i.test(userAgent)) return 'Windows 10';
    if (/Windows NT 6.3/i.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6.1/i.test(userAgent)) return 'Windows 7';
    if (/Mac OS X/i.test(userAgent)) return 'macOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone OS|iOS/i.test(userAgent)) return 'iOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  private isMobileDevice(userAgent: string): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugEnabled) {
      this.logger.debug(`${message}`, data);
    }
  }
}
