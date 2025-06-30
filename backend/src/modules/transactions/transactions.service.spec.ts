import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { ScalaPayWebSocketGateway } from '../websocket/websocket.gateway';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: Repository<Transaction>;
  let wsGateway: ScalaPayWebSocketGateway;

  const mockTransaction = {
    id: 'trans-123',
    amount: 100,
    status: TransactionStatus.PENDING,
    user: { id: 'user-123' },
    merchant: { id: 'merchant-123' },
    payments: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockWsGateway = {
    emitTransactionUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
        {
          provide: ScalaPayWebSocketGateway,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    wsGateway = module.get<ScalaPayWebSocketGateway>(ScalaPayWebSocketGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction and emit update', async () => {
      const createData = {
        amount: 100,
        user: { id: 'user-123' },
        merchant: { id: 'merchant-123' },
      };

      mockRepository.create.mockReturnValue(mockTransaction);
      mockRepository.save.mockResolvedValue(mockTransaction);

      const result = await service.create(createData as any);

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.create).toHaveBeenCalledWith(createData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTransaction);
      expect(mockWsGateway.emitTransactionUpdate).toHaveBeenCalledWith(
        'user-123',
        mockTransaction
      );
    });
  });

  describe('findByUser', () => {
    it('should return user transactions sorted by date', async () => {
      const transactions = [mockTransaction];
      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.findByUser('user-123');

      expect(result).toEqual(transactions);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-123' } },
        relations: ['merchant', 'payments'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status and emit update', async () => {
      const updatedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.APPROVED,
      };

      mockRepository.findOne.mockResolvedValue(mockTransaction);
      mockRepository.save.mockResolvedValue(updatedTransaction);

      const result = await service.updateStatus('trans-123', TransactionStatus.APPROVED);

      expect(result).toEqual(updatedTransaction);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        relations: ['user'],
      });
      expect(mockWsGateway.emitTransactionUpdate).toHaveBeenCalledWith(
        'user-123',
        updatedTransaction
      );
    });
  });
});
