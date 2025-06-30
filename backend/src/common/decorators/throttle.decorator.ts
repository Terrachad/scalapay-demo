import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number;
  skipIf?: (context: any) => boolean;
}

export const CustomThrottle = (options: ThrottleOptions) => 
  SetMetadata(THROTTLE_KEY, options);