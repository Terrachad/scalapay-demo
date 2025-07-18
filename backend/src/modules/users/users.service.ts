import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import {
  UpdateUserProfileDto,
  NotificationPreferences,
  SecurityPreferences,
  UpdateNotificationPreferencesDto,
  UpdateSecurityPreferencesDto,
  UserProfileResponseDto,
} from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'name',
        'role',
        'creditLimit',
        'availableCredit',
        'isActive',
      ],
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async deductUserCredit(userId: string, amount: number): Promise<User> {
    const user = await this.findById(userId);

    // CRITICAL: Validate amount is positive
    if (amount <= 0) {
      throw new Error('Deduction amount must be positive');
    }

    // CRITICAL: Prevent negative balance
    const newBalance = Number(user.availableCredit) - amount;
    if (newBalance < 0) {
      throw new Error(
        `Insufficient credit. Available: ${user.availableCredit}, Required: ${amount}`,
      );
    }

    user.availableCredit = newBalance;
    return this.usersRepository.save(user);
  }

  async updateCreditLimit(userId: string, newLimit: number): Promise<User> {
    const user = await this.findById(userId);

    // CRITICAL: Actually update the credit limit (not deduct credit)
    if (newLimit <= 0) {
      throw new Error('Credit limit must be positive');
    }

    const currentUsed = Number(user.creditLimit) - Number(user.availableCredit);
    user.creditLimit = newLimit;
    user.availableCredit = Math.max(0, newLimit - currentUsed);

    return this.usersRepository.save(user);
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);

    // Only allow updating certain fields
    const allowedFields: (keyof User)[] = [
      'name',
      'email',
      'isActive',
      'creditLimit',
      'availableCredit',
      'stripeCustomerId',
    ];
    const filteredData: Partial<User> = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (filteredData as any)[field] = updateData[field];
      }
    });

    await this.usersRepository.update(id, filteredData);
    return this.findById(id);
  }

  async getAdminAnalytics(): Promise<any> {
    // Get all users, transactions, and merchants
    const users = await this.usersRepository.find();
    const transactions = await this.transactionRepository.find({
      relations: ['payments'],
      order: { createdAt: 'DESC' },
    });
    const merchants = await this.merchantRepository.find();

    // Calculate platform metrics
    const totalUsers = users.length;
    const customerCount = users.filter((u) => u.role === UserRole.CUSTOMER).length;
    const merchantCount = users.filter((u) => u.role === UserRole.MERCHANT).length;
    const adminCount = users.filter((u) => u.role === UserRole.ADMIN).length;

    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const completedTransactions = transactions.filter((t) => t.status === 'completed');
    const completedRevenue = completedTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    // Platform commission (2.5% of completed revenue)
    const platformRevenue = completedRevenue * 0.025;

    // Monthly metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfMonth);
    const monthlyRevenue = monthlyTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );
    const monthlyUsers = users.filter((u) => new Date(u.createdAt) >= startOfMonth).length;

    // Daily data for last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyData = last30Days.map((date) => {
      const dayTransactions = transactions.filter(
        (t) => t.createdAt.toISOString().split('T')[0] === date,
      );
      const dayUsers = users.filter((u) => u.createdAt.toISOString().split('T')[0] === date);

      return {
        date,
        transactions: dayTransactions.length,
        revenue: dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
        newUsers: dayUsers.length,
      };
    });

    // Top merchants by revenue
    const merchantRevenue = transactions.reduce(
      (acc, t) => {
        if (!acc[t.merchantId]) {
          acc[t.merchantId] = { revenue: 0, transactions: 0 };
        }
        acc[t.merchantId].revenue += parseFloat(t.amount.toString());
        acc[t.merchantId].transactions += 1;
        return acc;
      },
      {} as Record<string, { revenue: number; transactions: number }>,
    );

    const topMerchants = await Promise.all(
      Object.entries(merchantRevenue)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(async ([merchantId, stats]) => {
          const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
          return {
            id: merchantId,
            name: merchant?.businessName || 'Unknown',
            revenue: stats.revenue,
            transactions: stats.transactions,
          };
        }),
    );

    // Payment plan distribution
    const paymentPlanStats = transactions.reduce(
      (acc, t) => {
        acc[t.paymentPlan] = (acc[t.paymentPlan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Recent activity
    const recentTransactions = transactions.slice(0, 10);
    const recentUsers = users
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      // Overview stats
      totalUsers,
      customerCount,
      merchantCount,
      adminCount,
      totalRevenue,
      completedRevenue,
      platformRevenue,
      totalTransactions: transactions.length,
      completedTransactions: completedTransactions.length,

      // Monthly growth
      monthlyRevenue,
      monthlyTransactions: monthlyTransactions.length,
      monthlyUsers,

      // Charts data
      dailyData,
      paymentPlanStats,
      topMerchants,

      // Recent activity
      recentTransactions,
      recentUsers,
    };
  }

  async getUsersByRole(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.usersRepository.find({
        where: { role },
        order: { createdAt: 'DESC' },
      });
    }
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async approveUser(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = true;
    return this.usersRepository.save(user);
  }

  async rejectUser(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  async getPendingApprovals(): Promise<User[]> {
    return this.usersRepository.find({
      where: { isActive: false },
      order: { createdAt: 'DESC' },
    });
  }

  // User Profile Management Methods

  async updateUserProfile(userId: string, updateData: UpdateUserProfileDto): Promise<User> {
    try {
      console.log('Update profile called with:', { userId, updateData });

      const user = await this.findById(userId);
      console.log('Found user:', { id: user.id, name: user.name, email: user.email });

      // Update profile fields
      if (updateData.name !== undefined) {
        user.name = updateData.name;
        console.log('Updated name to:', updateData.name);
      }

      if (updateData.email !== undefined) {
        // Skip email validation for now - just update it
        user.email = updateData.email;
        console.log('Updated email to:', updateData.email);
      }

      if (updateData.phone !== undefined) {
        user.phone = updateData.phone;
      }
      if (updateData.address !== undefined) {
        user.address = updateData.address;
      }
      if (updateData.dateOfBirth !== undefined) {
        if (updateData.dateOfBirth && updateData.dateOfBirth.trim() !== '') {
          try {
            const dateObj = new Date(updateData.dateOfBirth);
            if (!isNaN(dateObj.getTime())) {
              user.dateOfBirth = dateObj;
            }
          } catch (error) {
            console.error('Date parsing error:', error);
          }
        } else {
          user.dateOfBirth = undefined;
        }
      }
      if (updateData.emergencyContact !== undefined) {
        user.emergencyContact = updateData.emergencyContact;
      }

      console.log('About to save user:', {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      });

      const savedUser = await this.usersRepository.save(user);
      console.log('User saved successfully');
      return savedUser;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    updateData: UpdateNotificationPreferencesDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Initialize preferences if they don't exist
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        email: true,
        sms: false,
        push: true,
        paymentReminders: true,
        transactionUpdates: true,
        promotional: false,
      };
    }

    // Update preferences
    Object.assign(user.notificationPreferences, updateData.preferences);

    return this.usersRepository.save(user);
  }

  async updateSecurityPreferences(
    userId: string,
    updateData: UpdateSecurityPreferencesDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Initialize preferences if they don't exist
    if (!user.securityPreferences) {
      user.securityPreferences = {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginNotifications: true,
        deviceVerification: false,
      };
    }

    // Update preferences
    Object.assign(user.securityPreferences, updateData.preferences);

    return this.usersRepository.save(user);
  }

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.findById(userId);
    return new UserProfileResponseDto(user);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await this.findById(userId);
    return (
      user.notificationPreferences || {
        email: true,
        sms: false,
        push: true,
        paymentReminders: true,
        transactionUpdates: true,
        promotional: false,
      }
    );
  }

  async getSecurityPreferences(userId: string): Promise<SecurityPreferences> {
    const user = await this.findById(userId);
    return (
      user.securityPreferences || {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginNotifications: true,
        deviceVerification: false,
      }
    );
  }
}
