import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentRetryService } from './payment-retry.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from './notification.service';

describe('PaymentRetryService', () => {
  let service: PaymentRetryService;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let stripeService: jest.Mocked<StripeService>;
  let notificationService: jest.Mocked<NotificationService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

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
    retryCount: 1,
    nextRetryAt: new Date(Date.now() - 1000), // Past date for retry
    stripePaymentIntentId: 'pi_test123',
    stripePaymentMethodId: 'pm_test123',
    transactionId: 'txn-123',
    transaction: { user: mockUser } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockStripeService = {
      confirmPaymentIntent: jest.fn(),
      retrievePaymentIntent: jest.fn(),
      createPaymentIntent: jest.fn(),
      chargeStoredPaymentMethod: jest.fn(),
      mapStripeStatusToPaymentStatus: jest.fn(),
    };

    const mockNotificationService = {
      sendPaymentRetrySuccessNotification: jest.fn(),
      sendPaymentFailureNotification: jest.fn(),
      sendFinalPaymentFailureNotification: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRetryService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PaymentRetryService>(PaymentRetryService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    userRepository = module.get(getRepositoryToken(User));
    stripeService = module.get(StripeService);
    notificationService = module.get(NotificationService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRetryQueue', () => {
    it('should process retryable payments successfully', async () => {
      const retryablePayments = [mockPayment];
      paymentRepository.find.mockResolvedValue(retryablePayments);

      stripeService.chargeStoredPaymentMethod.mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      } as any);
      stripeService.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.COMPLETED);

      await service.processRetryQueue();

      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: {
          status: PaymentStatus.SCHEDULED,
          nextRetryAt: expect.any(Object), // LessThan matcher
          retryCount: expect.any(Object), // LessThan matcher
        },
        relations: ['transaction', 'transaction.user'],
      });

      expect(stripeService.chargeStoredPaymentMethod).toHaveBeenCalledWith(
        'cus_test123',
        'pm_test123',
        200,
        expect.any(Object),
      );
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.COMPLETED,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.retry_succeeded', expect.any(Object));
    });

    it('should handle payment retry failure and increment retry count', async () => {
      const paymentToRetry = { ...mockPayment, retryCount: 0 };
      const retryablePayments = [paymentToRetry];
      paymentRepository.find.mockResolvedValue(retryablePayments);

      stripeService.chargeStoredPaymentMethod.mockRejectedValue(new Error('Card declined'));

      await service.processRetryQueue();

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 1,
          nextRetryAt: expect.any(Date),
          status: PaymentStatus.SCHEDULED,
          failureReason: 'Card declined',
        }),
      );
    });

    it('should mark payment as failed when max retries exceeded', async () => {
      const failedPayment = { ...mockPayment, retryCount: 2 };
      const retryablePayments = [failedPayment];
      paymentRepository.find.mockResolvedValue(retryablePayments);

      stripeService.chargeStoredPaymentMethod.mockRejectedValue(new Error('Card declined'));

      await service.processRetryQueue();

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
        }),
      );
      expect(notificationService.sendFinalPaymentFailureNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.final_failure', expect.any(Object));
    });
  });

  describe('retryPayment', () => {
    it('should retry payment successfully', async () => {
      const payment = { ...mockPayment, retryCount: 0 };

      stripeService.chargeStoredPaymentMethod.mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      } as any);
      stripeService.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.COMPLETED);

      const result = await service.retryPayment(payment);

      expect(result).toBe(true);
      expect(stripeService.chargeStoredPaymentMethod).toHaveBeenCalledWith(
        'cus_test123',
        'pm_test123',
        200,
        expect.any(Object),
      );
    });

    it('should handle retry failure', async () => {
      const payment = { ...mockPayment, retryCount: 0 };

      stripeService.chargeStoredPaymentMethod.mockRejectedValue(new Error('Card declined'));

      const result = await service.retryPayment(payment);

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      paymentRepository.find.mockRejectedValue(new Error('Database connection error'));

      await expect(service.processRetryQueue()).rejects.toThrow('Database connection error');
    });
  });
});
