import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsCacheService {
  private readonly logger = new Logger(SettingsCacheService.name);
  private readonly localCache = new Map<string, { value: any; expiry: number }>();

  constructor(
    private readonly configService: ConfigService
  ) {
    // Clean up expired local cache entries every minute
    setInterval(() => this.cleanupLocalCache(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try local cache first (fastest)
    const localValue = this.getFromLocalCache<T>(key);
    if (localValue !== null) {
      return localValue;
    }

    // For now, we'll use a simple in-memory cache
    // In production, this would integrate with Redis
    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // Set in local cache
    this.setLocalCache(key, value, Math.min(ttlSeconds, 300)); // Max 5 minutes local
    
    // In production, this would also set in Redis
    this.logger.debug(`Cached setting: ${key} for ${ttlSeconds} seconds`);
  }

  async del(key: string): Promise<void> {
    // Remove from local cache
    this.localCache.delete(key);

    // Handle wildcard deletion for local cache
    if (key.includes('*')) {
      const pattern = key.replace('*', '');
      for (const [localKey] of this.localCache) {
        if (localKey.includes(pattern)) {
          this.localCache.delete(localKey);
        }
      }
    }
    
    this.logger.debug(`Invalidated cache for: ${key}`);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear related local cache entries
    for (const [localKey] of this.localCache) {
      if (localKey.includes(pattern.replace('*', ''))) {
        this.localCache.delete(localKey);
      }
    }
    
    this.logger.debug(`Invalidated cache pattern: ${pattern}`);
  }

  private getFromLocalCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.value;
    }
    
    if (entry) {
      this.localCache.delete(key); // Remove expired entry
    }
    
    return null;
  }

  private setLocalCache(key: string, value: any, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.localCache.set(key, { value, expiry });
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache) {
      if (entry.expiry <= now) {
        this.localCache.delete(key);
      }
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      // Test cache functionality
      const testKey = 'health-check-test';
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, 5);
      const retrieved = await this.get(testKey);
      await this.del(testKey);
      
      return retrieved !== null;
    } catch {
      return false;
    }
  }
}