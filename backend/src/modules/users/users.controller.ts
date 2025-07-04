import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import {
  UpdateUserProfileDto,
  UpdateNotificationPreferencesDto,
  UpdateSecurityPreferencesDto,
  UserProfileResponseDto,
  NotificationPreferences,
  SecurityPreferences,
} from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin analytics' })
  @ApiResponse({ status: 200, description: 'Admin analytics data' })
  async getAdminAnalytics() {
    return this.usersService.getAdminAnalytics();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query('role') role?: UserRole) {
    return this.usersService.getUsersByRole(role);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated user' })
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.updateUser(id, updateData);
  }

  @Get('pending-approvals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending user approvals (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users pending approval' })
  async getPendingApprovals() {
    return this.usersService.getPendingApprovals();
  }

  @Put(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve user (admin only)' })
  @ApiResponse({ status: 200, description: 'User approved' })
  async approveUser(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Put(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject user (admin only)' })
  @ApiResponse({ status: 200, description: 'User rejected' })
  async rejectUser(@Param('id') id: string) {
    return this.usersService.rejectUser(id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // User Profile Management Endpoints

  @Get('profile/extended')
  @ApiOperation({ summary: 'Get extended user profile' })
  @ApiResponse({ status: 200, description: 'Extended user profile', type: UserProfileResponseDto })
  async getExtendedProfile(@Request() req: any): Promise<UserProfileResponseDto> {
    return this.usersService.getUserProfile(req.user.id);
  }

  @Put('profile/update')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserProfileResponseDto })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: any,
  ): Promise<UserProfileResponseDto> {
    try {
      console.log('Raw request body:', updateData);
      console.log('User ID:', req.user.id);

      await this.usersService.updateUserProfile(req.user.id, updateData);
      return this.usersService.getUserProfile(req.user.id);
    } catch (error) {
      console.error('Profile update controller error:', error);
      if (error instanceof BadRequestException) {
        console.error('Validation error details:', error.getResponse());
      }
      throw error;
    }
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences',
    type: NotificationPreferences,
  })
  async getNotificationPreferences(@Request() req: any): Promise<NotificationPreferences> {
    return this.usersService.getNotificationPreferences(req.user.id);
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated',
    type: NotificationPreferences,
  })
  async updateNotificationPreferences(
    @Request() req: any,
    @Body() updateData: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    await this.usersService.updateNotificationPreferences(req.user.id, updateData);
    return this.usersService.getNotificationPreferences(req.user.id);
  }

  @Get('security-preferences')
  @ApiOperation({ summary: 'Get user security preferences' })
  @ApiResponse({ status: 200, description: 'Security preferences', type: SecurityPreferences })
  async getSecurityPreferences(@Request() req: any): Promise<SecurityPreferences> {
    return this.usersService.getSecurityPreferences(req.user.id);
  }

  @Put('security-preferences')
  @ApiOperation({ summary: 'Update user security preferences' })
  @ApiResponse({
    status: 200,
    description: 'Security preferences updated',
    type: SecurityPreferences,
  })
  async updateSecurityPreferences(
    @Request() req: any,
    @Body() updateData: UpdateSecurityPreferencesDto,
  ): Promise<SecurityPreferences> {
    await this.usersService.updateSecurityPreferences(req.user.id, updateData);
    return this.usersService.getSecurityPreferences(req.user.id);
  }
}
