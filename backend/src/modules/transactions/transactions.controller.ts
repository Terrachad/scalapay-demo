import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Transaction, TransactionStatus, PaymentPlan } from './entities/transaction.entity';
import { UserRole } from '../users/entities/user.entity';

// DTOs will be created in Phase 2, using basic types for now
interface CreateTransactionDto {
  amount: number;
  merchantId: string;
  paymentPlan: PaymentPlan;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface UpdateTransactionDto {
  status?: TransactionStatus;
}

interface TransactionFilterDto {
  status?: TransactionStatus;
  userId?: string;
  merchantId?: string;
  page?: number;
  limit?: number;
}

@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: any,
  ): Promise<Transaction> {
    try {
      return await this.transactionsService.create({
        ...createTransactionDto,
        userId: req.user.id,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create transaction',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(
    @Query() filterDto: TransactionFilterDto,
    @Request() req: any,
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, ...filters } = filterDto;
    
    // Filter by user role
    if (req.user.role === UserRole.CUSTOMER) {
      filters.userId = req.user.id;
    } else if (req.user.role === UserRole.MERCHANT) {
      filters.merchantId = req.user.merchantId;
    }
    // Admin can see all transactions without additional filters

    const result = await this.transactionsService.findAll(filters, page, limit);
    return {
      transactions: result.transactions,
      total: result.total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.findOne(id);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Check permissions
    if (req.user.role === UserRole.CUSTOMER && transaction.user.id !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    
    if (req.user.role === UserRole.MERCHANT && transaction.merchant.id !== req.user.merchantId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return transaction;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req: any,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.findOne(id);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Only admin can update transaction status, or merchants can update their own
    if (req.user.role === UserRole.CUSTOMER) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    if (req.user.role === UserRole.MERCHANT && transaction.merchant.id !== req.user.merchantId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.transactionsService.update(id, updateTransactionDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update transaction',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  async cancel(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const transaction = await this.transactionsService.findOne(id);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Merchants can only cancel their own transactions
    if (req.user.role === UserRole.MERCHANT && transaction.merchant.id !== req.user.merchantId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      await this.transactionsService.cancel(id);
      return { message: 'Transaction cancelled successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel transaction',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/retry-payment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
  async retryPayment(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<Transaction> {
    const transaction = await this.transactionsService.findOne(id);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Customers can only retry their own transactions
    if (req.user.role === UserRole.CUSTOMER && transaction.user.id !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.transactionsService.retryPayment(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retry payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/payments')
  async getPayments(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const transaction = await this.transactionsService.findOne(id);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Check permissions
    if (req.user.role === UserRole.CUSTOMER && transaction.user.id !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    
    if (req.user.role === UserRole.MERCHANT && transaction.merchant.id !== req.user.merchantId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return await this.transactionsService.getPaymentSchedule(id);
  }
}