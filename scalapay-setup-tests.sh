#!/bin/bash

# Ultimate Scalapay Demo - Test Setup
# This script creates comprehensive test files

echo "🧪 Setting up tests..."

# Backend Tests
cd backend

# Create test directory structure
mkdir -p test/unit
mkdir -p test/integration
mkdir -p test/e2e

# Jest configuration for backend
cat > jest.config.js << 'EOF'
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!main.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
};
EOF

# E2E test configuration
cat > test/jest-e2e.json << 'EOF'
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1",
    "^@modules/(.*)$": "<rootDir>/../src/modules/$1",
    "^@common/(.*)$": "<rootDir>/../src/common/$1",
    "^@config/(.*)$": "<rootDir>/../src/config/$1"
  }
}
EOF

# Auth Service Unit Tests
cat > src/modules/auth/auth.service.spec.ts << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: 'customer',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return auth response on successful login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };
      const token = 'jwt-token';
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: token,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create new user and return auth response', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
        role: 'customer' as const,
      };
      const hashedPassword = 'hashedPassword';
      const token = 'jwt-token';
      const newUser = { ...mockUser, ...registerDto, password: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password',
        name: 'Existing User',
        role: 'customer' as const,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });
});
EOF

# Transaction Service Unit Tests
cat > src/modules/transactions/transactions.service.spec.ts << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: Repository<Transaction>;
  let wsGateway: WebSocketGateway;

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
          provide: WebSocketGateway,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    wsGateway = module.get<WebSocketGateway>(WebSocketGateway);
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
EOF

# E2E Tests
cat > test/e2e/auth.e2e-spec.ts << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await getConnection().close();
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'e2e@test.com',
        password: 'password123',
        name: 'E2E Test User',
        role: 'customer',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toMatchObject({
        email: registerDto.email,
        name: registerDto.name,
        role: registerDto.role,
      });
    });

    it('should fail with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        role: 'customer',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'e2e@test.com',
        password: 'password123',
        name: 'Duplicate User',
        role: 'customer',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const loginDto = {
        email: 'e2e@test.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', loginDto.email);
    });

    it('should fail with invalid credentials', async () => {
      const loginDto = {
        email: 'e2e@test.com',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });
});
EOF

# Frontend Tests
cd ../frontend

# Jest configuration for frontend
cat > jest.config.js << 'EOF'
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/app/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
EOF

# Jest setup
cat > jest.setup.js << 'EOF'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }) => children,
}))
EOF

# Component Tests
mkdir -p src/__tests__/components

cat > src/__tests__/components/payment-plan-selector.test.tsx << 'EOF'
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentPlanSelector } from '@/components/features/payment-plan-selector';

describe('PaymentPlanSelector', () => {
  const mockOnSelect = jest.fn();
  const testAmount = 300;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all payment plans', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Pay in 2')).toBeInTheDocument();
    expect(screen.getByText('Pay in 3')).toBeInTheDocument();
    expect(screen.getByText('Pay in 4')).toBeInTheDocument();
  });

  it('displays correct installment amounts', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/2x \$150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/3x \$100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4x \$75\.00/)).toBeInTheDocument();
  });

  it('selects Pay in 3 by default', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);
    
    const payIn3Radio = screen.getByRole('radio', { name: /pay in 3/i });
    expect(payIn3Radio).toBeChecked();
  });

  it('calls onSelect when plan is changed', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);
    
    const payIn2Radio = screen.getByRole('radio', { name: /pay in 2/i });
    fireEvent.click(payIn2Radio);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'pay_in_2',
      name: 'Pay in 2',
      installments: 2,
      description: 'Split into 2 interest-free payments',
    });
  });

  it('updates visual selection indicator', () => {
    const { container } = render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);
    
    const payIn4Radio = screen.getByRole('radio', { name: /pay in 4/i });
    fireEvent.click(payIn4Radio);
    
    const selectedCard = container.querySelector('.border-purple-600');
    expect(selectedCard).toBeInTheDocument();
  });
});
EOF

# Service Tests
cat > src/__tests__/services/auth-service.test.ts << 'EOF'
import { authService } from '@/services/auth-service';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client');

describe('AuthService', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const mockResponse = {
        data: {
          accessToken: 'token123',
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'customer',
          },
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login(loginData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login error', async () => {
      const loginData = { email: 'test@example.com', password: 'wrong' };
      const error = new Error('Invalid credentials');

      mockApiClient.post.mockRejectedValue(error);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
        role: 'customer',
      };
      const mockResponse = {
        data: {
          accessToken: 'token456',
          user: {
            id: 'user456',
            email: 'new@example.com',
            name: 'New User',
            role: 'customer',
          },
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.register(registerData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        data: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer',
          creditLimit: 5000,
          availableCredit: 4500,
        },
      };

      mockApiClient.get.mockResolvedValue(mockProfile);

      const result = await authService.getProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockProfile.data);
    });
  });
});
EOF

# Store Tests
cat > src/__tests__/store/auth-store.test.ts << 'EOF'
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store/auth-store';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (config) => (set, get, api) => config(set, get, api),
}));

describe('AuthStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should set token', () => {
    const { result } = renderHook(() => useAuthStore());
    const token = 'jwt-token-123';

    act(() => {
      result.current.setToken(token);
    });

    expect(result.current.token).toBe(token);
  });

  it('should logout', () => {
    const { result } = renderHook(() => useAuthStore());
    
    // Set initial data
    act(() => {
      result.current.setUser({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
      });
      result.current.setToken('token123');
    });

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
EOF

# Integration Tests
cat > src/__tests__/integration/checkout-flow.test.tsx << 'EOF'
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import CheckoutPage from '@/app/(shop)/checkout/page';
import { transactionService } from '@/services/transaction-service';

jest.mock('@/services/transaction-service');
jest.mock('next/navigation');

const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    jest.spyOn(require('@/store/auth-store'), 'useAuthStore').mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
      },
      token: 'mock-token',
    });
  });

  it('completes checkout process successfully', async () => {
    const mockTransaction = {
      id: 'trans123',
      amount: 300,
      status: 'approved',
      payments: [
        { id: 'pay1', amount: 100, dueDate: '2024-02-01', status: 'scheduled' },
        { id: 'pay2', amount: 100, dueDate: '2024-03-01', status: 'scheduled' },
        { id: 'pay3', amount: 100, dueDate: '2024-04-01', status: 'scheduled' },
      ],
    };

    (transactionService.create as jest.Mock).mockResolvedValue(mockTransaction);

    render(<CheckoutPage />, { wrapper: createWrapper() });

    // Should show payment plan selector
    expect(screen.getByText('Select Payment Plan')).toBeInTheDocument();

    // Select Pay in 3
    const payIn3Option = screen.getByRole('radio', { name: /pay in 3/i });
    fireEvent.click(payIn3Option);

    // Click continue
    const continueButton = screen.getByText('Continue to Payment');
    fireEvent.click(continueButton);

    // Fill payment details (mocked)
    await waitFor(() => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });

    // Complete checkout
    const completeButton = screen.getByText('Complete Purchase');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(transactionService.create).toHaveBeenCalledWith({
        amount: 300,
        merchantId: expect.any(String),
        paymentPlan: 'pay_in_3',
        items: expect.any(Array),
      });
    });

    // Should redirect to success page
    expect(mockPush).toHaveBeenCalledWith('/checkout/success?id=trans123');
  });

  it('handles checkout errors gracefully', async () => {
    (transactionService.create as jest.Mock).mockRejectedValue(
      new Error('Insufficient credit')
    );

    render(<CheckoutPage />, { wrapper: createWrapper() });

    // Complete checkout flow
    const payIn2Option = screen.getByRole('radio', { name: /pay in 2/i });
    fireEvent.click(payIn2Option);

    const continueButton = screen.getByText('Continue to Payment');
    fireEvent.click(continueButton);

    await waitFor(() => {
      const completeButton = screen.getByText('Complete Purchase');
      fireEvent.click(completeButton);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/insufficient credit/i)).toBeInTheDocument();
    });
  });
});
EOF

echo "✅ Test setup completed!"

# Create GitHub Actions workflow for tests
mkdir -p ../.github/workflows
cat > ../.github/workflows/test.yml << 'EOF'
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: scalapay_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install backend dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run backend unit tests
      run: |
        cd backend
        npm run test:cov
      env:
        NODE_ENV: test
        MYSQL_HOST: localhost
        MYSQL_PORT: 3306
        MYSQL_DATABASE: scalapay_test
        MYSQL_USERNAME: root
        MYSQL_PASSWORD: root
        REDIS_HOST: localhost
        REDIS_PORT: 6379
        JWT_SECRET: test-secret
    
    - name: Run backend E2E tests
      run: |
        cd backend
        npm run test:e2e
      env:
        NODE_ENV: test
        MYSQL_HOST: localhost
        REDIS_HOST: localhost

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm run test -- --coverage
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
EOF

echo "✅ Complete test suite setup finished!"