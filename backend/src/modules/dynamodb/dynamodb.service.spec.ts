import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from './dynamodb.service';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('DynamoDBService', () => {
  let service: DynamoDBService;
  let configService: ConfigService;
  let mockDocClient: jest.Mocked<DynamoDBDocumentClient>;
  let mockSend: jest.Mock;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockSend = jest.fn();
    mockDocClient = {
      send: mockSend,
    } as any;

    (DynamoDBClient as jest.Mock).mockImplementation(() => ({}));
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDocClient);

    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'database.dynamodb.endpoint': 'http://localhost:8000',
        'database.dynamodb.region': 'us-east-1',
        'database.dynamodb.accessKeyId': 'test-access-key',
        'database.dynamodb.secretAccessKey': 'test-secret-key',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDBService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DynamoDBService>(DynamoDBService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create DynamoDB client with credentials when provided', () => {
      expect(DynamoDBClient).toHaveBeenCalledWith({
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
      expect(DynamoDBDocumentClient.from).toHaveBeenCalled();
    });

    it('should create DynamoDB client without credentials when not provided', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'database.dynamodb.endpoint': 'http://localhost:8000',
          'database.dynamodb.region': 'us-east-1',
          'database.dynamodb.accessKeyId': null,
          'database.dynamodb.secretAccessKey': null,
        };
        return config[key];
      });

      // Create a new instance to test without credentials
      new DynamoDBService(configService);

      expect(DynamoDBClient).toHaveBeenCalledWith({
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      });
    });
  });

  describe('onModuleInit', () => {
    it('should complete without errors', async () => {
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('putItem', () => {
    it('should put an item to DynamoDB table', async () => {
      const tableName = 'test-table';
      const item = { id: '123', name: 'Test Item' };

      mockSend.mockResolvedValue({});

      await service.putItem(tableName, item);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand));
      expect(PutCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Item: item,
      });
    });

    it('should handle put item errors', async () => {
      const tableName = 'test-table';
      const item = { id: '123', name: 'Test Item' };
      const error = new Error('DynamoDB error');

      mockSend.mockRejectedValue(error);

      await expect(service.putItem(tableName, item)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getItem', () => {
    it('should get an item from DynamoDB table', async () => {
      const tableName = 'test-table';
      const key = { id: '123' };
      const expectedItem = { id: '123', name: 'Test Item' };

      mockSend.mockResolvedValue({ Item: expectedItem });

      const result = await service.getItem(tableName, key);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand));
      expect(GetCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Key: key,
      });
      expect(result).toEqual(expectedItem);
    });

    it('should return undefined when item not found', async () => {
      const tableName = 'test-table';
      const key = { id: '123' };

      mockSend.mockResolvedValue({});

      const result = await service.getItem(tableName, key);

      expect(result).toBeUndefined();
    });

    it('should handle get item errors', async () => {
      const tableName = 'test-table';
      const key = { id: '123' };
      const error = new Error('DynamoDB error');

      mockSend.mockRejectedValue(error);

      await expect(service.getItem(tableName, key)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('query', () => {
    it('should query items from DynamoDB table', async () => {
      const params = {
        TableName: 'test-table',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '123' },
      };
      const expectedItems = [
        { id: '123', name: 'Item 1' },
        { id: '123', name: 'Item 2' },
      ];

      mockSend.mockResolvedValue({ Items: expectedItems });

      const result = await service.query(params);

      expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
      expect(QueryCommand).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedItems);
    });

    it('should return empty array when no items found', async () => {
      const params = {
        TableName: 'test-table',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '123' },
      };

      mockSend.mockResolvedValue({});

      const result = await service.query(params);

      expect(result).toEqual([]);
    });

    it('should return empty array when Items is undefined', async () => {
      const params = {
        TableName: 'test-table',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '123' },
      };

      mockSend.mockResolvedValue({ Items: undefined });

      const result = await service.query(params);

      expect(result).toEqual([]);
    });

    it('should handle query errors', async () => {
      const params = {
        TableName: 'test-table',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '123' },
      };
      const error = new Error('DynamoDB error');

      mockSend.mockRejectedValue(error);

      await expect(service.query(params)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('configuration scenarios', () => {
    it('should handle missing endpoint configuration', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'database.dynamodb.endpoint': undefined,
          'database.dynamodb.region': 'us-east-1',
          'database.dynamodb.accessKeyId': 'test-access-key',
          'database.dynamodb.secretAccessKey': 'test-secret-key',
        };
        return config[key];
      });

      new DynamoDBService(configService);

      expect(DynamoDBClient).toHaveBeenCalledWith({
        endpoint: undefined,
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should handle partial credentials (only accessKeyId)', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'database.dynamodb.endpoint': 'http://localhost:8000',
          'database.dynamodb.region': 'us-east-1',
          'database.dynamodb.accessKeyId': 'test-access-key',
          'database.dynamodb.secretAccessKey': null,
        };
        return config[key];
      });

      new DynamoDBService(configService);

      expect(DynamoDBClient).toHaveBeenCalledWith({
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      });
    });
  });
});