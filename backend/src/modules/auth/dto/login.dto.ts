import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../modules/users/entities/user.entity';

export class LoginDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ 
    example: 'password123',
    description: 'User password (minimum 6 characters)'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Remember this device for extended session'
  })
  @IsOptional()
  @IsString()
  rememberDevice?: string;
}

export class RegisterDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ 
    example: 'password123',
    description: 'User password (minimum 6 characters)'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @ApiProperty({ 
    example: 'John Doe',
    description: 'User full name'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name!: string;

  @ApiPropertyOptional({ 
    example: 'customer',
    description: 'User role (defaults to customer if not provided)',
    enum: UserRole
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token to generate new access token'
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token'
  })
  accessToken!: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token for renewing access'
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'Authenticated user information'
  })
  user!: {
    id: string;
    email: string;
    name: string;
    role: string;
    creditLimit: number;
    availableCredit: number;
  };

  @ApiPropertyOptional({
    description: 'Session information'
  })
  session?: {
    sessionId: string;
    expiresAt: Date;
    deviceInfo: {
      userAgent: string;
      platform?: string;
      browser?: string;
      os?: string;
      isMobile?: boolean;
    };
  };
}

export class TokenRefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token'
  })
  accessToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logout successful',
    description: 'Logout confirmation message'
  })
  message!: string;
}

export class UserInfoResponseDto {
  @ApiProperty({
    example: 'uuid-string',
    description: 'User unique identifier'
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address'
  })
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name'
  })
  name!: string;

  @ApiProperty({
    example: 'customer',
    description: 'User role',
    enum: UserRole
  })
  role!: string;

  @ApiProperty({
    example: 5000,
    description: 'User credit limit'
  })
  creditLimit!: number;

  @ApiProperty({
    example: 4500,
    description: 'Available credit amount'
  })
  availableCredit!: number;

  @ApiProperty({
    example: true,
    description: 'Whether user account is active'
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    example: 'session-uuid',
    description: 'Current session identifier'
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'User permissions array'
  })
  permissions?: string[];

  @ApiProperty({
    description: 'Authentication context information'
  })
  authContext!: {
    requestId: string;
    authenticated: boolean;
    authType: string;
    lastActivity: Date;
  };

  @ApiPropertyOptional({
    description: 'Security flags and risk assessment'
  })
  securityFlags?: {
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    failedAttempts: number;
  };
}
