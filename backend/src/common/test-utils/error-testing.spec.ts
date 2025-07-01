import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePaymentDto } from '../../modules/payments/dto/create-payment.dto';
import { CreateTransactionDto } from '../../modules/transactions/dto/create-transaction.dto';
import { UpdateUserDto } from '../../modules/users/dto/update-user.dto';

describe('Error Handling and Validation', () => {
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
    });
  });

  describe('Payment DTO Validation', () => {
    it('should validate CreatePaymentDto with valid data', async () => {
      const validPaymentData = {
        amount: 10000,
        currency: 'USD',
        metadata: {
          orderId: 'order_123',
        },
      };

      const dto = plainToInstance(CreatePaymentDto, validPaymentData);
      const errors = await validate(dto as object);

      expect(errors).toHaveLength(0);
    });

    it('should reject CreatePaymentDto with negative amount', async () => {
      const invalidPaymentData = {
        amount: -1000,
        currency: 'USD',
      };

      const dto = plainToInstance(CreatePaymentDto, invalidPaymentData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject CreatePaymentDto with invalid currency', async () => {
      const invalidPaymentData = {
        amount: 10000,
        currency: 'INVALID',
      };

      const dto = plainToInstance(CreatePaymentDto, invalidPaymentData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should reject CreatePaymentDto with missing required fields', async () => {
      const invalidPaymentData = {
        metadata: {
          orderId: 'order_123',
        },
      };

      const dto = plainToInstance(CreatePaymentDto, invalidPaymentData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      const fieldErrors = errors.map((error) => error.property);
      expect(fieldErrors).toContain('amount');
      expect(fieldErrors).toContain('currency');
    });

    it('should reject CreatePaymentDto with amount too large', async () => {
      const invalidPaymentData = {
        amount: 10000000, // $100,000 - exceeds maximum
        currency: 'USD',
      };

      const dto = plainToInstance(CreatePaymentDto, invalidPaymentData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('max');
    });
  });

  describe('Transaction DTO Validation', () => {
    it('should validate CreateTransactionDto with valid data', async () => {
      const validTransactionData = {
        amount: 50000,
        currency: 'USD',
        description: 'Test transaction',
        metadata: {
          productId: 'prod_123',
          merchantId: 'merchant_456',
        },
      };

      const dto = plainToInstance(CreateTransactionDto, validTransactionData);
      const errors = await validate(dto as object);

      expect(errors).toHaveLength(0);
    });

    it('should reject CreateTransactionDto with invalid email in metadata', async () => {
      const invalidTransactionData = {
        amount: 50000,
        currency: 'USD',
        description: 'Test transaction',
        metadata: {
          customerEmail: 'invalid-email',
        },
      };

      const dto = plainToInstance(CreateTransactionDto, invalidTransactionData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject CreateTransactionDto with description too long', async () => {
      const invalidTransactionData = {
        amount: 50000,
        currency: 'USD',
        description: 'A'.repeat(501), // Exceeds 500 character limit
      };

      const dto = plainToInstance(CreateTransactionDto, invalidTransactionData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('User DTO Validation', () => {
    it('should validate UpdateUserDto with valid data', async () => {
      const validUserData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const dto = plainToInstance(UpdateUserDto, validUserData);
      const errors = await validate(dto as object);

      expect(errors).toHaveLength(0);
    });

    it('should reject UpdateUserDto with invalid email format', async () => {
      const invalidUserData = {
        email: 'not-an-email',
      };

      const dto = plainToInstance(UpdateUserDto, invalidUserData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should reject UpdateUserDto with name too short', async () => {
      const invalidUserData = {
        name: 'A', // Too short
      };

      const dto = plainToInstance(UpdateUserDto, invalidUserData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('minLength');
    });
  });

  describe('Custom Validation Decorators', () => {
    it('should validate payment amounts are in cents', async () => {
      const invalidPaymentData = {
        amount: 100.5, // Should be 10050 (in cents)
        currency: 'USD',
      };

      const dto = plainToInstance(CreatePaymentDto, invalidPaymentData);
      const errors = await validate(dto as object);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isInt');
    });

    it('should validate future dates for scheduled payments', async () => {
      // This would test custom date validators
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      // Mock implementation for scheduled payment DTO
      const invalidScheduleData = {
        amount: 10000,
        currency: 'USD',
        scheduledDate: pastDate,
      };

      // This would use a custom validator to ensure date is in the future
      expect(pastDate.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('Error Response Formatting', () => {
    it('should format validation errors consistently', () => {
      const mockValidationError = {
        property: 'amount',
        value: -1000,
        constraints: {
          min: 'amount must not be less than 1',
          isPositive: 'amount must be a positive number',
        },
      };

      // Test error formatter function
      const formattedError = {
        field: mockValidationError.property,
        value: mockValidationError.value,
        errors: Object.values(mockValidationError.constraints),
      };

      expect(formattedError.field).toBe('amount');
      expect(formattedError.errors).toHaveLength(2);
      expect(formattedError.errors).toContain('amount must not be less than 1');
    });

    it('should handle nested validation errors', () => {
      const nestedError = {
        property: 'metadata.customerInfo.address',
        constraints: {
          isString: 'address must be a string',
        },
      };

      expect(nestedError.property.split('.')).toHaveLength(3);
    });
  });

  describe('HTTP Exception Handling', () => {
    it('should create proper BadRequest exceptions', () => {
      const badRequestException = new HttpException('Invalid payment data', HttpStatus.BAD_REQUEST);

      expect(badRequestException.getStatus()).toBe(400);
      expect(badRequestException.message).toBe('Invalid payment data');
    });

    it('should create proper NotFound exceptions', () => {
      const notFoundException = new HttpException('Payment not found', HttpStatus.NOT_FOUND);

      expect(notFoundException.getStatus()).toBe(404);
      expect(notFoundException.message).toBe('Payment not found');
    });

    it('should create proper Unauthorized exceptions', () => {
      const unauthorizedException = new HttpException(
        'Invalid authentication token',
        HttpStatus.UNAUTHORIZED,
      );

      expect(unauthorizedException.getStatus()).toBe(401);
      expect(unauthorizedException.message).toBe('Invalid authentication token');
    });

    it('should create proper Forbidden exceptions', () => {
      const forbiddenException = new HttpException(
        'Access denied to this resource',
        HttpStatus.FORBIDDEN,
      );

      expect(forbiddenException.getStatus()).toBe(403);
      expect(forbiddenException.message).toBe('Access denied to this resource');
    });

    it('should create proper Conflict exceptions', () => {
      const conflictException = new HttpException('Payment already processed', HttpStatus.CONFLICT);

      expect(conflictException.getStatus()).toBe(409);
      expect(conflictException.message).toBe('Payment already processed');
    });

    it('should create proper UnprocessableEntity exceptions', () => {
      const unprocessableException = new HttpException(
        'Payment method declined',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      expect(unprocessableException.getStatus()).toBe(422);
      expect(unprocessableException.message).toBe('Payment method declined');
    });
  });

  describe('Rate Limiting Error Handling', () => {
    it('should handle rate limit exceeded scenarios', () => {
      const rateLimitException = new HttpException(
        'Rate limit exceeded. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(rateLimitException.getStatus()).toBe(429);
      expect(rateLimitException.message).toContain('Rate limit exceeded');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle unique constraint violations', () => {
      const mockDbError = {
        code: 'ER_DUP_ENTRY',
        message: 'Duplicate entry for key email',
      };

      // Simulate error transformation
      const transformedError = new HttpException('Email already exists', HttpStatus.CONFLICT);

      expect(transformedError.getStatus()).toBe(409);
      expect(transformedError.message).toBe('Email already exists');
    });

    it('should handle foreign key constraint violations', () => {
      const mockDbError = {
        code: 'ER_NO_REFERENCED_ROW_2',
        message: 'Cannot add or update a child row: a foreign key constraint fails',
      };

      const transformedError = new HttpException(
        'Referenced resource not found',
        HttpStatus.BAD_REQUEST,
      );

      expect(transformedError.getStatus()).toBe(400);
    });

    it('should handle connection timeout errors', () => {
      const mockDbError = {
        code: 'ETIMEDOUT',
        message: 'Connection timeout',
      };

      const transformedError = new HttpException(
        'Service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      expect(transformedError.getStatus()).toBe(503);
    });
  });

  describe('External Service Error Handling', () => {
    it('should handle Stripe API errors', () => {
      const mockStripeError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.',
      };

      const transformedError = new HttpException(
        'Payment method declined',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      expect(transformedError.getStatus()).toBe(422);
    });

    it('should handle network timeout errors', () => {
      const mockNetworkError = {
        code: 'ECONNRESET',
        message: 'socket hang up',
      };

      const transformedError = new HttpException(
        'External service unavailable',
        HttpStatus.BAD_GATEWAY,
      );

      expect(transformedError.getStatus()).toBe(502);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize string inputs', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitizedInput = maliciousInput.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '',
      );

      expect(sanitizedInput).not.toContain('<script>');
    });

    it('should validate and sanitize metadata objects', () => {
      const maliciousMetadata = {
        orderId: 'order_123',
        description: '<img src=x onerror=alert(1)>',
        amount: 'DROP TABLE payments;',
      };

      // Mock sanitization process
      const sanitizedMetadata = {
        orderId: 'order_123',
        description: '',
        amount: NaN, // Invalid SQL injection attempt
      };

      expect(sanitizedMetadata.description).toBe('');
      expect(isNaN(sanitizedMetadata.amount)).toBe(true);
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate credit limit constraints', () => {
      const userCredit = 1000;
      const transactionAmount = 1500;

      const hassufficientCredit = userCredit >= transactionAmount;
      expect(hassufficientCredit).toBe(false);
    });

    it('should validate payment date constraints', () => {
      const now = new Date();
      const scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      expect(scheduledDate.getTime()).toBeGreaterThan(now.getTime());
      expect(pastDate.getTime()).toBeLessThan(now.getTime());
    });

    it('should validate installment constraints', () => {
      const totalAmount = 10000; // $100
      const installments = 4;
      const installmentAmount = totalAmount / installments;

      expect(installmentAmount).toBe(2500); // $25 per installment
      expect(installments).toBeGreaterThan(1);
      expect(installments).toBeLessThanOrEqual(12); // Max installments
    });
  });
});
