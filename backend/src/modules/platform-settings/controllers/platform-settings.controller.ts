import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnterpriseAuthGuard } from '../../auth/guards/enterprise-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PlatformSettingsService } from '../services/platform-settings.service';
import { SettingsAuditService } from '../services/settings-audit.service';
import {
  CreateSettingRequest,
  SettingUpdateRequest,
  UpdatePlatformSettingsRequest,
  SettingUpdateResponse,
  BulkUpdateResponse,
  PlatformSettingsResponse,
  PlatformSettingHistoryResponse,
  AuditReport,
  AuditReportFilters,
  ValidationResult,
  ValidateSettingsRequest,
  ValidateSettingsResponse,
  RequestContext,
  SuccessResponse,
  ErrorResponse,
  PlatformSettingsValidationDto,
} from '../dto/platform-settings.dto';
import { PlatformSetting, Environment } from '../entities/platform-setting.entity';
import { PlatformSettingSchema } from '../entities/platform-setting-schema.entity';
import { v4 as uuidv4 } from 'uuid';
import {
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  SETTING_FIELD_METADATA,
} from '../../../shared/platform-settings.types';

@Controller('admin/platform-settings')
@UseGuards(EnterpriseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('Admin Platform Settings')
export class PlatformSettingsController {
  private readonly logger = new Logger(PlatformSettingsController.name);

  constructor(
    private readonly settingsService: PlatformSettingsService,
    private readonly auditService: SettingsAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all platform settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: SuccessResponse,
  })
  @ApiQuery({ name: 'environment', required: false, description: 'Environment filter' })
  async getAllSettings(
    @Query('environment') environment?: string,
    @Req() request?: any,
  ): Promise<SuccessResponse<{ [category: string]: { [key: string]: any } }>> {
    try {
      const context = this.createRequestContext(request);
      const env = environment || context.environment || Environment.DEVELOPMENT;

      this.logger.log(`Getting all platform settings for environment: ${env}`);

      // Get all settings from service (now returns nested categories)
      const settingsData = await this.settingsService.getAllSettings(env);

      // Organize defaults by category
      const defaultsByCategory: { [category: string]: { [key: string]: any } } = {};
      SETTING_FIELD_METADATA.forEach((metadata) => {
        const category = metadata.category;
        const key = metadata.key;
        const defaultValue = DEFAULT_PLATFORM_SETTINGS[key];

        if (!defaultsByCategory[category]) {
          defaultsByCategory[category] = {};
        }
        defaultsByCategory[category][key] = defaultValue;
      });

      // Merge defaults with stored settings
      const finalSettings: { [category: string]: { [key: string]: any } } = {};

      // Start with defaults organized by category
      for (const [category, defaults] of Object.entries(defaultsByCategory)) {
        finalSettings[category] = { ...defaults };
      }

      // Override with stored settings
      if (settingsData && settingsData.settings) {
        for (const [category, categorySettings] of Object.entries(settingsData.settings)) {
          if (typeof categorySettings === 'object' && categorySettings !== null) {
            if (!finalSettings[category]) {
              finalSettings[category] = {};
            }
            Object.assign(finalSettings[category], categorySettings);
          }
        }
      }

      const totalSettings = Object.values(finalSettings).reduce(
        (count, category) => count + Object.keys(category).length,
        0,
      );
      this.logger.log(
        `Successfully retrieved ${totalSettings} platform settings across ${Object.keys(finalSettings).length} categories`,
      );

      return {
        success: true,
        data: finalSettings,
        timestamp: new Date(),
        requestId: context.requestId,
      };
    } catch (error) {
      this.logger.error('Error retrieving platform settings:', error);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'PLATFORM_SETTINGS_RETRIEVAL_ERROR',
            message: 'Failed to retrieve platform settings',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
            requestId: uuidv4(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific setting by key' })
  @ApiResponse({ status: 200, description: 'Setting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSettingByKey(
    @Param('key') key: string,
    @Query('environment') environment?: string,
    @Req() request?: any,
  ): Promise<{ key: string; value: any; lastUpdated: Date }> {
    const context = this.createRequestContext(request);
    const value = await this.settingsService.getSettingByKey(
      key,
      environment || context.environment,
    );

    return {
      key,
      value,
      lastUpdated: new Date(),
    };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update specific setting' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid setting value' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async updateSetting(
    @Param('key') key: string,
    @Body() updateData: { value: any; reason?: string },
    @Req() request?: any,
  ): Promise<{ success: boolean; setting: PlatformSetting }> {
    const context = this.createRequestContext(request);
    const userId = request.user.id;

    const setting = await this.settingsService.updateSetting(
      key,
      updateData.value,
      userId,
      updateData.reason || 'Updated via admin panel',
      context,
    );

    return {
      success: true,
      setting,
    };
  }

  @Patch()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Bulk update multiple settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully', type: SuccessResponse })
  async bulkUpdateSettings(
    @Body() updateData: UpdatePlatformSettingsRequest,
    @Req() request?: any,
  ): Promise<SuccessResponse<BulkUpdateResponse>> {
    try {
      const context = this.createRequestContext(request);
      const userId = request.user?.id || 'unknown-user';
      const env = updateData.environment || context.environment || Environment.DEVELOPMENT;

      this.logger.log(`Bulk updating ${updateData.updates.length} settings for user: ${userId}`);

      // Validate all updates before applying
      for (const update of updateData.updates) {
        if (!(update.key in DEFAULT_PLATFORM_SETTINGS)) {
          throw new HttpException(
            {
              success: false,
              error: {
                code: 'INVALID_SETTING_KEY',
                message: `Invalid setting key: ${String(update.key)}`,
                details: { invalidKey: update.key },
                timestamp: new Date(),
                requestId: context.requestId,
              },
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const results = await this.settingsService.bulkUpdateSettings(
        updateData.updates,
        userId,
        updateData.reason || 'Bulk update via admin panel',
        context,
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      this.logger.log(`Bulk update completed: ${successCount} success, ${errorCount} errors`);

      const response: BulkUpdateResponse = {
        results,
        successCount,
        errorCount,
        timestamp: new Date(),
      };

      return {
        success: true,
        data: response,
        timestamp: new Date(),
        requestId: context.requestId,
      };
    } catch (error) {
      this.logger.error('Error in bulk update:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'BULK_UPDATE_ERROR',
            message: 'Failed to update platform settings',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
            requestId: uuidv4(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new setting' })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  @ApiResponse({ status: 409, description: 'Setting already exists' })
  async createSetting(
    @Body() createData: CreateSettingRequest,
    @Req() request?: any,
  ): Promise<{ success: boolean; setting: PlatformSetting }> {
    const context = this.createRequestContext(request);
    const userId = request.user.id;

    const setting = await this.settingsService.createSetting(createData, userId, context);

    return {
      success: true,
      setting,
    };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete setting' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async deleteSetting(
    @Param('key') key: string,
    @Body() deleteData: { reason: string },
    @Req() request?: any,
  ): Promise<{ success: boolean; message: string }> {
    const context = this.createRequestContext(request);
    const userId = request.user.id;

    await this.settingsService.deleteSetting(key, userId, deleteData.reason, context);

    return {
      success: true,
      message: `Setting '${key}' deleted successfully`,
    };
  }

  @Get(':key/history')
  @ApiOperation({ summary: 'Get setting change history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getSettingHistory(
    @Param('key') key: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<PlatformSettingHistoryResponse> {
    return await this.settingsService.getSettingHistory(key, limit, offset);
  }

  @Post(':key/rollback')
  @ApiOperation({ summary: 'Rollback setting to previous value' })
  @ApiResponse({ status: 200, description: 'Setting rolled back successfully' })
  async rollbackSetting(
    @Param('key') key: string,
    @Body() rollbackData: { historyId: string; reason: string },
    @Req() request?: any,
  ): Promise<{ success: boolean; setting: PlatformSetting }> {
    const context = this.createRequestContext(request);
    const userId = request.user.id;

    const setting = await this.settingsService.rollbackSetting(
      key,
      rollbackData.historyId,
      userId,
      rollbackData.reason,
      context,
    );

    return {
      success: true,
      setting,
    };
  }

  @Get('audit/report')
  @ApiOperation({ summary: 'Generate audit report' })
  @ApiResponse({ status: 200, description: 'Audit report generated successfully' })
  async getAuditReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('category') category?: string,
    @Query('operation') operation?: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ): Promise<AuditReport> {
    const filters: AuditReportFilters = {
      userId,
      category,
      operation: operation as any,
      limit,
      offset,
    };

    return await this.auditService.getAuditReport(new Date(startDate), new Date(endDate), filters);
  }

  @Post('validate')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Validate setting values' })
  @ApiResponse({ status: 200, description: 'Validation completed', type: SuccessResponse })
  async validateSettings(
    @Body() validationData: ValidateSettingsRequest,
    @Req() request?: any,
  ): Promise<SuccessResponse<ValidateSettingsResponse>> {
    try {
      const context = this.createRequestContext(request);
      const env = validationData.environment || context.environment || Environment.DEVELOPMENT;

      this.logger.log(`Validating ${Object.keys(validationData.settings).length} settings`);

      const results: ValidationResult[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const [key, value] of Object.entries(validationData.settings)) {
        try {
          // Check if key is valid
          if (!(key in DEFAULT_PLATFORM_SETTINGS)) {
            const error = `Invalid setting key: ${key}`;
            results.push({ key, valid: false, error });
            errors.push(error);
            continue;
          }

          // Get field metadata for validation
          const metadata = SETTING_FIELD_METADATA.find((m: any) => m.key === key);
          if (metadata) {
            // Perform basic validation based on metadata
            const validation = metadata.validation;

            if (metadata.dataType === 'number' && typeof value !== 'number') {
              const error = `${metadata.label} must be a number`;
              results.push({ key, valid: false, error });
              errors.push(error);
              continue;
            }

            if (metadata.dataType === 'boolean' && typeof value !== 'boolean') {
              const error = `${metadata.label} must be a boolean`;
              results.push({ key, valid: false, error });
              errors.push(error);
              continue;
            }

            if (
              validation.min !== undefined &&
              typeof value === 'number' &&
              value < validation.min
            ) {
              const error = `${metadata.label} must be at least ${validation.min}`;
              results.push({ key, valid: false, error });
              errors.push(error);
              continue;
            }

            if (
              validation.max !== undefined &&
              typeof value === 'number' &&
              value > validation.max
            ) {
              const error = `${metadata.label} must be at most ${validation.max}`;
              results.push({ key, valid: false, error });
              errors.push(error);
              continue;
            }

            if (validation.enum && !validation.enum.includes(String(value))) {
              const error = `${metadata.label} must be one of: ${validation.enum.join(', ')}`;
              results.push({ key, valid: false, error });
              errors.push(error);
              continue;
            }
          }

          // Use proper validation service validation with detailed error tracking
          try {
            await this.settingsService.validateSetting(key, value);
          } catch (validationError) {
            this.logger.error(`Service validation failed for ${key}:`, validationError);
            throw validationError;
          }

          results.push({ key, valid: true });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
          this.logger.error(`Validation error for key '${key}' with value '${value}':`, error);
          results.push({ key, valid: false, error: errorMsg });
          errors.push(errorMsg);
        }
      }

      const valid = errors.length === 0;

      this.logger.log(
        `Validation completed: ${results.filter((r) => r.valid).length} valid, ${errors.length} errors`,
      );

      const response: ValidateSettingsResponse = {
        valid,
        results,
        errors,
        warnings,
      };

      return {
        success: true,
        data: response,
        timestamp: new Date(),
        requestId: context.requestId,
      };
    } catch (error) {
      this.logger.error('Error validating settings:', error);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Failed to validate settings',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
            requestId: uuidv4(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for settings system' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async healthCheck(): Promise<{ status: string; components: any }> {
    return await this.settingsService.performHealthCheck();
  }

  private createRequestContext(request: any): RequestContext {
    return {
      requestId: request?.headers?.['x-request-id'] || uuidv4(),
      userId: request?.user?.id,
      ipAddress: request?.ip || request?.connection?.remoteAddress || 'unknown',
      userAgent: request?.headers?.['user-agent'] || 'unknown',
      environment:
        request?.headers?.['x-environment'] || process.env.NODE_ENV || Environment.DEVELOPMENT,
    };
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset platform settings to defaults' })
  @ApiResponse({ status: 200, description: 'Settings reset successfully', type: SuccessResponse })
  async resetToDefaults(@Req() request?: any): Promise<SuccessResponse<PlatformSettings>> {
    try {
      const context = this.createRequestContext(request);
      const userId = request?.user?.id || 'unknown-user';

      this.logger.log(`Resetting platform settings to defaults for user: ${userId}`);

      // Convert defaults to update format
      const updates = Object.entries(DEFAULT_PLATFORM_SETTINGS).map(([key, value]) => ({
        key: key,
        value,
        reason: 'Reset to default values',
      }));

      await this.settingsService.bulkUpdateSettings(
        updates,
        userId,
        'Reset all settings to default values',
        context,
      );

      this.logger.log('Successfully reset platform settings to defaults');

      return {
        success: true,
        data: DEFAULT_PLATFORM_SETTINGS,
        timestamp: new Date(),
        requestId: context.requestId,
      };
    } catch (error) {
      this.logger.error('Error resetting settings:', error);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RESET_ERROR',
            message: 'Failed to reset platform settings',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
            requestId: uuidv4(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('schema')
  @ApiOperation({ summary: 'Get settings schema metadata' })
  @ApiResponse({ status: 200, description: 'Schema retrieved successfully', type: SuccessResponse })
  async getSettingsSchema(): Promise<SuccessResponse<typeof SETTING_FIELD_METADATA>> {
    try {
      this.logger.log('Retrieving settings schema metadata');

      return {
        success: true,
        data: SETTING_FIELD_METADATA,
        timestamp: new Date(),
        requestId: uuidv4(),
      };
    } catch (error) {
      this.logger.error('Error retrieving schema:', error);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SCHEMA_ERROR',
            message: 'Failed to retrieve settings schema',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
            requestId: uuidv4(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
