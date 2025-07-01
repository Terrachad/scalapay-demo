import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  registrationSource?: string;
}

export interface UserCreditLimitUpdatedEvent {
  userId: string;
  oldLimit: number;
  newLimit: number;
  reason: string;
}

export interface UserSuspendedEvent {
  userId: string;
  reason: string;
  suspendedBy: string;
}

@Injectable()
export class UserEventHandler {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Handling user registered event: ${event.userId}`);

    try {
      // Log registration analytics
      this.logger.log(
        `User registration analytics: New user ${event.userId} registered with email ${event.email}`,
      );

      // Could trigger:
      // - Welcome email sequence
      // - Initial credit assessment
      // - Onboarding workflow
      // - KYC (Know Your Customer) process initiation

      // Example: Schedule welcome email
      this.logger.log(`Scheduling welcome email for user ${event.userId}`);
    } catch (error) {
      this.logger.error(`Error handling user registered event:`, error);
    }
  }

  @OnEvent('user.credit_limit_updated')
  async handleCreditLimitUpdated(event: UserCreditLimitUpdatedEvent): Promise<void> {
    this.logger.log(`Handling credit limit updated event: ${event.userId}`);

    try {
      // Log credit limit change analytics
      this.logger.log(
        `Credit limit analytics: User ${event.userId} limit changed from $${event.oldLimit} to $${event.newLimit}, reason: ${event.reason}`,
      );

      // Could trigger notification to user about limit change
      if (event.newLimit > event.oldLimit) {
        this.logger.log(
          `Credit limit increased for user ${event.userId} - consider sending congratulatory notification`,
        );
      } else {
        this.logger.log(
          `Credit limit decreased for user ${event.userId} - consider sending explanation notification`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling credit limit updated event:`, error);
    }
  }

  @OnEvent('user.suspended')
  async handleUserSuspended(event: UserSuspendedEvent): Promise<void> {
    this.logger.log(`Handling user suspended event: ${event.userId}`);

    try {
      // Log suspension analytics
      this.logger.warn(
        `User suspension analytics: User ${event.userId} suspended, reason: ${event.reason}, by: ${event.suspendedBy}`,
      );

      // Could trigger:
      // - Notification to user about suspension
      // - Cancellation of pending transactions
      // - Customer service ticket creation
      // - Legal/compliance workflow
    } catch (error) {
      this.logger.error(`Error handling user suspended event:`, error);
    }
  }

  @OnEvent('user.login')
  async handleUserLogin(event: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    this.logger.log(`Handling user login event: ${event.userId}`);

    try {
      // Update last login timestamp
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // In a real implementation, you might have a lastLoginAt field
        this.logger.log(`User ${event.userId} logged in from IP: ${event.ipAddress}`);

        // Could check for suspicious login patterns
        if (this.isSuspiciousLogin(event.ipAddress, event.userAgent)) {
          this.logger.warn(`Suspicious login detected for user ${event.userId}`);
          // Could trigger additional verification
        }
      }
    } catch (error) {
      this.logger.error(`Error handling user login event:`, error);
    }
  }

  @OnEvent('user.password_changed')
  async handlePasswordChanged(event: {
    userId: string;
    changedBy: 'user' | 'admin' | 'reset';
  }): Promise<void> {
    this.logger.log(`Handling password changed event: ${event.userId}`);

    try {
      // Log security event
      this.logger.log(
        `Security analytics: User ${event.userId} password changed by ${event.changedBy}`,
      );

      // Could trigger:
      // - Security notification to user
      // - Session invalidation
      // - Security audit log entry
    } catch (error) {
      this.logger.error(`Error handling password changed event:`, error);
    }
  }

  @OnEvent('user.account_locked')
  async handleAccountLocked(event: {
    userId: string;
    reason: string;
    lockDuration?: number;
  }): Promise<void> {
    this.logger.log(`Handling account locked event: ${event.userId}`);

    try {
      // Log security event
      this.logger.warn(
        `Security analytics: User ${event.userId} account locked, reason: ${event.reason}`,
      );

      // Could trigger:
      // - Notification to user
      // - Customer service alert
      // - Automatic unlock timer
    } catch (error) {
      this.logger.error(`Error handling account locked event:`, error);
    }
  }

  @OnEvent('user.kyc_completed')
  async handleKYCCompleted(event: {
    userId: string;
    kycLevel: 'basic' | 'enhanced' | 'premium';
  }): Promise<void> {
    this.logger.log(`Handling KYC completed event: ${event.userId}`);

    try {
      // Update user permissions based on KYC level
      const user = await this.userRepository.findOne({ where: { id: event.userId } });
      if (user) {
        // Could update credit limits, transaction limits, etc. based on KYC level
        this.logger.log(
          `KYC ${event.kycLevel} completed for user ${event.userId} - consider updating limits`,
        );

        switch (event.kycLevel) {
          case 'basic':
            // Basic verification - keep current limits
            break;
          case 'enhanced':
            // Enhanced verification - could increase limits
            if (Number(user.creditLimit) < 7500) {
              user.creditLimit = 7500;
              user.availableCredit =
                Number(user.availableCredit) + (7500 - Number(user.creditLimit));
              await this.userRepository.save(user);
            }
            break;
          case 'premium':
            // Premium verification - highest limits
            if (Number(user.creditLimit) < 15000) {
              user.creditLimit = 15000;
              user.availableCredit =
                Number(user.availableCredit) + (15000 - Number(user.creditLimit));
              await this.userRepository.save(user);
            }
            break;
        }
      }
    } catch (error) {
      this.logger.error(`Error handling KYC completed event:`, error);
    }
  }

  private isSuspiciousLogin(ipAddress?: string, userAgent?: string): boolean {
    // Simple suspicious login detection
    if (!ipAddress || !userAgent) return false;

    // Check for known suspicious patterns
    const suspiciousIPs = ['127.0.0.1']; // Mock suspicious IPs
    const suspiciousUserAgents = ['bot', 'crawler', 'scraper'];

    return (
      suspiciousIPs.includes(ipAddress) ||
      suspiciousUserAgents.some((pattern) => userAgent.toLowerCase().includes(pattern))
    );
  }
}
