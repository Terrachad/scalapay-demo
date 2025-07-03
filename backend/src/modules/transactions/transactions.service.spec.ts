import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { ScalaPayWebSocketGateway } from '../websocket/websocket.gateway';
import { TransactionRepository } from './repositories/transaction.repository';
import { BusinessRulesService } from './services/business-rules.service';
import { PaymentSchedulerService } from './services/payment-scheduler.service';
import { TransactionStateMachineService } from './services/transaction-state-machine.service';
import { StripeService } from '../payments/services/stripe.service';

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

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTransactionRepository = {
    findWithFilters: jest.fn(),
  };

  const mockBusinessRulesService = {
    validateTransactionCreation: jest.fn(),
    validateStatusTransition: jest.fn(),
  };

  const mockPaymentSchedulerService = {
    createPaymentSchedule: jest.fn(),
  };

  const mockStateMachineService = {
    transition: jest.fn(),
    canTransition: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockStripeService = {
    createCustomer: jest.fn(),
    createPaymentIntent: jest.fn(),
    confirmPaymentIntent: jest.fn(),
    constructWebhookEvent: jest.fn(),
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
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepository,
        },
        {
          provide: BusinessRulesService,
          useValue: mockBusinessRulesService,
        },
        {
          provide: PaymentSchedulerService,
          useValue: mockPaymentSchedulerService,
        },
        {
          provide: TransactionStateMachineService,
          useValue: mockStateMachineService,
        },
        {
          provide: ScalaPayWebSocketGateway,
          useValue: mockWsGateway,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
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
        userId: 'user-123',
        merchantId: 'merchant-123',
      };

      const completeTransaction = {
        ...mockTransaction,
        user: { id: 'user-123' },
      };

      mockMerchantRepository.findOne.mockResolvedValue({
        id: 'merchant-123',
        businessName: 'Test Merchant',
      });
      mockBusinessRulesService.validateTransactionCreation.mockResolvedValue(true);
      mockRepository.create.mockReturnValue(mockTransaction);
      mockRepository.save.mockResolvedValue(mockTransaction);
      mockPaymentSchedulerService.createPaymentSchedule.mockResolvedValue(undefined);
      // Mock for calculateRiskScore
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-123',
        availableCredit: 1000,
        creditLimit: 2000,
      });
      mockRepository.find.mockResolvedValue([]); // No previous transactions for risk calculation
      mockUserRepository.save.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(completeTransaction);

      const result = await service.create(createData as any);

      expect(result).toEqual(completeTransaction);
      expect(mockBusinessRulesService.validateTransactionCreation).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockPaymentSchedulerService.createPaymentSchedule).toHaveBeenCalled();
      expect(mockWsGateway.emitTransactionUpdate).toHaveBeenCalledWith(
        'user-123',
        completeTransaction,
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
        updatedTransaction,
      );
    });
  });
});
