import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlatformSettingHistory, SettingOperation } from '../entities/platform-setting-history.entity';
import { SettingChangeData, AuditReport, AuditReportFilters, AuditSummary, PlatformSettingHistoryResponse } from '../dto/platform-settings.dto';
import { User } from '../../users/entities/user.entity';

export class SettingAuditEvent {
  constructor(
    public readonly auditId: string,
    public readonly key: string,
    public readonly operation: SettingOperation,
    public readonly changedBy: string,
    public readonly timestamp: Date
  ) {}
}

@Injectable()
export class SettingsAuditService {
  private readonly logger = new Logger(SettingsAuditService.name);

  constructor(
    @InjectRepository(PlatformSettingHistory)
    private readonly historyRepository: Repository<PlatformSettingHistory>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async logSettingChange(changeData: SettingChangeData): Promise<void> {
    try {
      const auditRecord = await this.historyRepository.save({
        settingId: changeData.settingId,
        key: changeData.key,
        oldValue: changeData.oldValue,
        newValue: changeData.newValue,
        operation: changeData.operation,
        reason: changeData.reason,
        changedBy: { id: changeData.changedBy } as User,
        ipAddress: changeData.context.ipAddress,
        userAgent: changeData.context.userAgent,
        requestId: changeData.context.requestId
      });

      // Emit audit event for real-time monitoring
      this.eventEmitter.emit('setting.audit', new SettingAuditEvent(
        auditRecord.id,
        changeData.key,
        changeData.operation,
        changeData.changedBy,
        new Date()
      ));

      // Log critical changes for immediate alerting
      if (this.isCriticalChange(changeData.key, changeData.oldValue, changeData.newValue)) {
        this.logger.warn(`CRITICAL SETTING CHANGE: ${changeData.key}`, {
          userId: changeData.changedBy,
          oldValue: changeData.oldValue,
          newValue: changeData.newValue,
          reason: changeData.reason,
          requestId: changeData.context.requestId
        });
      }

    } catch (error) {
      this.logger.error('Failed to log setting change:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async getAuditReport(
    startDate: Date,
    endDate: Date,
    filters?: AuditReportFilters
  ): Promise<AuditReport> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.changedBy', 'user')
      .where('history.changedAt >= :startDate', { startDate })
      .andWhere('history.changedAt <= :endDate', { endDate });

    if (filters?.userId) {
      queryBuilder.andWhere('history.changedBy = :userId', { userId: filters.userId });
    }

    if (filters?.category) {
      queryBuilder.andWhere('history.key LIKE :category', { category: `${filters.category}%` });
    }

    if (filters?.operation) {
      queryBuilder.andWhere('history.operation = :operation', { operation: filters.operation });
    }

    const [changes, totalCount] = await queryBuilder
      .orderBy('history.changedAt', 'DESC')
      .take(filters?.limit || 100)
      .skip(filters?.offset || 0)
      .getManyAndCount();

    return {
      changes,
      totalCount,
      period: { startDate, endDate },
      summary: await this.generateAuditSummary(changes)
    };
  }

  async getSettingHistory(
    key: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PlatformSettingHistoryResponse> {
    const [history, total] = await this.historyRepository.findAndCount({
      where: { key },
      order: { changedAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['changedBy']
    });

    return {
      history: history.map(h => ({
        ...h,
        changedBy: h.changedBy ? {
          id: h.changedBy.id,
          email: h.changedBy.email,
          // Note: firstName and lastName might not exist on User entity
          // firstName: h.changedBy.firstName,
          // lastName: h.changedBy.lastName
        } : null
      })),
      total,
      limit,
      offset
    };
  }

  private isCriticalChange(key: string, oldValue: any, newValue: any): boolean {
    const criticalSettings = [
      'defaultCreditLimit',
      'maxCreditLimit',
      'merchantFeeRate',
      'requireTwoFactor',
      'sessionTimeoutMinutes',
      'maxLoginAttempts',
      'maintenanceMode'
    ];

    return criticalSettings.includes(key) || 
           (typeof oldValue === 'number' && typeof newValue === 'number' && 
            Math.abs(newValue - oldValue) / oldValue > 0.5); // 50% change threshold
  }

  private async generateAuditSummary(changes: PlatformSettingHistory[]): Promise<AuditSummary> {
    const summary: AuditSummary = {
      totalChanges: changes.length,
      uniqueUsers: new Set(changes.map(c => c.changedBy?.id).filter(Boolean)).size,
      operationCounts: {
        CREATE: changes.filter(c => c.operation === SettingOperation.CREATE).length,
        UPDATE: changes.filter(c => c.operation === SettingOperation.UPDATE).length,
        DELETE: changes.filter(c => c.operation === SettingOperation.DELETE).length
      },
      criticalChanges: changes.filter(c => 
        this.isCriticalChange(c.key, c.oldValue, c.newValue)
      ).length,
      mostChangedSettings: this.getMostChangedSettings(changes, 10)
    };

    return summary;
  }

  private getMostChangedSettings(
    changes: PlatformSettingHistory[], 
    limit: number
  ): { key: string; count: number }[] {
    const counts = changes.reduce((acc, change) => {
      acc[change.key] = (acc[change.key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }));
  }
}