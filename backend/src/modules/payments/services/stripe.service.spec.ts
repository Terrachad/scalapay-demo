import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService, CreatePaymentIntentDto } from './stripe.service';
import Stripe from 'stripe';

// Mock Stripe
const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  },
  paymentMethods: {
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('StripeService', () => {
  let service: StripeService;
  let configService: ConfigService;

  const mockCustomer: Stripe.Customer = {
    id: 'cus_test123',
    object: 'customer',
    created: 1234567890,
    email: 'test@example.com',
    livemode: false,
    metadata: {},
    balance: 0,
    currency: null,
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    invoice_prefix: null,
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    name: 'Test User',
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
  };

  const mockPaymentIntent: Stripe.PaymentIntent = {
    id: 'pi_test123',
    object: 'payment_intent',
    amount: 2000,
    currency: 'usd',
    status: 'requires_payment_method',
    client_secret: 'pi_test123_secret_abc',
    created: 1234567890,
    livemode: false,
    metadata: {},
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    confirmation_method: 'automatic',
    description: null,
    last_payment_error: null,
    latest_charge: null,
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    transfer_data: null,
    transfer_group: null,
    amount_capturable: 0,
    amount_details: { tip: {} },
    amount_received: 0,
    application: null,
    application_fee_amount: null,
    customer: null,
    payment_method_configuration_details: null,
    source: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('sk_test_fake_key_for_testing'),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer('test@example.com', 'Test User');

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          source: 'scalapay_bnpl',
        },
      });
    });

    it('should handle customer creation error', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(service.createCustomer('test@example.com', 'Test User')).rejects.toThrow(
        'Failed to create payment customer',
      );
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const dto: CreatePaymentIntentDto = {
        amount: 2000,
        currency: 'usd',
        customerId: 'cus_test123',
        metadata: { orderId: 'order_123' },
      };

      const result = await service.createPaymentIntent(dto);

      expect(result).toEqual({
        paymentIntentId: 'pi_test123',
        clientSecret: 'pi_test123_secret_abc',
        status: 'requires_payment_method',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 200000,
        currency: 'usd',
        customer: 'cus_test123',
        metadata: {
          orderId: 'order_123',
          service: 'scalapay_bnpl',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
    });

    it('should handle payment intent creation error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Insufficient funds'));

      const dto: CreatePaymentIntentDto = {
        amount: 2000,
        currency: 'usd',
      };

      await expect(service.createPaymentIntent(dto)).rejects.toThrow(
        'Failed to create payment intent',
      );
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent successfully', async () => {
      const confirmedPaymentIntent = { ...mockPaymentIntent, status: 'succeeded' };
      mockStripe.paymentIntents.confirm.mockResolvedValue(confirmedPaymentIntent);

      const result = await service.confirmPaymentIntent('pi_test123');

      expect(result).toEqual(confirmedPaymentIntent);

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test123');
    });

    it('should handle confirmation error', async () => {
      mockStripe.paymentIntents.confirm.mockRejectedValue(new Error('Card declined'));

      await expect(service.confirmPaymentIntent('pi_test123')).rejects.toThrow(
        'Failed to confirm payment',
      );
    });
  });

  describe('retrievePaymentIntent', () => {
    it('should retrieve payment intent successfully', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await service.retrievePaymentIntent('pi_test123');

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test123');
    });

    it('should handle retrieve error', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Payment intent not found'));

      await expect(service.retrievePaymentIntent('pi_invalid')).rejects.toThrow(
        'Failed to retrieve payment information',
      );
    });
  });
});
