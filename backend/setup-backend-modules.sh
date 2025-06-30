#!/bin/bash

echo "📦 Creating backend modules..."

# Users Module
cat > src/modules/users/users.service.ts << 'EEOF'
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
      select: ['id', 'email', 'password', 'name', 'role'],
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async updateCreditLimit(userId: string, amount: number): Promise<User> {
    const user = await this.findById(userId);
    user.availableCredit = user.availableCredit - amount;
    return this.usersRepository.save(user);
  }
}
EEOF

cat > src/modules/users/users.controller.ts << 'EEOF'
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async findAll() {
    return this.usersService.findAll();
  }
}
EEOF

cat > src/modules/users/users.module.ts << 'EEOF'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
EEOF

# Create JWT Auth Guard
mkdir -p src/modules/auth/guards
cat > src/modules/auth/guards/jwt-auth.guard.ts << 'EEOF'
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
EEOF

# Transactions Module
mkdir -p src/modules/transactions/entities
cat > src/modules/transactions/entities/transaction.entity.ts << 'EEOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentPlan {
  PAY_IN_2 = 'pay_in_2',
  PAY_IN_3 = 'pay_in_3',
  PAY_IN_4 = 'pay_in_4',
}

@Entity('transactions')
@Index(['status', 'createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: PaymentPlan,
  })
  paymentPlan: PaymentPlan;

  @Column({ type: 'json' })
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.transactions)
  user: User;

  @ManyToOne(() => Merchant, merchant => merchant.transactions)
  merchant: Merchant;

  @OneToMany(() => Payment, payment => payment.transaction)
  payments: Payment[];
}
EEOF

# Create WebSocket Module
mkdir -p src/modules/websocket
cat > src/modules/websocket/websocket.gateway.ts << 'EEOF'
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      
      // Join user to their personal room
      client.join(`user:${payload.sub}`);
      
      // Join role-based room
      client.join(`role:${payload.role}`);
      
      this.logger.log(`Client connected: ${client.id} - User: ${payload.sub}`);
    } catch (error) {
      this.logger.error(`Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:analytics')
  handleSubscribeAnalytics(@ConnectedSocket() client: Socket) {
    if (client.data.role === 'merchant' || client.data.role === 'admin') {
      client.join('analytics');
      return { event: 'subscribed', data: 'analytics' };
    }
  }

  // Method to emit transaction updates
  emitTransactionUpdate(userId: string, transaction: any) {
    this.server.to(`user:${userId}`).emit('transaction:update', transaction);
  }

  // Method to emit analytics updates
  emitAnalyticsUpdate(data: any) {
    this.server.to('analytics').emit('analytics:update', data);
  }
}
EEOF

cat > src/modules/websocket/websocket.module.ts << 'EEOF'
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketGateway } from './websocket.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
EEOF

# Create Redis Module
mkdir -p src/modules/redis
cat > src/modules/redis/redis.service.ts << 'EEOF'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get('database.redis.host'),
      port: this.configService.get('database.redis.port'),
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }
}
EEOF

cat > src/modules/redis/redis.module.ts << 'EEOF'
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
EEOF

# Create remaining entity stubs
mkdir -p src/modules/{merchants,payments,analytics,dynamodb}/entities

# Merchant entity
cat > src/modules/merchants/entities/merchant.entity.ts << 'EEOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  businessName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2.5 })
  feePercentage: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, transaction => transaction.merchant)
  transactions: Transaction[];
}
EEOF

# Payment entity
cat > src/modules/payments/entities/payment.entity.ts << 'EEOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SCHEDULED,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  paymentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Transaction, transaction => transaction.payments)
  transaction: Transaction;
}
EEOF

# Create module stubs
for module in merchants payments analytics dynamodb; do
  cat > src/modules/$module/$module.module.ts << EEOF
import { Module } from '@nestjs/common';

@Module({})
export class ${module^}Module {}
EEOF
done

# Create transactions module files
cat > src/modules/transactions/transactions.service.ts << 'EEOF'
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private wsGateway: WebSocketGateway,
  ) {}

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionRepository.create(data);
    const saved = await this.transactionRepository.save(transaction);
    
    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(saved.user.id, saved);
    
    return saved;
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['merchant', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    transaction.status = status;
    const updated = await this.transactionRepository.save(transaction);
    
    // Emit real-time update
    this.wsGateway.emitTransactionUpdate(transaction.user.id, updated);
    
    return updated;
  }
}
EEOF

cat > src/modules/transactions/transactions.module.ts << 'EEOF'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
EEOF

# DynamoDB service
cat > src/modules/dynamodb/dynamodb.service.ts << 'EEOF'
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private docClient: DynamoDBDocumentClient;

  constructor(private configService: ConfigService) {
    const client = new DynamoDBClient({
      endpoint: this.configService.get('database.dynamodb.endpoint'),
      region: this.configService.get('database.dynamodb.region'),
      credentials: {
        accessKeyId: this.configService.get('database.dynamodb.accessKeyId'),
        secretAccessKey: this.configService.get('database.dynamodb.secretAccessKey'),
      },
    });
    
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async onModuleInit() {
    // Initialize tables if needed
  }

  async putItem(tableName: string, item: any): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: tableName,
      Item: item,
    }));
  }

  async getItem(tableName: string, key: any): Promise<any> {
    const result = await this.docClient.send(new GetCommand({
      TableName: tableName,
      Key: key,
    }));
    return result.Item;
  }

  async query(params: any): Promise<any[]> {
    const result = await this.docClient.send(new QueryCommand(params));
    return result.Items || [];
  }
}
EEOF

cat > src/modules/dynamodb/dynamodb.module.ts << 'EEOF'
import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';

@Global()
@Module({
  providers: [DynamoDBService],
  exports: [DynamoDBService],
})
export class DynamoDBModule {}
EEOF

echo "✅ Backend modules created!"
