import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;
  let mockRedis: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      incr: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'database.redis.host': 'localhost',
        'database.redis.port': 6379,
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client with correct configuration', () => {
      service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should handle different host and port configurations', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'database.redis.host': 'redis.example.com',
          'database.redis.port': 6380,
        };
        return config[key];
      });

      service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'redis.example.com',
        port: 6380,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis client', () => {
      service.onModuleInit();
      service.onModuleDestroy();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should get value from Redis', async () => {
      const key = 'test-key';
      const expectedValue = 'test-value';
      mockRedis.get.mockResolvedValue(expectedValue);

      const result = await service.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBe(expectedValue);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      const key = 'test-key';
      const error = new Error('Redis connection error');
      mockRedis.get.mockRejectedValue(error);

      await expect(service.get(key)).rejects.toThrow('Redis connection error');
    });
  });

  describe('set', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should set value in Redis without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, value);
    });

    it('should set value in Redis with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 300;
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedis.set).toHaveBeenCalledWith(key, value, 'EX', ttl);
    });

    it('should handle Redis set errors', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const error = new Error('Redis set error');
      mockRedis.set.mockRejectedValue(error);

      await expect(service.set(key, value)).rejects.toThrow('Redis set error');
    });
  });

  describe('del', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should delete key from Redis', async () => {
      const key = 'test-key';
      mockRedis.del.mockResolvedValue(1);

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should handle Redis delete errors', async () => {
      const key = 'test-key';
      const error = new Error('Redis delete error');
      mockRedis.del.mockRejectedValue(error);

      await expect(service.del(key)).rejects.toThrow('Redis delete error');
    });
  });

  describe('hget', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should get hash field value from Redis', async () => {
      const key = 'test-hash';
      const field = 'test-field';
      const expectedValue = 'test-value';
      mockRedis.hget.mockResolvedValue(expectedValue);

      const result = await service.hget(key, field);

      expect(mockRedis.hget).toHaveBeenCalledWith(key, field);
      expect(result).toBe(expectedValue);
    });

    it('should return null when hash field does not exist', async () => {
      const key = 'test-hash';
      const field = 'non-existent-field';
      mockRedis.hget.mockResolvedValue(null);

      const result = await service.hget(key, field);

      expect(mockRedis.hget).toHaveBeenCalledWith(key, field);
      expect(result).toBeNull();
    });

    it('should handle Redis hget errors', async () => {
      const key = 'test-hash';
      const field = 'test-field';
      const error = new Error('Redis hget error');
      mockRedis.hget.mockRejectedValue(error);

      await expect(service.hget(key, field)).rejects.toThrow('Redis hget error');
    });
  });

  describe('hset', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should set hash field value in Redis', async () => {
      const key = 'test-hash';
      const field = 'test-field';
      const value = 'test-value';
      mockRedis.hset.mockResolvedValue(1);

      await service.hset(key, field, value);

      expect(mockRedis.hset).toHaveBeenCalledWith(key, field, value);
    });

    it('should handle Redis hset errors', async () => {
      const key = 'test-hash';
      const field = 'test-field';
      const value = 'test-value';
      const error = new Error('Redis hset error');
      mockRedis.hset.mockRejectedValue(error);

      await expect(service.hset(key, field, value)).rejects.toThrow('Redis hset error');
    });
  });

  describe('incr', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should increment counter in Redis', async () => {
      const key = 'counter-key';
      const expectedValue = 1;
      mockRedis.incr.mockResolvedValue(expectedValue);

      const result = await service.incr(key);

      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(result).toBe(expectedValue);
    });

    it('should increment existing counter', async () => {
      const key = 'counter-key';
      const expectedValue = 5;
      mockRedis.incr.mockResolvedValue(expectedValue);

      const result = await service.incr(key);

      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(result).toBe(expectedValue);
    });

    it('should handle Redis incr errors', async () => {
      const key = 'counter-key';
      const error = new Error('Redis incr error');
      mockRedis.incr.mockRejectedValue(error);

      await expect(service.incr(key)).rejects.toThrow('Redis incr error');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should handle multiple operations in sequence', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(value);
      mockRedis.del.mockResolvedValue(1);

      await service.set(key, value);
      const retrieved = await service.get(key);
      await service.del(key);

      expect(retrieved).toBe(value);
      expect(mockRedis.set).toHaveBeenCalledWith(key, value);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should handle hash operations in sequence', async () => {
      const key = 'test-hash';
      const field = 'test-field';
      const value = 'test-value';

      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue(value);

      await service.hset(key, field, value);
      const retrieved = await service.hget(key, field);

      expect(retrieved).toBe(value);
      expect(mockRedis.hset).toHaveBeenCalledWith(key, field, value);
      expect(mockRedis.hget).toHaveBeenCalledWith(key, field);
    });
  });
});