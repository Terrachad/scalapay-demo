import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnterpriseAuthGuard } from '../auth/guards/enterprise-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('admin')
@Controller('admin')
@UseGuards(EnterpriseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor() {}

  // Platform settings routes have been moved to PlatformSettingsController
  // to eliminate route conflicts and ensure proper service injection

  @Get('pending-merchants')
  @ApiOperation({ summary: 'Get pending merchant approvals (admin only)' })
  @ApiResponse({ status: 200, description: 'Pending merchants retrieved successfully' })
  async getPendingMerchants(): Promise<any[]> {
    this.logger.log('Getting pending merchants');
    // Return empty array for now
    // In a real implementation, this would query the database for pending merchants
    return [];
  }

  @Post('merchants/:id/approve')
  @ApiOperation({ summary: 'Approve merchant account (admin only)' })
  @ApiResponse({ status: 200, description: 'Merchant approved successfully' })
  async approveMerchant(
    @Param('id') merchantId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Approving merchant: ${merchantId}`);

    // In a real implementation, this would update the merchant status in database
    return {
      success: true,
      message: `Merchant ${merchantId} approved successfully`,
    };
  }

  @Post('merchants/:id/reject')
  @ApiOperation({ summary: 'Reject merchant account (admin only)' })
  @ApiResponse({ status: 200, description: 'Merchant rejected successfully' })
  async rejectMerchant(
    @Param('id') merchantId: string,
    @Body() rejectionData: { reason?: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Rejecting merchant: ${merchantId}`, rejectionData);

    // In a real implementation, this would update the merchant status in database
    return {
      success: true,
      message: `Merchant ${merchantId} rejected successfully`,
    };
  }
}
