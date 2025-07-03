import { Controller, Get, Put, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { Merchant } from './entities/merchant.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaymentSettings, NotificationSettings, SecuritySettings, StoreSettings } from './entities/merchant-settings.entity';
import { UpdatePaymentSettingsDto, UpdateNotificationSettingsDto, UpdateSecuritySettingsDto, UpdateStoreSettingsDto } from './dto/merchant-settings.dto';

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
  async updateProfile(
    @Request() req: any,
    @Body() updateData: Partial<Merchant>,
  ): Promise<Merchant> {
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

  // Merchant Settings Endpoints

  @Get('payment-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant payment settings' })
  @ApiResponse({ status: 200, description: 'Payment settings' })
  async getPaymentSettings(@Request() req: any): Promise<PaymentSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.getPaymentSettings(merchantId);
  }

  @Put('payment-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant payment settings' })
  @ApiResponse({ status: 200, description: 'Updated payment settings' })
  async updatePaymentSettings(
    @Request() req: any,
    @Body() updateData: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.updatePaymentSettings(merchantId, updateData);
  }

  @Get('notification-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings' })
  async getNotificationSettings(@Request() req: any): Promise<NotificationSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.getNotificationSettings(merchantId);
  }

  @Put('notification-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant notification settings' })
  @ApiResponse({ status: 200, description: 'Updated notification settings' })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() updateData: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.updateNotificationSettings(merchantId, updateData);
  }

  @Get('security-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant security settings' })
  @ApiResponse({ status: 200, description: 'Security settings' })
  async getSecuritySettings(@Request() req: any): Promise<SecuritySettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.getSecuritySettings(merchantId);
  }

  @Put('security-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant security settings' })
  @ApiResponse({ status: 200, description: 'Updated security settings' })
  async updateSecuritySettings(
    @Request() req: any,
    @Body() updateData: UpdateSecuritySettingsDto,
  ): Promise<SecuritySettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.updateSecuritySettings(merchantId, updateData);
  }

  @Get('store-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get merchant store settings' })
  @ApiResponse({ status: 200, description: 'Store settings' })
  async getStoreSettings(@Request() req: any): Promise<StoreSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.getStoreSettings(merchantId);
  }

  @Put('store-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant store settings' })
  @ApiResponse({ status: 200, description: 'Updated store settings' })
  async updateStoreSettings(
    @Request() req: any,
    @Body() updateData: UpdateStoreSettingsDto,
  ): Promise<StoreSettings> {
    const merchantId = req.user.role === UserRole.MERCHANT ? req.user.merchantId : req.params.id;
    return this.merchantsService.updateStoreSettings(merchantId, updateData);
  }
}
