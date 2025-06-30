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
  UseInterceptors,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { Serialize } from '../../common/interceptors/serialize.interceptor';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 transactions per minute
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: TransactionResponseDto })
  @Serialize(TransactionResponseDto)
  @ApiResponse({ status: 400, description: 'Invalid transaction data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
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