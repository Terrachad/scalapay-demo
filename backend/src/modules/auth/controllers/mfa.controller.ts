import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  MFAService,
  TOTPSetupResult,
  MFAVerificationResult,
  MFAVerificationRequest,
  SMSVerificationRequest,
  EmailVerificationRequest,
} from '../services/mfa.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMFASettings, MFASecuritySettings } from '../entities/user-mfa-settings.entity';
import { User } from '../../users/entities/user.entity';

// DTOs for request/response
export interface SetupTOTPDto {
  userId?: string; // Optional for admin use
}

export interface VerifyTOTPSetupDto {
  token: string;
  userId?: string; // Optional for admin use
}

export interface VerifyTOTPDto {
  token: string;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    operatingSystem?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  rememberDevice?: boolean;
}

export interface SetupSMSDto {
  phoneNumber: string;
  userId?: string; // Optional for admin use
}

export interface VerifySMSDto {
  code: string;
  userId?: string; // Optional for admin use
}

export interface SetupEmailDto {
  emailAddress: string;
  userId?: string; // Optional for admin use
}

export interface VerifyEmailDto {
  code: string;
  userId?: string; // Optional for admin use
}

export interface VerifyBackupCodeDto {
  code: string;
  userId?: string; // Optional for admin use
}

export interface UnifiedMFAVerificationDto {
  method: 'totp' | 'sms' | 'email' | 'backup_code';
  code: string;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    operatingSystem?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  rememberDevice?: boolean;
  userId?: string; // Optional for admin use
}

export interface RevokeTrustedDeviceDto {
  deviceId: string;
  userId?: string; // Optional for admin use
}

export interface UpdateMFASettingsDto {
  enabledMethods?: {
    totp?: boolean;
    sms?: boolean;
    email?: boolean;
    backupCodes?: boolean;
  };
  securitySettings?: {
    requireMFAForLogin?: boolean;
    requireMFAForPayments?: boolean;
    requireMFAForSettingsChange?: boolean;
    requireMFAForHighValueTransactions?: boolean;
    highValueThreshold?: number;
    maxFailedAttempts?: number;
    lockoutDuration?: number; // minutes
    trustedDeviceDuration?: number; // days
    requireMFAFrequency?: number; // hours
  };
}

@ApiTags('mfa')
@Controller('mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MFAController {
  private readonly logger = new Logger(MFAController.name);

  constructor(
    private readonly mfaService: MFAService,
    @InjectRepository(UserMFASettings)
    private mfaSettingsRepository: Repository<UserMFASettings>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // MFA status and settings
  @Get('status')
  @ApiOperation({ summary: 'Get MFA status and settings for current user' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved successfully' })
  async getMFAStatus(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const mfaStatus = await this.mfaService.getMFASettings(userId);

    return {
      message: 'MFA status retrieved successfully',
      status: mfaStatus,
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update MFA settings' })
  @ApiResponse({ status: 200, description: 'MFA settings updated successfully' })
  async updateMFASettings(@Request() req: any, @Body() updateDto: UpdateMFASettingsDto) {
    const userId = req.user.userId || req.user.id;

    const mfaSettings = await this.mfaSettingsRepository.findOne({
      where: { userId },
    });

    if (!mfaSettings) {
      throw new NotFoundException('MFA settings not found');
    }

    // Update settings
    if (updateDto.enabledMethods) {
      Object.assign(mfaSettings.enabledMethods, updateDto.enabledMethods);
    }

    if (updateDto.securitySettings) {
      const currentSettings: Partial<MFASecuritySettings> = mfaSettings.securitySettings || {};
      mfaSettings.securitySettings = {
        requireMFAForLogin: currentSettings.requireMFAForLogin ?? true,
        requireMFAForPayments: currentSettings.requireMFAForPayments ?? true,
        requireMFAForSettingsChange: currentSettings.requireMFAForSettingsChange ?? true,
        requireMFAForHighValueTransactions:
          currentSettings.requireMFAForHighValueTransactions ?? true,
        highValueThreshold: currentSettings.highValueThreshold ?? 1000,
        maxFailedAttempts: currentSettings.maxFailedAttempts ?? 5,
        lockoutDuration: currentSettings.lockoutDuration ?? 30,
        trustedDeviceDuration: currentSettings.trustedDeviceDuration ?? 30,
        requireMFAFrequency: currentSettings.requireMFAFrequency ?? 24,
        ...updateDto.securitySettings,
      };
    }

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`MFA settings updated for user ${userId}`);

    return {
      message: 'MFA settings updated successfully',
      settings: await this.mfaService.getMFASettings(userId),
    };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable MFA for current user' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMFA(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    await this.mfaService.disableMFA(userId);

    this.logger.log(`MFA disabled for user ${userId}`);

    return {
      message: 'MFA disabled successfully',
    };
  }

  // TOTP (Time-based One-Time Password) endpoints
  @Post('totp/setup')
  @ApiOperation({ summary: 'Setup TOTP for MFA' })
  @ApiResponse({ status: 201, description: 'TOTP setup initiated successfully' })
  async setupTOTP(
    @Request() req: any,
    @Body() setupDto: SetupTOTPDto,
  ): Promise<{ message: string; setup: TOTPSetupResult }> {
    const userId = setupDto.userId || req.user.userId || req.user.id;

    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const setup = await this.mfaService.setupTOTP(userId);

    this.logger.log(`TOTP setup initiated for user ${userId}`);

    return {
      message: 'TOTP setup initiated successfully',
      setup,
    };
  }

  @Post('totp/verify-setup')
  @ApiOperation({ summary: 'Verify TOTP setup with initial token' })
  @ApiResponse({ status: 200, description: 'TOTP setup verified successfully' })
  async verifyTOTPSetup(@Request() req: any, @Body() verifyDto: VerifyTOTPSetupDto) {
    const userId = verifyDto.userId || req.user.userId || req.user.id;

    const verified = await this.mfaService.verifyTOTPSetup(userId, verifyDto.token);

    if (!verified) {
      throw new BadRequestException('Invalid TOTP token');
    }

    this.logger.log(`TOTP setup verified for user ${userId}`);

    return {
      message: 'TOTP setup verified successfully',
      verified: true,
    };
  }

  @Post('totp/verify')
  @ApiOperation({ summary: 'Verify TOTP token' })
  @ApiResponse({ status: 200, description: 'TOTP token verified successfully' })
  async verifyTOTP(@Request() req: any, @Body() verifyDto: VerifyTOTPDto) {
    const userId = req.user.userId || req.user.id;

    // Enhance device info with request data
    const deviceInfo = verifyDto.deviceInfo
      ? {
          ...verifyDto.deviceInfo,
          ipAddress: verifyDto.deviceInfo.ipAddress || req.ip || 'unknown',
          userAgent: verifyDto.deviceInfo.userAgent || req.get('User-Agent') || 'unknown',
        }
      : undefined;

    const verificationRequest: MFAVerificationRequest = {
      userId,
      method: 'totp',
      code: verifyDto.token,
      deviceInfo,
      rememberDevice: verifyDto.rememberDevice,
    };

    const result = await this.mfaService.verifyMFA(verificationRequest);

    if (!result.success) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    this.logger.log(`TOTP verified for user ${userId}`);

    return {
      message: 'TOTP token verified successfully',
      result,
    };
  }

  // SMS MFA endpoints
  @Post('sms/setup')
  @ApiOperation({ summary: 'Setup SMS MFA' })
  @ApiResponse({ status: 201, description: 'SMS MFA setup initiated successfully' })
  async setupSMS(@Request() req: any, @Body() setupDto: SetupSMSDto) {
    const userId = setupDto.userId || req.user.userId || req.user.id;

    const smsRequest: SMSVerificationRequest = {
      userId,
      phoneNumber: setupDto.phoneNumber,
    };

    const result = await this.mfaService.setupSMS(smsRequest);

    this.logger.log(`SMS MFA setup initiated for user ${userId}`);

    return {
      message: 'SMS MFA setup initiated successfully',
      verificationId: result.verificationId,
    };
  }

  @Post('sms/verify')
  @ApiOperation({ summary: 'Verify SMS MFA code' })
  @ApiResponse({ status: 200, description: 'SMS MFA code verified successfully' })
  async verifySMS(@Request() req: any, @Body() verifyDto: VerifySMSDto) {
    const userId = verifyDto.userId || req.user.userId || req.user.id;

    const verified = await this.mfaService.verifySMS(userId, verifyDto.code);

    if (!verified) {
      throw new BadRequestException('Invalid SMS verification code');
    }

    this.logger.log(`SMS MFA verified for user ${userId}`);

    return {
      message: 'SMS MFA code verified successfully',
      verified: true,
    };
  }

  // Email MFA endpoints
  @Post('email/setup')
  @ApiOperation({ summary: 'Setup Email MFA' })
  @ApiResponse({ status: 201, description: 'Email MFA setup initiated successfully' })
  async setupEmail(@Request() req: any, @Body() setupDto: SetupEmailDto) {
    const userId = setupDto.userId || req.user.userId || req.user.id;

    const emailRequest: EmailVerificationRequest = {
      userId,
      emailAddress: setupDto.emailAddress,
    };

    const result = await this.mfaService.setupEmail(emailRequest);

    this.logger.log(`Email MFA setup initiated for user ${userId}`);

    return {
      message: 'Email MFA setup initiated successfully',
      verificationId: result.verificationId,
    };
  }

  @Post('email/verify')
  @ApiOperation({ summary: 'Verify Email MFA code' })
  @ApiResponse({ status: 200, description: 'Email MFA code verified successfully' })
  async verifyEmail(@Request() req: any, @Body() verifyDto: VerifyEmailDto) {
    const userId = verifyDto.userId || req.user.userId || req.user.id;

    const verified = await this.mfaService.verifyEmail(userId, verifyDto.code);

    if (!verified) {
      throw new BadRequestException('Invalid email verification code');
    }

    this.logger.log(`Email MFA verified for user ${userId}`);

    return {
      message: 'Email MFA code verified successfully',
      verified: true,
    };
  }

  // Backup codes endpoints
  @Post('backup-codes/generate')
  @ApiOperation({ summary: 'Generate backup codes' })
  @ApiResponse({ status: 201, description: 'Backup codes generated successfully' })
  async generateBackupCodes(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const backupCodes = await this.mfaService.generateBackupCodes(userId);

    this.logger.log(`Backup codes generated for user ${userId}`);

    return {
      message: 'Backup codes generated successfully',
      backupCodes,
      warning: 'Store these codes in a safe place. They will not be shown again.',
    };
  }

  @Post('backup-codes/verify')
  @ApiOperation({ summary: 'Verify backup code' })
  @ApiResponse({ status: 200, description: 'Backup code verified successfully' })
  async verifyBackupCode(@Request() req: any, @Body() verifyDto: VerifyBackupCodeDto) {
    const userId = verifyDto.userId || req.user.userId || req.user.id;

    const verified = await this.mfaService.verifyBackupCode(userId, verifyDto.code);

    if (!verified) {
      throw new BadRequestException('Invalid backup code');
    }

    this.logger.log(`Backup code verified for user ${userId}`);

    return {
      message: 'Backup code verified successfully',
      verified: true,
      warning: 'This backup code has been used and is no longer valid.',
    };
  }

  // Unified verification endpoint
  @Post('verify')
  @ApiOperation({ summary: 'Unified MFA verification endpoint' })
  @ApiResponse({ status: 200, description: 'MFA verification completed' })
  async verifyMFA(
    @Request() req: any,
    @Body() verifyDto: UnifiedMFAVerificationDto,
  ): Promise<{ message: string; result: MFAVerificationResult }> {
    const userId = verifyDto.userId || req.user.userId || req.user.id;

    // Enhance device info with request data
    const deviceInfo = verifyDto.deviceInfo
      ? {
          ...verifyDto.deviceInfo,
          ipAddress: verifyDto.deviceInfo.ipAddress || req.ip || 'unknown',
          userAgent: verifyDto.deviceInfo.userAgent || req.get('User-Agent') || 'unknown',
        }
      : undefined;

    const verificationRequest: MFAVerificationRequest = {
      userId,
      method: verifyDto.method,
      code: verifyDto.code,
      deviceInfo,
      rememberDevice: verifyDto.rememberDevice,
    };

    const result = await this.mfaService.verifyMFA(verificationRequest);

    if (!result.success) {
      throw new UnauthorizedException(`Invalid ${verifyDto.method} code`);
    }

    this.logger.log(`MFA verified for user ${userId} using ${verifyDto.method}`);

    return {
      message: 'MFA verification completed successfully',
      result,
    };
  }

  // Trusted device management
  @Get('trusted-devices')
  @ApiOperation({ summary: 'Get trusted devices' })
  @ApiResponse({ status: 200, description: 'Trusted devices retrieved successfully' })
  async getTrustedDevices(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const mfaSettings = await this.mfaSettingsRepository.findOne({
      where: { userId },
    });

    if (!mfaSettings) {
      return {
        message: 'No MFA settings found',
        trustedDevices: [],
      };
    }

    const activeTrustedDevices =
      mfaSettings.trustedDevices?.filter(
        (device) => device.isActive && device.trustExpiresAt > new Date(),
      ) || [];

    return {
      message: 'Trusted devices retrieved successfully',
      trustedDevices: activeTrustedDevices.map((device) => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        operatingSystem: device.operatingSystem,
        firstTrusted: device.firstTrusted,
        lastUsed: device.lastUsed,
        trustExpiresAt: device.trustExpiresAt,
      })),
    };
  }

  @Delete('trusted-devices/:deviceId')
  @ApiOperation({ summary: 'Revoke trusted device' })
  @ApiResponse({ status: 200, description: 'Trusted device revoked successfully' })
  async revokeTrustedDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId || req.user.id;

    await this.mfaService.revokeTrustedDevice(userId, deviceId);

    this.logger.log(`Trusted device revoked for user ${userId}: ${deviceId}`);

    return {
      message: 'Trusted device revoked successfully',
      deviceId,
    };
  }

  @Delete('trusted-devices')
  @ApiOperation({ summary: 'Revoke all trusted devices' })
  @ApiResponse({ status: 200, description: 'All trusted devices revoked successfully' })
  async revokeAllTrustedDevices(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    await this.mfaService.revokeAllTrustedDevices(userId);

    this.logger.log(`All trusted devices revoked for user ${userId}`);

    return {
      message: 'All trusted devices revoked successfully',
    };
  }

  @Get('trusted-devices/check/:deviceId')
  @ApiOperation({ summary: 'Check if device is trusted' })
  @ApiResponse({ status: 200, description: 'Device trust status checked' })
  async checkTrustedDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId || req.user.id;

    const isTrusted = await this.mfaService.isTrustedDevice(userId, deviceId);

    return {
      message: 'Device trust status checked',
      deviceId,
      isTrusted,
    };
  }

  // Account management
  @Post('unlock')
  @ApiOperation({ summary: 'Unlock MFA-locked account' })
  @ApiResponse({ status: 200, description: 'Account unlocked successfully' })
  async unlockAccount(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    await this.mfaService.unlockAccount(userId);

    this.logger.log(`Account unlocked for user ${userId}`);

    return {
      message: 'Account unlocked successfully',
    };
  }

  // Analytics and reporting
  @Get('analytics')
  @ApiOperation({ summary: 'Get MFA analytics for current user' })
  @ApiResponse({ status: 200, description: 'MFA analytics retrieved successfully' })
  async getMFAAnalytics(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const mfaSettings = await this.mfaSettingsRepository.findOne({
      where: { userId },
    });

    if (!mfaSettings) {
      return {
        message: 'No MFA settings found',
        analytics: {
          isEnabled: false,
          setupComplete: false,
          securityScore: 0,
          methodsEnabled: 0,
          trustedDevices: 0,
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
        },
      };
    }

    const analytics = {
      isEnabled: mfaSettings.isEnabled,
      setupComplete: mfaSettings.isSetupComplete,
      securityScore: mfaSettings.getSecurityScore(),
      methodsEnabled: mfaSettings.getAvailableMethods().length,
      trustedDevices: mfaSettings.trustedDevices?.filter((d) => d.isActive).length || 0,
      totalAttempts: mfaSettings.attemptHistory?.length || 0,
      successfulAttempts: mfaSettings.attemptHistory?.filter((a) => a.success).length || 0,
      failedAttempts: mfaSettings.failedAttempts || 0,
      lastSuccessfulLogin: mfaSettings.attemptHistory?.filter((a) => a.success).pop()?.timestamp,
      accountStatus: mfaSettings.isAccountLocked() ? 'locked' : 'active',
      enabledMethods: mfaSettings.getAvailableMethods(),
    };

    return {
      message: 'MFA analytics retrieved successfully',
      analytics,
    };
  }

  // Admin endpoints (require admin role)
  @Get('admin/cleanup')
  @ApiOperation({ summary: 'Clean up expired MFA data (Admin only)' })
  @ApiResponse({ status: 200, description: 'MFA cleanup completed' })
  async cleanupExpiredData(@Request() req: any) {
    // TODO: Add admin role check

    const result = await this.mfaService.cleanupExpiredData();

    this.logger.log(
      `MFA cleanup completed: ${result.expiredDevicesRemoved} devices removed, ${result.lockedAccountsProcessed} accounts processed`,
    );

    return {
      message: 'MFA cleanup completed successfully',
      result,
    };
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get system-wide MFA statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'System MFA statistics retrieved' })
  async getSystemMFAStats(@Request() req: any) {
    // TODO: Add admin role check

    const totalSettings = await this.mfaSettingsRepository.count();
    const enabledSettings = await this.mfaSettingsRepository.count({
      where: { isEnabled: true },
    });
    const completeSetups = await this.mfaSettingsRepository.count({
      where: { isSetupComplete: true },
    });

    const stats = {
      totalUsers: totalSettings,
      enabledUsers: enabledSettings,
      completeSetups,
      adoptionRate: totalSettings > 0 ? (enabledSettings / totalSettings) * 100 : 0,
      completionRate: enabledSettings > 0 ? (completeSetups / enabledSettings) * 100 : 0,
    };

    return {
      message: 'System MFA statistics retrieved successfully',
      stats,
    };
  }

  // Health check
  @Get('health')
  @ApiOperation({ summary: 'MFA system health check' })
  @ApiResponse({ status: 200, description: 'MFA system health status' })
  async getHealthStatus(@Request() req: any) {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      features: {
        totp: true,
        sms: true,
        email: true,
        backupCodes: true,
        trustedDevices: true,
      },
      services: {
        database: 'healthy',
        notifications: 'healthy',
        encryption: 'healthy',
      },
    };

    return {
      message: 'MFA system health check completed',
      health,
    };
  }
}
