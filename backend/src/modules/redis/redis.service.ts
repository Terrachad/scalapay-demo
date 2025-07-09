import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly debugEnabled = process.env.NODE_ENV === 'development';
  private redis!: Redis;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.logger.log('🔴 RedisService constructor called');
  }

  onModuleInit() {
    const host = this.configService.get('database.redis.host');
    const port = this.configService.get('database.redis.port');

    this.logger.log('🔴 ═══════════════════════════════════════════════════════');
    this.logger.log('🔴 🚀 Redis Service Initialization Started');
    this.logger.log(`🔴 📍 Redis host: ${host}`);
    this.logger.log(`🔴 📍 Redis port: ${port}`);
    this.logger.log(`🔴 🐛 Debug mode: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);

    try {
      this.redis = new Redis({
        host,
        port,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // Event handlers for connection monitoring
      this.redis.on('connect', () => {
        this.logger.log('🔴 ✅ Redis connection established');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        this.logger.log('🔴 ✅ Redis ready to accept commands');
      });

      this.redis.on('error', (error) => {
        this.logger.error('🔴 ❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.logger.warn('🔴 ⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('🔴 🔄 Redis reconnecting...');
      });

      this.logger.log('🔴 ✅ Redis client created successfully');
      this.logger.log('🔴 ═══════════════════════════════════════════════════════');
    } catch (error) {
      this.logger.error('🔴 💥 Failed to create Redis client:', error);
      throw error;
    }
  }

  onModuleDestroy() {
    this.logger.log('🔴 🔄 Redis Service shutting down...');
    try {
      if (this.redis) {
        this.redis.disconnect();
        this.isConnected = false;
        this.logger.log('🔴 ✅ Redis disconnected successfully');
      }
    } catch (error) {
      this.logger.error('🔴 ❌ Error during Redis disconnect:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 GET operation started', { key });
      const result = await this.redis.get(key);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ GET operation completed', {
        key,
        hasValue: !!result,
        valueLength: result?.length || 0,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ GET operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 SET operation started', {
        key,
        valueLength: value.length,
        ttl: ttl || 'none',
      });

      if (ttl) {
        await this.redis.set(key, value, 'EX', ttl);
      } else {
        await this.redis.set(key, value);
      }

      const duration = Date.now() - startTime;
      this.debugLog('🔴 ✅ SET operation completed', {
        key,
        valueLength: value.length,
        ttl: ttl || 'none',
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ SET operation failed', {
        key,
        valueLength: value.length,
        ttl: ttl || 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 DEL operation started', { key });
      await this.redis.del(key);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ DEL operation completed', {
        key,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ DEL operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 HGET operation started', { key, field });
      const result = await this.redis.hget(key, field);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ HGET operation completed', {
        key,
        field,
        hasValue: !!result,
        valueLength: result?.length || 0,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ HGET operation failed', {
        key,
        field,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 HSET operation started', {
        key,
        field,
        valueLength: value.length,
      });

      await this.redis.hset(key, field, value);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ HSET operation completed', {
        key,
        field,
        valueLength: value.length,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ HSET operation failed', {
        key,
        field,
        valueLength: value.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 INCR operation started', { key });
      const result = await this.redis.incr(key);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ INCR operation completed', {
        key,
        newValue: result,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ INCR operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 SETEX operation started', {
        key,
        seconds,
        valueLength: value.length,
      });

      await this.redis.setex(key, seconds, value);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ SETEX operation completed', {
        key,
        seconds,
        valueLength: value.length,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ SETEX operation failed', {
        key,
        seconds,
        valueLength: value.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    const startTime = Date.now();

    try {
      this.debugLog('🔴 EXPIRE operation started', { key, seconds });
      await this.redis.expire(key, seconds);
      const duration = Date.now() - startTime;

      this.debugLog('🔴 ✅ EXPIRE operation completed', {
        key,
        seconds,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔴 ❌ EXPIRE operation failed', {
        key,
        seconds,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  // Health check method for monitoring
  async isHealthy(): Promise<boolean> {
    try {
      this.debugLog('🔴 Health check started');
      await this.redis.ping();
      this.debugLog('🔴 ✅ Health check passed');
      return true;
    } catch (error) {
      this.logger.error('🔴 ❌ Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isConnected: this.isConnected,
      });
      return false;
    }
  }

  // Connection status
  getConnectionStatus(): { connected: boolean; ready: boolean } {
    return {
      connected: this.isConnected,
      ready: this.redis?.status === 'ready',
    };
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugEnabled) {
      this.logger.debug(`${message}`, data);
    }
  }
}
