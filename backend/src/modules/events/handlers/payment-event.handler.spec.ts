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

      const completedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };
      paymentRepository.findOne.mockResolvedValue(completedPayment);

      await handler.handlePaymentCompleted(paymentCompletedEvent);

      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        relations: ['transaction', 'transaction.user'],
      });

      expect(notificationService.sendPaymentSuccessNotification).toHaveBeenCalledWith(
        completedPayment,
      );
    });

    it('should handle missing payment gracefully', async () => {
      const paymentCompletedEvent = {
        paymentId: 'invalid-payment',
        transactionId: 'txn-123',
        userId: 'user-123',
        amount: 200,
      };

      paymentRepository.findOne.mockResolvedValue(null);

      await expect(handler.handlePaymentCompleted(paymentCompletedEvent)).resolves.not.toThrow();

      expect(notificationService.sendPaymentSuccessNotification).not.toHaveBeenCalled();
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

      const failedPayment = { ...mockPayment, status: PaymentStatus.FAILED };
      paymentRepository.findOne.mockResolvedValue(failedPayment);

      await handler.handlePaymentFailed(paymentFailedEvent);

      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        relations: ['transaction', 'transaction.user'],
      });

      expect(notificationService.sendPaymentFailureNotification).toHaveBeenCalledWith(
        failedPayment,
      );
    });

    it('should log error if payment not found', async () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'error').mockImplementation();

      const paymentFailedEvent = {
        paymentId: 'invalid-payment',
        transactionId: 'txn-123',
        userId: 'user-123',
        reason: 'Card declined',
      };

      paymentRepository.findOne.mockResolvedValue(null);

      await handler.handlePaymentFailed(paymentFailedEvent);

      expect(loggerSpy).toHaveBeenCalledWith('Payment not found for failed event: invalid-payment');
    });
  });

  describe('handlePaymentRetryScheduled', () => {
    it('should handle payment retry scheduled event', async () => {
      const paymentRetryEvent = {
        paymentId: 'payment-123',
        retryAt: new Date(),
        retryCount: 1,
        errorMessage: 'Card declined',
      };

      const scheduledPayment = { ...mockPayment, status: PaymentStatus.SCHEDULED };
      paymentRepository.findOne.mockResolvedValue(scheduledPayment);

      await handler.handlePaymentRetryScheduled(paymentRetryEvent);

      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        relations: ['transaction', 'transaction.user'],
      });
    });
  });

  describe('handlePaymentRetryExhausted', () => {
    it('should handle payment retry exhausted event', async () => {
      const retryExhaustedEvent = {
        paymentId: 'payment-123',
        transactionId: 'txn-123',
        userId: 'user-123',
      };

      const failedPayment = { ...mockPayment, status: PaymentStatus.FAILED };
      paymentRepository.findOne.mockResolvedValue(failedPayment);

      await handler.handlePaymentRetryExhausted(retryExhaustedEvent);

      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        relations: ['transaction', 'transaction.user'],
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

      paymentRepository.findOne.mockRejectedValue(new Error('Database connection error'));

      await handler.handlePaymentCompleted(paymentCompletedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error handling payment completed event:',
        expect.any(Error),
      );
    });
  });
});
