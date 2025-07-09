import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export type SortingMethod = 'hybrid' | 'installmentNumber' | 'dueDate';
export type SortingOrder = 'ASC' | 'DESC';

export interface SortingOptions {
  sortBy: SortingMethod;
  order: SortingOrder;
  validateSequence?: boolean;
  repairSequence?: boolean;
}

export interface SortingResult<T> {
  items: T[];
  validationIssues: ValidationIssue[];
  repairActions: RepairAction[];
  performance: PerformanceMetrics;
}

export interface ValidationIssue {
  type: 'warning' | 'error' | 'info';
  message: string;
  affectedItems: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction?: string;
}

export interface RepairAction {
  type: 'renumber' | 'reorder' | 'update_status' | 'fix_amount';
  description: string;
  affectedItems: string[];
  executed: boolean;
  result?: string;
}

export interface PerformanceMetrics {
  sortingTime: number;
  validationTime: number;
  repairTime: number;
  itemCount: number;
  cacheHit: boolean;
}

@Injectable()
export class UnifiedPaymentSortingService {
  private readonly logger = new Logger(UnifiedPaymentSortingService.name);
  private readonly cache = new Map<string, { result: any; timestamp: number }>();
  private readonly cacheTimeout = 300000; // 5 minutes

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Sort transactions with their payments using unified enterprise logic
   */
  async sortTransactionsWithPayments(
    transactions: Transaction[],
    options: SortingOptions = { sortBy: 'hybrid', order: 'ASC' },
  ): Promise<SortingResult<Transaction>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('transactions', transactions, options);

    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      this.logger.debug('Cache hit for transaction sorting');
      return cachedResult;
    }

    const validationIssues: ValidationIssue[] = [];
    const repairActions: RepairAction[] = [];
    let validationTime = 0;
    let repairTime = 0;

    try {
      // Sort each transaction's payments
      const sortedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          const sortedPayments = await this.sortPayments(transaction.payments || [], options);

          // Collect validation issues
          validationIssues.push(...sortedPayments.validationIssues);
          repairActions.push(...sortedPayments.repairActions);
          validationTime += sortedPayments.performance.validationTime;
          repairTime += sortedPayments.performance.repairTime;

          return {
            ...transaction,
            payments: sortedPayments.items,
          };
        }),
      );

      // Sort transactions by their first payment due date
      const finalSortedTransactions = this.sortTransactionsByFirstPayment(
        sortedTransactions,
        options.order,
      );

      const result: SortingResult<Transaction> = {
        items: finalSortedTransactions,
        validationIssues,
        repairActions,
        performance: {
          sortingTime: Date.now() - startTime,
          validationTime,
          repairTime,
          itemCount: transactions.length,
          cacheHit: false,
        },
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      this.logger.error('Error sorting transactions with payments', error);
      throw error;
    }
  }

  /**
   * Sort payments using unified enterprise logic
   */
  async sortPayments(
    payments: Payment[],
    options: SortingOptions = { sortBy: 'hybrid', order: 'ASC' },
  ): Promise<SortingResult<Payment>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('payments', payments, options);

    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      this.logger.debug('Cache hit for payment sorting');
      return cachedResult;
    }

    const validationIssues: ValidationIssue[] = [];
    const repairActions: RepairAction[] = [];
    let validationTime = 0;
    let repairTime = 0;

    // Validate sequence if requested
    if (options.validateSequence) {
      const validationStart = Date.now();
      const validation = this.validatePaymentSequence(payments);
      validationIssues.push(...validation.issues);
      validationTime = Date.now() - validationStart;
    }

    // Repair sequence if requested and issues found
    let paymentsToSort = payments;
    if (options.repairSequence && validationIssues.some((issue) => issue.type === 'error')) {
      const repairStart = Date.now();
      const repairResult = await this.repairPaymentSequence(payments);
      paymentsToSort = repairResult.repairedPayments;
      repairActions.push(...repairResult.actions);
      repairTime = Date.now() - repairStart;
    }

    // Sort payments based on selected method
    const sortedPayments = this.applySortingMethod(paymentsToSort, options);

    const result: SortingResult<Payment> = {
      items: sortedPayments,
      validationIssues,
      repairActions,
      performance: {
        sortingTime: Date.now() - startTime,
        validationTime,
        repairTime,
        itemCount: payments.length,
        cacheHit: false,
      },
    };

    // Cache the result
    this.setCachedResult(cacheKey, result);

    return result;
  }

  /**
   * Apply sorting method to payments
   */
  private applySortingMethod(payments: Payment[], options: SortingOptions): Payment[] {
    const { sortBy, order } = options;

    const sortedPayments = [...payments].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'hybrid':
          // Primary: installment number, Secondary: due date
          comparison = a.installmentNumber - b.installmentNumber;
          if (comparison === 0) {
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          break;

        case 'installmentNumber':
          comparison = a.installmentNumber - b.installmentNumber;
          break;

        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;

        default:
          this.logger.warn(`Unknown sorting method: ${sortBy}, defaulting to hybrid`);
          comparison = a.installmentNumber - b.installmentNumber;
      }

      return order === 'DESC' ? -comparison : comparison;
    });

    return sortedPayments;
  }

  /**
   * Sort transactions by their first payment due date
   */
  private sortTransactionsByFirstPayment(
    transactions: Transaction[],
    order: SortingOrder,
  ): Transaction[] {
    return transactions.sort((a, b) => {
      const firstPaymentA = a.payments?.[0];
      const firstPaymentB = b.payments?.[0];

      if (!firstPaymentA && !firstPaymentB) return 0;
      if (!firstPaymentA) return 1;
      if (!firstPaymentB) return -1;

      const comparison =
        new Date(firstPaymentA.dueDate).getTime() - new Date(firstPaymentB.dueDate).getTime();

      return order === 'DESC' ? -comparison : comparison;
    });
  }

  /**
   * Validate payment sequence integrity
   */
  private validatePaymentSequence(payments: Payment[]): { issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    if (payments.length === 0) {
      return { issues };
    }

    // Check installment number sequence
    const installmentNumbers = payments.map((p) => p.installmentNumber).sort((a, b) => a - b);
    const expectedNumbers = Array.from({ length: payments.length }, (_, i) => i + 1);

    if (JSON.stringify(installmentNumbers) !== JSON.stringify(expectedNumbers)) {
      issues.push({
        type: 'error',
        message: 'Installment numbers are not sequential or have duplicates',
        affectedItems: payments.map((p) => p.id),
        severity: 'high',
        suggestedAction: 'Renumber installments sequentially starting from 1',
      });
    }

    // Check for duplicate installment numbers
    const duplicates = installmentNumbers.filter(
      (num, index) => installmentNumbers.indexOf(num) !== index,
    );

    if (duplicates.length > 0) {
      issues.push({
        type: 'error',
        message: `Duplicate installment numbers found: ${duplicates.join(', ')}`,
        affectedItems: payments
          .filter((p) => duplicates.includes(p.installmentNumber))
          .map((p) => p.id),
        severity: 'critical',
        suggestedAction: 'Remove duplicates and renumber sequence',
      });
    }

    // Check date progression
    const sortedByInstallment = payments.sort((a, b) => a.installmentNumber - b.installmentNumber);
    for (let i = 1; i < sortedByInstallment.length; i++) {
      const current = sortedByInstallment[i];
      const previous = sortedByInstallment[i - 1];

      if (new Date(current.dueDate).getTime() <= new Date(previous.dueDate).getTime()) {
        issues.push({
          type: 'warning',
          message: `Payment ${current.installmentNumber} due date is not after payment ${previous.installmentNumber}`,
          affectedItems: [current.id, previous.id],
          severity: 'medium',
          suggestedAction: 'Adjust due dates to ensure proper progression',
        });
      }
    }

    // Check amount consistency
    const amounts = payments.map((p) => Number(p.amount));
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);

    if (totalAmount <= 0) {
      issues.push({
        type: 'error',
        message: 'Total payment amount is zero or negative',
        affectedItems: payments.map((p) => p.id),
        severity: 'critical',
        suggestedAction: 'Verify payment amounts are positive',
      });
    }

    // Check for zero amounts
    const zeroAmountPayments = payments.filter((p) => Number(p.amount) <= 0);
    if (zeroAmountPayments.length > 0) {
      issues.push({
        type: 'error',
        message: 'Some payments have zero or negative amounts',
        affectedItems: zeroAmountPayments.map((p) => p.id),
        severity: 'high',
        suggestedAction: 'Set all payment amounts to positive values',
      });
    }

    return { issues };
  }

  /**
   * Repair payment sequence issues
   */
  private async repairPaymentSequence(payments: Payment[]): Promise<{
    repairedPayments: Payment[];
    actions: RepairAction[];
  }> {
    const actions: RepairAction[] = [];
    const repairedPayments = [...payments];

    // Repair installment numbers
    const sortedByDueDate = repairedPayments.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    let renumbered = false;
    for (let i = 0; i < sortedByDueDate.length; i++) {
      const expectedNumber = i + 1;
      if (sortedByDueDate[i].installmentNumber !== expectedNumber) {
        sortedByDueDate[i].installmentNumber = expectedNumber;
        renumbered = true;
      }
    }

    if (renumbered) {
      actions.push({
        type: 'renumber',
        description: 'Renumbered installments to sequential order',
        affectedItems: sortedByDueDate.map((p) => p.id),
        executed: true,
        result: 'Success',
      });
    }

    // Fix zero amounts by distributing total evenly
    const zeroAmountPayments = repairedPayments.filter((p) => Number(p.amount) <= 0);
    if (zeroAmountPayments.length > 0) {
      const totalAmount = repairedPayments
        .filter((p) => Number(p.amount) > 0)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (totalAmount > 0) {
        const averageAmount = totalAmount / repairedPayments.length;
        zeroAmountPayments.forEach((payment) => {
          payment.amount = averageAmount;
        });

        actions.push({
          type: 'fix_amount',
          description: 'Fixed zero amounts by distributing total evenly',
          affectedItems: zeroAmountPayments.map((p) => p.id),
          executed: true,
          result: 'Success',
        });
      }
    }

    return { repairedPayments, actions };
  }

  /**
   * Get next payment information
   */
  getNextPaymentInfo(payments: Payment[]): {
    nextPayment: Payment | null;
    upcomingPayments: Payment[];
    overduePayments: Payment[];
  } {
    const now = new Date();

    const scheduledPayments = payments.filter((p) => p.status === PaymentStatus.SCHEDULED);
    const overduePayments = scheduledPayments.filter((p) => new Date(p.dueDate) < now);
    const upcomingPayments = scheduledPayments.filter((p) => new Date(p.dueDate) >= now);

    // Sort upcoming payments by due date
    const sortedUpcoming = upcomingPayments.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    return {
      nextPayment: sortedUpcoming[0] || null,
      upcomingPayments: sortedUpcoming,
      overduePayments,
    };
  }

  /**
   * Generate cache key for sorting operations
   */
  private generateCacheKey(type: string, items: any[], options: SortingOptions): string {
    const itemsHash = items.map((item) => `${item.id}-${item.updatedAt}`).join(',');
    const optionsHash = JSON.stringify(options);
    return `${type}-${Buffer.from(itemsHash + optionsHash).toString('base64')}`;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.result, performance: { ...cached.result.performance, cacheHit: true } };
    }
    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(key: string, result: any): void {
    this.cache.set(key, {
      result: { ...result },
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear cache (for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Payment sorting cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map((e) => e.timestamp);

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }
}
