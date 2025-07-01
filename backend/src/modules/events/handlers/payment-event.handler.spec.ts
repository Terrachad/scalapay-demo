import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEventHandler } from './payment-event.handler';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationService } from '../../payments/services/notification.service';

describe('PaymentEventHandler', () => {
  let handler: PaymentEventHandler;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed_password',
    isActive: true,
    stripeCustomerId: 'cus_test123',
    creditLimit: 1000,
    availableCredit: 800,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  const mockPayment: Payment = {
    id: 'payment-123',
    amount: 200,
    dueDate: new Date(),
    status: PaymentStatus.SCHEDULED,
    paymentDate: new Date(),
    retryCount: 0,
    nextRetryAt: undefined,
    stripePaymentIntentId: 'pi_test123',
    transactionId: 'txn-123',
    transaction: {} as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockNotificationService = {
      sendPaymentSuccessNotification: jest.fn(),
      sendPaymentFailureNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEventHandler,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<PaymentEventHandler>(PaymentEventHandler);
    paymentRepository = module.get(getRepositoryToken(Payment));
    userRepository = module.get(getRepositoryToken(User));
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handlePaymentCompleted', () => {
    it('should handle payment completed event', async () => {
      const paymentCompletedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
        amount: 200,
      };

      const userWithUpdatedCredit = { ...mockUser, availableCredit: 800 };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(userWithUpdatedCredit);

      await handler.handlePaymentCompleted(paymentCompletedEvent);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });

      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        availableCredit: 1000, // 800 + 200
      });
    });

    it('should handle missing user gracefully', async () => {
      const paymentCompletedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'invalid-user',
        amount: 200,
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(handler.handlePaymentCompleted(paymentCompletedEvent)).resolves.not.toThrow();

      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('should handle payment failed event', async () => {
      const paymentFailedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
        reason: 'Card declined',
      };

      paymentRepository.count.mockResolvedValue(1);

      await handler.handlePaymentFailed(paymentFailedEvent);

      expect(paymentRepository.count).toHaveBeenCalledWith({
        where: {
          transaction: { userId: 'user-123' },
          status: PaymentStatus.FAILED,
          createdAt: { $gte: expect.any(Date) },
        },
      });
    });

    it('should warn about multiple failures', async () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'warn').mockImplementation();

      const paymentFailedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
        reason: 'Card declined',
      };

      paymentRepository.count.mockResolvedValue(3);

      await handler.handlePaymentFailed(paymentFailedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Multiple payment failures detected for user user-123',
      );
    });
  });

  describe('handlePaymentRetryScheduled', () => {
    it('should handle payment retry scheduled event', async () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'log').mockImplementation();
      const retryDate = new Date();

      const paymentRetryEvent = {
        paymentId: 'payment-123',
        retryAt: retryDate,
        retryCount: 1,
        errorMessage: 'Card declined',
      };

      await handler.handlePaymentRetryScheduled(paymentRetryEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Scheduled retry notification for payment payment-123 at ${retryDate}`,
      );
    });
  });

  describe('handlePaymentRetryExhausted', () => {
    it('should handle payment retry exhausted event', async () => {
      const retryExhaustedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await handler.handlePaymentRetryExhausted(retryExhaustedEvent);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'error').mockImplementation();

      const paymentCompletedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
        amount: 200,
      };

      userRepository.findOne.mockRejectedValue(new Error('Database connection error'));

      await handler.handlePaymentCompleted(paymentCompletedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error handling payment completed event:',
        expect.any(Error),
      );
    });
  });
});
