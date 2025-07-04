import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  MerchantSettings,
  SettingType,
  PaymentSettings,
  NotificationSettings,
  SecuritySettings,
  StoreSettings,
} from './entities/merchant-settings.entity';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateStoreSettingsDto,
} from './dto/merchant-settings.dto';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(MerchantSettings)
    private merchantSettingsRepository: Repository<MerchantSettings>,
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

    // Store the API key in security settings
    await this.updateSecuritySetting(merchantId, 'apiKey', apiKey);

    return apiKey;
  }

  // Merchant Settings Methods

  async getPaymentSettings(merchantId: string): Promise<PaymentSettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const settings = await this.merchantSettingsRepository.find({
      where: { merchantId, settingType: SettingType.PAYMENT, isActive: true },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      enablePayIn2: settingsMap.enablePayIn2 === 'true',
      enablePayIn3: settingsMap.enablePayIn3 === 'true',
      enablePayIn4: settingsMap.enablePayIn4 === 'true',
      minimumAmount: parseFloat(settingsMap.minimumAmount || '50'),
      maximumAmount: parseFloat(settingsMap.maximumAmount || '5000'),
      autoApprove: settingsMap.autoApprove === 'true',
      requireManualReview: settingsMap.requireManualReview === 'true',
    };
  }

  async updatePaymentSettings(
    merchantId: string,
    updateData: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const updatePromises = Object.entries(updateData).map(([key, value]) =>
      this.updatePaymentSetting(merchantId, key, String(value)),
    );

    await Promise.all(updatePromises);
    return this.getPaymentSettings(merchantId);
  }

  async getNotificationSettings(merchantId: string): Promise<NotificationSettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const settings = await this.merchantSettingsRepository.find({
      where: { merchantId, settingType: SettingType.NOTIFICATION, isActive: true },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      newOrders: settingsMap.newOrders === 'true',
      paymentReceived: settingsMap.paymentReceived === 'true',
      paymentFailed: settingsMap.paymentFailed === 'true',
      dailySummary: settingsMap.dailySummary === 'true',
      weeklyReport: settingsMap.weeklyReport === 'true',
      monthlyReport: settingsMap.monthlyReport === 'true',
      email: settingsMap.email === 'true',
      sms: settingsMap.sms === 'false', // Default false for SMS
      inApp: settingsMap.inApp === 'true',
    };
  }

  async updateNotificationSettings(
    merchantId: string,
    updateData: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const updatePromises = Object.entries(updateData).map(([key, value]) =>
      this.updateNotificationSetting(merchantId, key, String(value)),
    );

    await Promise.all(updatePromises);
    return this.getNotificationSettings(merchantId);
  }

  async getSecuritySettings(merchantId: string): Promise<SecuritySettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const settings = await this.merchantSettingsRepository.find({
      where: { merchantId, settingType: SettingType.SECURITY, isActive: true },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      twoFactorEnabled: settingsMap.twoFactorEnabled === 'true',
      sessionTimeout: parseInt(settingsMap.sessionTimeout || '30'),
      ipWhitelist: settingsMap.ipWhitelist ? JSON.parse(settingsMap.ipWhitelist) : [],
      webhookUrl: settingsMap.webhookUrl || '',
      apiKey: settingsMap.apiKey || '',
    };
  }

  async updateSecuritySettings(
    merchantId: string,
    updateData: UpdateSecuritySettingsDto,
  ): Promise<SecuritySettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const updatePromises = Object.entries(updateData).map(([key, value]) => {
      const stringValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      return this.updateSecuritySetting(merchantId, key, stringValue);
    });

    await Promise.all(updatePromises);
    return this.getSecuritySettings(merchantId);
  }

  async getStoreSettings(merchantId: string): Promise<StoreSettings> {
    const merchant = await this.findOne(merchantId);

    const settings = await this.merchantSettingsRepository.find({
      where: { merchantId, settingType: SettingType.STORE, isActive: true },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      businessName: settingsMap.businessName || merchant.businessName,
      email: settingsMap.email || merchant.email,
      phone: settingsMap.phone || '',
      address: settingsMap.address || '',
      website: settingsMap.website || '',
      description: settingsMap.description || '',
      feePercentage: parseFloat(settingsMap.feePercentage || merchant.feePercentage.toString()),
      isActive: settingsMap.isActive === 'true' || merchant.isActive,
    };
  }

  async updateStoreSettings(
    merchantId: string,
    updateData: UpdateStoreSettingsDto,
  ): Promise<StoreSettings> {
    await this.findOne(merchantId); // Verify merchant exists

    const updatePromises = Object.entries(updateData).map(([key, value]) =>
      this.updateStoreSetting(merchantId, key, String(value)),
    );

    await Promise.all(updatePromises);
    return this.getStoreSettings(merchantId);
  }

  // Private helper methods for updating individual settings

  private async updatePaymentSetting(
    merchantId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.updateSetting(merchantId, SettingType.PAYMENT, key, value);
  }

  private async updateNotificationSetting(
    merchantId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.updateSetting(merchantId, SettingType.NOTIFICATION, key, value);
  }

  private async updateSecuritySetting(
    merchantId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.updateSetting(merchantId, SettingType.SECURITY, key, value);
  }

  private async updateStoreSetting(merchantId: string, key: string, value: string): Promise<void> {
    await this.updateSetting(merchantId, SettingType.STORE, key, value);
  }

  private async updateSetting(
    merchantId: string,
    settingType: SettingType,
    key: string,
    value: string,
  ): Promise<void> {
    let setting = await this.merchantSettingsRepository.findOne({
      where: { merchantId, settingType, settingKey: key },
    });

    if (setting) {
      setting.settingValue = value;
      setting.isActive = true;
      await this.merchantSettingsRepository.save(setting);
    } else {
      setting = this.merchantSettingsRepository.create({
        merchantId,
        settingType,
        settingKey: key,
        settingValue: value,
        isActive: true,
      });
      await this.merchantSettingsRepository.save(setting);
    }
  }
}
