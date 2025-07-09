import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { UserMFASettings, MFAAttempt, TrustedDevice } from '../entities/user-mfa-settings.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../shared/services/notification.service';

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerificationResult {
  success: boolean;
  method: string;
  requiresAdditionalVerification?: boolean;
  trustedDeviceToken?: string;
  nextStep?: 'setup_backup_codes' | 'choose_additional_method';
  attemptsRemaining?: number;
}

export interface MFAVerificationRequest {
  userId: string;
  method: 'totp' | 'sms' | 'email' | 'backup_code';
  code: string;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    operatingSystem?: string;
    ipAddress: string;
    userAgent: string;
  };
  rememberDevice?: boolean;
}

export interface SMSVerificationRequest {
  userId: string;
  phoneNumber: string;
}

export interface EmailVerificationRequest {
  userId: string;
  emailAddress: string;
}

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);

  constructor(
    @InjectRepository(UserMFASettings)
    private mfaSettingsRepository: Repository<UserMFASettings>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {}

  // TOTP (Time-based One-Time Password) methods
  async setupTOTP(userId: string): Promise<TOTPSetupResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      const defaultSettings = UserMFASettings.createDefaultSettings(userId);
      mfaSettings = this.mfaSettingsRepository.create(defaultSettings);
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('TOTP_ISSUER_NAME', 'ScalaPay')} (${user.email})`,
      issuer: this.configService.get('TOTP_ISSUER_NAME', 'ScalaPay'),
      length: 32,
    });

    // Store encrypted secret
    mfaSettings.totpSecret = this.encryptSecret(secret.base32);
    mfaSettings.enabledMethods.totp = false; // Will be enabled after verification

    // Generate backup codes
    const backupCodes = mfaSettings.generateBackupCodes(10);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`TOTP setup initiated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32,
    };
  }

  async verifyTOTPSetup(userId: string, token: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.totpSecret) {
      throw new BadRequestException('TOTP not set up for this user');
    }

    const secret = this.decryptSecret(mfaSettings.totpSecret);
    const verified = speakeasy.totp.verify({
      secret,
      token,
      window: this.configService.get('TOTP_WINDOW', 1),
    });

    if (verified) {
      mfaSettings.enabledMethods.totp = true;
      mfaSettings.isEnabled = true;
      mfaSettings.isSetupComplete = true;
      await this.mfaSettingsRepository.save(mfaSettings);

      this.logger.log(`TOTP setup completed for user ${userId}`);
      return true;
    }

    return false;
  }

  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.enabledMethods.totp || !mfaSettings.totpSecret) {
      throw new BadRequestException('TOTP not enabled for this user');
    }

    if (mfaSettings.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked due to too many failed attempts');
    }

    const secret = this.decryptSecret(mfaSettings.totpSecret);
    const verified = speakeasy.totp.verify({
      secret,
      token,
      window: this.configService.get('TOTP_WINDOW', 1),
    });

    // Record attempt
    const attempt: MFAAttempt = {
      method: 'totp',
      timestamp: new Date(),
      success: verified,
      ipAddress: 'unknown', // Would be passed from controller
      userAgent: 'unknown', // Would be passed from controller
    };

    mfaSettings.recordMFAAttempt(attempt);
    await this.mfaSettingsRepository.save(mfaSettings);

    return verified;
  }

  // SMS MFA methods
  async setupSMS(request: SMSVerificationRequest): Promise<{ verificationId: string }> {
    const mfaSettings = await this.findOrCreateMFASettings(request.userId);

    // Store phone number (would validate format in production)
    mfaSettings.phoneNumber = request.phoneNumber;

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationId = crypto.randomUUID();

    // Store verification code temporarily (in production, use Redis with TTL)
    // For now, we'll use a simple in-memory approach

    // Send SMS (would integrate with Twilio or similar)
    await this.sendSMSVerificationCode(request.phoneNumber, verificationCode);

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`SMS verification sent to user ${request.userId}`);

    return { verificationId };
  }

  async verifySMS(userId: string, code: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.phoneNumber) {
      throw new BadRequestException('SMS not set up for this user');
    }

    if (mfaSettings.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked due to too many failed attempts');
    }

    // Verify code (in production, would check against stored code with TTL)
    const verified = await this.verifySMSCode(mfaSettings.phoneNumber, code);

    if (verified) {
      mfaSettings.enabledMethods.sms = true;
      mfaSettings.isEnabled = true;

      if (!mfaSettings.isSetupComplete) {
        mfaSettings.isSetupComplete = true;
      }
    }

    // Record attempt
    const attempt: MFAAttempt = {
      method: 'sms',
      timestamp: new Date(),
      success: verified,
      ipAddress: 'unknown',
      userAgent: 'unknown',
    };

    mfaSettings.recordMFAAttempt(attempt);
    await this.mfaSettingsRepository.save(mfaSettings);

    return verified;
  }

  // Email MFA methods
  async setupEmail(request: EmailVerificationRequest): Promise<{ verificationId: string }> {
    const mfaSettings = await this.findOrCreateMFASettings(request.userId);

    mfaSettings.emailAddress = request.emailAddress;

    const verificationCode = this.generateVerificationCode();
    const verificationId = crypto.randomUUID();

    // Send email verification
    await this.sendEmailVerificationCode(request.emailAddress, verificationCode);

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`Email verification sent to user ${request.userId}`);

    return { verificationId };
  }

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.emailAddress) {
      throw new BadRequestException('Email MFA not set up for this user');
    }

    if (mfaSettings.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked due to too many failed attempts');
    }

    // Verify code
    const verified = await this.verifyEmailCode(mfaSettings.emailAddress, code);

    if (verified) {
      mfaSettings.enabledMethods.email = true;
      mfaSettings.isEnabled = true;

      if (!mfaSettings.isSetupComplete) {
        mfaSettings.isSetupComplete = true;
      }
    }

    // Record attempt
    const attempt: MFAAttempt = {
      method: 'email',
      timestamp: new Date(),
      success: verified,
      ipAddress: 'unknown',
      userAgent: 'unknown',
    };

    mfaSettings.recordMFAAttempt(attempt);
    await this.mfaSettingsRepository.save(mfaSettings);

    return verified;
  }

  // Backup codes methods
  async generateBackupCodes(userId: string): Promise<string[]> {
    const mfaSettings = await this.findOrCreateMFASettings(userId);

    const backupCodes = mfaSettings.generateBackupCodes(10);
    mfaSettings.enabledMethods.backupCodes = true;

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`Backup codes generated for user ${userId}`);

    return backupCodes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.enabledMethods.backupCodes) {
      throw new BadRequestException('Backup codes not enabled for this user');
    }

    if (mfaSettings.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked due to too many failed attempts');
    }

    const verified = mfaSettings.useBackupCode(code);

    // Record attempt
    const attempt: MFAAttempt = {
      method: 'backup_codes',
      timestamp: new Date(),
      success: verified,
      ipAddress: 'unknown',
      userAgent: 'unknown',
    };

    mfaSettings.recordMFAAttempt(attempt);
    await this.mfaSettingsRepository.save(mfaSettings);

    return verified;
  }

  // Unified verification method
  async verifyMFA(request: MFAVerificationRequest): Promise<MFAVerificationResult> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({
      where: { userId: request.userId },
    });

    if (!mfaSettings || !mfaSettings.isEnabled) {
      throw new BadRequestException('MFA not enabled for this user');
    }

    if (mfaSettings.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked due to too many failed attempts');
    }

    let verified = false;

    switch (request.method) {
      case 'totp':
        verified = await this.verifyTOTP(request.userId, request.code);
        break;
      case 'sms':
        verified = await this.verifySMS(request.userId, request.code);
        break;
      case 'email':
        verified = await this.verifyEmail(request.userId, request.code);
        break;
      case 'backup_code':
        verified = await this.verifyBackupCode(request.userId, request.code);
        break;
      default:
        throw new BadRequestException('Invalid MFA method');
    }

    const result: MFAVerificationResult = {
      success: verified,
      method: request.method,
      attemptsRemaining: Math.max(
        0,
        (mfaSettings.securitySettings?.maxFailedAttempts || 5) - mfaSettings.failedAttempts,
      ),
    };

    // Handle trusted device if verification successful
    if (verified && request.deviceInfo && request.rememberDevice) {
      const trustedDeviceToken = await this.addTrustedDevice(mfaSettings, request.deviceInfo);
      result.trustedDeviceToken = trustedDeviceToken;
    }

    // Suggest next steps
    if (verified && !mfaSettings.hasUnusedBackupCodes()) {
      result.nextStep = 'setup_backup_codes';
    }

    return result;
  }

  // Trusted device management
  async addTrustedDevice(
    mfaSettings: UserMFASettings,
    deviceInfo: MFAVerificationRequest['deviceInfo'],
  ): Promise<string> {
    if (!deviceInfo) {
      throw new BadRequestException('Device information required');
    }

    const trustedDevice: TrustedDevice = {
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      firstTrusted: new Date(),
      lastUsed: new Date(),
      isActive: true,
      trustExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    mfaSettings.addTrustedDevice(trustedDevice);
    await this.mfaSettingsRepository.save(mfaSettings);

    // Generate token for this trusted device
    const token = this.generateTrustedDeviceToken(deviceInfo.deviceId, mfaSettings.userId);

    this.logger.log(
      `Trusted device added for user ${mfaSettings.userId}: ${deviceInfo.deviceName}`,
    );

    return token;
  }

  async isTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) return false;

    return mfaSettings.isDeviceTrusted(deviceId);
  }

  async revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      throw new BadRequestException('MFA settings not found');
    }

    mfaSettings.revokeTrustedDevice(deviceId);
    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`Trusted device revoked for user ${userId}: ${deviceId}`);
  }

  async revokeAllTrustedDevices(userId: string): Promise<void> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      throw new BadRequestException('MFA settings not found');
    }

    mfaSettings.revokeAllTrustedDevices();
    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`All trusted devices revoked for user ${userId}`);
  }

  // Account management
  async getMFASettings(userId: string): Promise<{
    isEnabled: boolean;
    isSetupComplete: boolean;
    enabledMethods: string[];
    availableMethods: string[];
    securityScore: number;
    trustedDevices: number;
    hasBackupCodes: boolean;
    accountStatus: 'active' | 'locked';
  }> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      const defaultSettings = UserMFASettings.createDefaultSettings(userId);
      return {
        isEnabled: false,
        isSetupComplete: false,
        enabledMethods: [],
        availableMethods: ['totp', 'sms', 'email'],
        securityScore: 0,
        trustedDevices: 0,
        hasBackupCodes: false,
        accountStatus: 'active',
      };
    }

    return {
      isEnabled: mfaSettings.isEnabled,
      isSetupComplete: mfaSettings.isSetupComplete,
      enabledMethods: mfaSettings.getAvailableMethods(),
      availableMethods: ['totp', 'sms', 'email', 'backup_codes'],
      securityScore: mfaSettings.getSecurityScore(),
      trustedDevices: mfaSettings.trustedDevices?.length || 0,
      hasBackupCodes: mfaSettings.hasUnusedBackupCodes(),
      accountStatus: mfaSettings.isAccountLocked() ? 'locked' : 'active',
    };
  }

  async disableMFA(userId: string): Promise<void> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      throw new BadRequestException('MFA settings not found');
    }

    mfaSettings.isEnabled = false;
    mfaSettings.isSetupComplete = false;
    mfaSettings.enabledMethods = {
      totp: false,
      sms: false,
      email: false,
      backupCodes: false,
    };

    // Clear sensitive data
    mfaSettings.totpSecret = undefined;
    mfaSettings.backupCodes = undefined;
    mfaSettings.revokeAllTrustedDevices();

    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`MFA disabled for user ${userId}`);
  }

  async unlockAccount(userId: string): Promise<void> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      throw new BadRequestException('MFA settings not found');
    }

    mfaSettings.unlockAccount();
    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`Account unlocked for user ${userId}`);
  }

  // Helper methods
  private async findOrCreateMFASettings(userId: string): Promise<UserMFASettings> {
    let mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      const defaultSettings = UserMFASettings.createDefaultSettings(userId);
      mfaSettings = this.mfaSettingsRepository.create(defaultSettings);
      await this.mfaSettingsRepository.save(mfaSettings);
    }

    return mfaSettings;
  }

  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.configService.get('MFA_ENCRYPTION_KEY') || 'default-key-change-in-production';
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.configService.get('MFA_ENCRYPTION_KEY') || 'default-key-change-in-production';

    const [ivHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateTrustedDeviceToken(deviceId: string, userId: string): string {
    const payload = { deviceId, userId, timestamp: Date.now() };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private async sendSMSVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // In production, integrate with SMS provider like Twilio
    this.logger.log(`SMS verification code ${code} would be sent to ${phoneNumber}`);

    // Placeholder for SMS integration
    try {
      await this.notificationService.sendSMSVerificationCode(phoneNumber, code);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw new BadRequestException('Failed to send SMS verification code');
    }
  }

  private async sendEmailVerificationCode(email: string, code: string): Promise<void> {
    this.logger.log(`Email verification code ${code} would be sent to ${email}`);

    try {
      await this.notificationService.sendEmailVerificationCode(email, code);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      throw new BadRequestException('Failed to send email verification code');
    }
  }

  private async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    // In production, verify against stored code with TTL
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(code);
  }

  private async verifyEmailCode(email: string, code: string): Promise<boolean> {
    // In production, verify against stored code with TTL
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(code);
  }

  // Maintenance methods
  async cleanupExpiredData(): Promise<{
    expiredDevicesRemoved: number;
    lockedAccountsProcessed: number;
  }> {
    let expiredDevicesRemoved = 0;
    let lockedAccountsProcessed = 0;

    const allMFASettings = await this.mfaSettingsRepository.find();

    for (const settings of allMFASettings) {
      let updated = false;

      // Cleanup expired trusted devices
      const initialDeviceCount = settings.trustedDevices?.length || 0;
      settings.cleanupExpiredDevices();
      const finalDeviceCount = settings.trustedDevices?.length || 0;
      expiredDevicesRemoved += initialDeviceCount - finalDeviceCount;

      if (initialDeviceCount !== finalDeviceCount) {
        updated = true;
      }

      // Process locked accounts (auto-unlock after lockout period)
      if (settings.isAccountLocked()) {
        const lockoutDuration = settings.securitySettings?.lockoutDuration || 30; // minutes
        const lockoutExpiry = new Date(
          settings.lockedUntil!.getTime() + lockoutDuration * 60 * 1000,
        );

        if (new Date() > lockoutExpiry) {
          settings.unlockAccount();
          lockedAccountsProcessed++;
          updated = true;
        }
      }

      if (updated) {
        await this.mfaSettingsRepository.save(settings);
      }
    }

    this.logger.log(
      `MFA cleanup completed: ${expiredDevicesRemoved} devices removed, ${lockedAccountsProcessed} accounts unlocked`,
    );

    return {
      expiredDevicesRemoved,
      lockedAccountsProcessed,
    };
  }
}
