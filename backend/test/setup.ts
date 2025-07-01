import { ConfigService } from '@nestjs/config';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_51Rf1hcP1x4I62TtzPrlCtiRHmO9hIZVy6e2mKjeQ1W612fII0HFu042gN2JT9GWkUw2iEsZ8MiqeTWk2EyjK9NtV000Tz4wWsM';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_971f8d8db7eb8378330c0aa262d97f7baaecec70c9517929211ac3b252d305db';
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  // Use existing database but with test prefix for isolation
  process.env.DB_NAME = process.env.DB_NAME || 'scalapay_demo';
});

// Mock external services for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
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
  }));
});

// Mock Redis for testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    exists: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock Bull queue for testing
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock external API calls
global.fetch = jest.fn();

// Console spy to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);
