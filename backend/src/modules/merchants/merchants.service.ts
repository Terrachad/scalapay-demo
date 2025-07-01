import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(): Promise<Merchant[]> {
    return this.merchantRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findDemoMerchant(): Promise<Merchant> {
    // First try to find by name
    let merchant = await this.merchantRepository.findOne({
      where: { name: 'Demo Electronics Store' },
    });

    if (!merchant) {
      // If not found, create a demo merchant
      merchant = await this.createDemoMerchant();
    }

    return merchant;
  }

  private async createDemoMerchant(): Promise<Merchant> {
    const demoMerchant = this.merchantRepository.create({
      name: 'Demo Electronics Store',
      email: 'store@demo.com',
      businessName: 'Demo Electronics Store',
      feePercentage: 2.5,
      isActive: true,
    });

    return this.merchantRepository.save(demoMerchant);
  }

  async findOne(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({ where: { id } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    return merchant;
  }

  async updateProfile(id: string, updateData: Partial<Merchant>): Promise<Merchant> {
    const merchant = await this.findOne(id);

    // Only allow updating certain fields
    const allowedFields: (keyof Merchant)[] = ['name', 'email', 'businessName', 'isActive'];
    const filteredData: Partial<Merchant> = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (filteredData as any)[field] = updateData[field];
      }
    });

    await this.merchantRepository.update(id, filteredData);
    return this.findOne(id);
  }

  async getAnalytics(merchantId: string): Promise<any> {
    const merchant = await this.findOne(merchantId);

    // Get all transactions for this merchant
    const transactions = await this.transactionRepository.find({
      where: { merchantId },
      relations: ['payments'],
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate metrics
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const completedTransactions = transactions.filter((t) => t.status === 'completed');
    const completedRevenue = completedTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    // Today's metrics
    const todayTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfDay);
    const todayRevenue = todayTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    // Weekly metrics
    const weekTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfWeek);
    const weekRevenue = weekTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    // Monthly metrics
    const monthTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfMonth);
    const monthRevenue = monthTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    // Average order value
    const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;

    // Conversion rate (completed vs total)
    const conversionRate =
      transactions.length > 0 ? (completedTransactions.length / transactions.length) * 100 : 0;

    // Payment plan distribution
    const paymentPlanStats = transactions.reduce(
      (acc, t) => {
        acc[t.paymentPlan] = (acc[t.paymentPlan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Daily revenue for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyRevenue = last7Days.map((date) => {
      const dayTransactions = transactions.filter(
        (t) => t.createdAt.toISOString().split('T')[0] === date,
      );
      return {
        date,
        revenue: dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
        orders: dayTransactions.length,
      };
    });

    // Top performing items
    const itemStats = transactions
      .flatMap((t) => t.items)
      .reduce(
        (acc, item) => {
          if (!acc[item.name]) {
            acc[item.name] = { quantity: 0, revenue: 0 };
          }
          acc[item.name].quantity += item.quantity;
          acc[item.name].revenue += item.price * item.quantity;
          return acc;
        },
        {} as Record<string, { quantity: number; revenue: number }>,
      );

    const topItems = Object.entries(itemStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      completedRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      avgOrderValue,
      conversionRate,
      totalTransactions: transactions.length,
      completedTransactions: completedTransactions.length,
      pendingTransactions: transactions.filter((t) => ['pending', 'approved'].includes(t.status))
        .length,
      paymentPlanStats,
      dailyRevenue,
      topItems: topItems.map(([name, stats]) => ({ name, ...stats })),
      recentTransactions: transactions.slice(0, 10),
    };
  }

  async generateApiKey(merchantId: string): Promise<string> {
    // Generate a new API key (in real implementation, this would be cryptographically secure)
    const apiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    // In a real implementation, you'd store this securely in the database
    // For now, we'll just return the generated key
    return apiKey;
  }
}
