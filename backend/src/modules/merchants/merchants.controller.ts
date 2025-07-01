import { Controller, Get, Put, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { Merchant } from './entities/merchant.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('merchants')
@ApiBearerAuth()
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active merchants' })
  @ApiResponse({ status: 200, description: 'List of active merchants' })
  async findAll(): Promise<Merchant[]> {
    return this.merchantsService.findAll();
  }

  @Get('demo')
  @ApiOperation({ summary: 'Get demo merchant for development' })
  @ApiResponse({ status: 200, description: 'Demo merchant details' })
  async getDemoMerchant(): Promise<Merchant> {
    return this.merchantsService.findDemoMerchant();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant profile' })
  @ApiResponse({ status: 200, description: 'Merchant profile' })
  async getProfile(@Request() req: any): Promise<Merchant> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.findOne(merchantId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant profile' })
  @ApiResponse({ status: 200, description: 'Updated merchant profile' })
  async updateProfile(@Request() req: any, @Body() updateData: Partial<Merchant>): Promise<Merchant> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.updateProfile(merchantId, updateData);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant analytics' })
  @ApiResponse({ status: 200, description: 'Merchant analytics data' })
  async getAnalytics(@Request() req: any): Promise<any> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.getAnalytics(merchantId);
  }

  @Post('api-key/regenerate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  async regenerateApiKey(@Request() req: any): Promise<{ apiKey: string }> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    const apiKey = await this.merchantsService.generateApiKey(merchantId);
    return { apiKey };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Merchant details' })
  async findOne(@Param('id') id: string): Promise<Merchant> {
    return this.merchantsService.findOne(id);
  }
}