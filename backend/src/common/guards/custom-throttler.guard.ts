import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(options: any, storageService: any, reflector: Reflector) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as default tracker
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;

    // For authenticated users, use user ID for more accurate rate limiting
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return ip;
  }

  protected async getErrorMessage(): Promise<string> {
    return 'Too many requests. Please try again later.';
  }
}
