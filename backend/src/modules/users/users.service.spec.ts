import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    role: UserRole.CUSTOMER,
    isActive: true,
    creditLimit: 5000,
    availableCredit: 4500,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith();
      expect(result).toEqual(users);
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: ['id', 'email', 'password', 'name', 'role', 'creditLimit', 'availableCredit'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        select: ['id', 'email', 'password', 'name', 'role', 'creditLimit', 'availableCredit'],
      });
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
      };
      const createdUser = { ...mockUser, ...userData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });

    it('should create user with partial data', async () => {
      const partialData = {
        email: 'partial@example.com',
        name: 'Partial User',
      };
      const createdUser = { ...mockUser, ...partialData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(partialData);

      expect(repository.create).toHaveBeenCalledWith(partialData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('updateCreditLimit', () => {
    it('should update user available credit', async () => {
      const userId = 'user-123';
      const amount = 500;
      const updatedUser = {
        ...mockUser,
        availableCredit: mockUser.availableCredit - amount,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateCreditLimit(userId, amount);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockUser,
        availableCredit: 4000,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found for credit update', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateCreditLimit('non-existent', 100)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should handle negative credit updates', async () => {
      const userId = 'user-123';
      const amount = -200; // Adding credit back
      const updatedUser = {
        ...mockUser,
        availableCredit: mockUser.availableCredit - amount,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateCreditLimit(userId, amount);

      expect(repository.save).toHaveBeenCalledWith({
        ...mockUser,
        availableCredit: 4700,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle zero amount updates', async () => {
      const userId = 'user-123';
      const amount = 0;

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.updateCreditLimit(userId, amount);

      expect(repository.save).toHaveBeenCalledWith({
        ...mockUser,
        availableCredit: 4500,
      });
      expect(result).toEqual(mockUser);
    });
  });
});