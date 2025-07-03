import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentConfig } from '../entities/payment-config.entity';
import { CreatePaymentConfigDto, UpdatePaymentConfigDto } from '../dto/payment-config.dto';

@Injectable()
export class PaymentConfigService {
  constructor(
    @InjectRepository(PaymentConfig)
    private paymentConfigRepository: Repository<PaymentConfig>,
  ) {}

  async getAllConfigs(): Promise<PaymentConfig[]> {
    return this.paymentConfigRepository.find({
      order: { key: 'ASC' },
    });
  }

  async getConfigByKey(key: string): Promise<PaymentConfig> {
    const config = await this.paymentConfigRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Payment config with key '${key}' not found`);
    }
    return config;
  }

  async getConfigValue(key: string): Promise<string | null> {
    const config = await this.paymentConfigRepository.findOne({ 
      where: { key, isActive: true } 
    });
    return config?.value || null;
  }

  async createConfig(createDto: CreatePaymentConfigDto): Promise<PaymentConfig> {
    const existingConfig = await this.paymentConfigRepository.findOne({
      where: { key: createDto.key },
    });

    if (existingConfig) {
      throw new ConflictException(`Payment config with key '${createDto.key}' already exists`);
    }

    const config = this.paymentConfigRepository.create(createDto);
    return this.paymentConfigRepository.save(config);
  }

  async updateConfig(key: string, updateDto: UpdatePaymentConfigDto): Promise<PaymentConfig> {
    const config = await this.getConfigByKey(key);
    
    Object.assign(config, updateDto);
    return this.paymentConfigRepository.save(config);
  }

  async deleteConfig(key: string): Promise<void> {
    const config = await this.getConfigByKey(key);
    await this.paymentConfigRepository.remove(config);
  }

  async setConfigValue(key: string, value: string): Promise<PaymentConfig> {
    let config = await this.paymentConfigRepository.findOne({ where: { key } });
    
    if (config) {
      config.value = value;
    } else {
      config = this.paymentConfigRepository.create({
        key,
        value,
        isActive: true,
      });
    }
    
    return this.paymentConfigRepository.save(config);
  }

  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const value = await this.getConfigValue(featureKey);
    return value === 'true' || value === '1';
  }

  async getConfigForMerchant(merchantId: string): Promise<any> {
    // For now, return default config - this could be extended to support merchant-specific configs
    return {
      paymentInterval: 'biweekly',
      gracePeriodDays: 3,
      lateFeeAmount: 25,
      maxRetries: 3,
    };
  }

  calculateDueDate(installmentIndex: number, startDate: Date, interval: string): Date {
    const dueDate = new Date(startDate);
    
    switch (interval) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex * 7));
        break;
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex * 14));
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + installmentIndex);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + (installmentIndex * 14)); // Default to biweekly
    }
    
    return dueDate;
  }

  getIntervalDescription(config: any): string {
    switch (config.paymentInterval) {
      case 'weekly':
        return 'Every week';
      case 'biweekly':
        return 'Every 2 weeks';
      case 'monthly':
        return 'Every month';
      default:
        return 'Every 2 weeks';
    }
  }
}