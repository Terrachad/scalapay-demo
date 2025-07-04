import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'User address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class NotificationPreferences {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({ description: 'Enable payment reminders' })
  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @ApiPropertyOptional({ description: 'Enable transaction updates' })
  @IsOptional()
  @IsBoolean()
  transactionUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Enable promotional messages' })
  @IsOptional()
  @IsBoolean()
  promotional?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Notification preferences' })
  @IsObject()
  preferences!: NotificationPreferences;
}

export class SecurityPreferences {
  @ApiPropertyOptional({ description: 'Enable two-factor authentication' })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Session timeout in minutes' })
  @IsOptional()
  sessionTimeout?: number;

  @ApiPropertyOptional({ description: 'Enable login notifications' })
  @IsOptional()
  @IsBoolean()
  loginNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable device verification' })
  @IsOptional()
  @IsBoolean()
  deviceVerification?: boolean;
}

export class UpdateSecurityPreferencesDto {
  @ApiProperty({ description: 'Security preferences' })
  @IsObject()
  preferences!: SecurityPreferences;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User role' })
  role: string;

  @ApiPropertyOptional({ description: 'User phone' })
  phone?: string;

  @ApiPropertyOptional({ description: 'User address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Emergency contact' })
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Credit limit' })
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Account status' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notification preferences' })
  notificationPreferences?: NotificationPreferences;

  @ApiPropertyOptional({ description: 'Security preferences' })
  securityPreferences?: SecurityPreferences;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  constructor(user: any) {
    this.id = user?.id;
    this.name = user?.name || '';
    this.email = user?.email || '';
    this.role = user?.role || 'customer';
    this.phone = user?.phone;
    this.address = user?.address;
    this.dateOfBirth = user?.dateOfBirth;
    this.emergencyContact = user?.emergencyContact;
    this.creditLimit = user?.creditLimit;
    this.isActive = user?.isActive;
    this.notificationPreferences = user?.notificationPreferences;
    this.securityPreferences = user?.securityPreferences;
    this.createdAt = user?.createdAt;
    this.updatedAt = user?.updatedAt;
  }
}
