import { Injectable } from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { TransactionFilterDto } from '../dto/transaction-filter.dto';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {
    super(Transaction, dataSource.createEntityManager());
  }

  async findWithFilters(
    filters: TransactionFilterDto,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .leftJoinAndSelect('transaction.payments', 'payments');

    this.applyFilters(queryBuilder, filters);

    const [transactions, total] = await queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .addOrderBy('payments.installmentNumber', 'ASC')
      .addOrderBy('payments.dueDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Sort payments within each transaction
    transactions.forEach((transaction) => {
      if (transaction.payments) {
        transaction.payments.sort((a, b) => {
          const aInstallment = a.installmentNumber ?? 999;
          const bInstallment = b.installmentNumber ?? 999;
          if (aInstallment !== bInstallment) {
            return aInstallment - bInstallment;
          }
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      }
    });

    return { transactions, total };
  }

  async findByUserWithStatus(userId: string, status: TransactionStatus): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.find({
      where: { userId, status },
      relations: ['user', 'merchant', 'payments'],
      order: { createdAt: 'DESC' },
    });

    // Sort payments within each transaction
    transactions.forEach((transaction) => {
      if (transaction.payments) {
        transaction.payments.sort((a, b) => {
          const aInstallment = a.installmentNumber ?? 999;
          const bInstallment = b.installmentNumber ?? 999;
          if (aInstallment !== bInstallment) {
            return aInstallment - bInstallment;
          }
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      }
    });

    return transactions;
  }

  async findByMerchantWithDateRange(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const transactions = await this.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .leftJoinAndSelect('transaction.payments', 'payments')
      .where('transaction.merchantId = :merchantId', { merchantId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('transaction.createdAt', 'DESC')
      .addOrderBy('payments.installmentNumber', 'ASC')
      .addOrderBy('payments.dueDate', 'ASC')
      .getMany();

    // Sort payments within each transaction
    transactions.forEach((transaction) => {
      if (transaction.payments) {
        transaction.payments.sort((a, b) => {
          const aInstallment = a.installmentNumber ?? 999;
          const bInstallment = b.installmentNumber ?? 999;
          if (aInstallment !== bInstallment) {
            return aInstallment - bInstallment;
          }
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      }
    });

    return transactions;
  }

  async getTotalAmountByMerchant(merchantId: string): Promise<number> {
    const result = await this.createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.merchantId = :merchantId', { merchantId })
      .andWhere('transaction.status IN (:...statuses)', {
        statuses: [TransactionStatus.APPROVED, TransactionStatus.COMPLETED],
      })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getTransactionStats(userId?: string, merchantId?: string) {
    const queryBuilder = this.createQueryBuilder('transaction');

    if (userId) {
      queryBuilder.where('transaction.userId = :userId', { userId });
    }
    if (merchantId) {
      queryBuilder.where('transaction.merchantId = :merchantId', { merchantId });
    }

    const [totalAmount, totalCount, pendingCount, approvedCount, completedCount, rejectedCount] =
      await Promise.all([
        queryBuilder
          .select('SUM(transaction.amount)', 'total')
          .getRawOne()
          .then((result) => parseFloat(result.total) || 0),
        queryBuilder.getCount(),
        queryBuilder
          .clone()
          .andWhere('transaction.status = :status', { status: TransactionStatus.PENDING })
          .getCount(),
        queryBuilder
          .clone()
          .andWhere('transaction.status = :status', { status: TransactionStatus.APPROVED })
          .getCount(),
        queryBuilder
          .clone()
          .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
          .getCount(),
        queryBuilder
          .clone()
          .andWhere('transaction.status = :status', { status: TransactionStatus.REJECTED })
          .getCount(),
      ]);

    return {
      totalAmount,
      totalCount,
      statusBreakdown: {
        pending: pendingCount,
        approved: approvedCount,
        completed: completedCount,
        rejected: rejectedCount,
      },
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Transaction>,
    filters: TransactionFilterDto,
  ): void {
    if (filters.status) {
      queryBuilder.andWhere('transaction.status = :status', {
        status: filters.status,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('transaction.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.merchantId) {
      queryBuilder.andWhere('transaction.merchantId = :merchantId', {
        merchantId: filters.merchantId,
      });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }
  }
}
