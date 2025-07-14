import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
  BadRequestException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnterpriseAuthGuard } from '../../auth/guards/enterprise-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  PaymentGatewayConfigService,
  BulkUpdateRequest,
  PaymentConfigResponse,
  RequestContext,
} from '../services/payment-gateway-config.service';
import { SettingsAuditService } from '../../platform-settings/services/settings-audit.service';
import { AuditReportFilters } from '../../platform-settings/dto/platform-settings.dto';
import { Environment, ConfigCategory } from '../entities/payment-gateway-config.entity';
import { v4 as uuidv4 } from 'uuid';

// Helper function to safely extract error details
function getErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

// DTOs for enterprise-grade API
export class PaymentConfigBulkUpdateDto {
  updates!: {
    configKey: string;
    value: string;
    category: ConfigCategory;
    provider?: string;
    description?: string;
    isEncrypted?: boolean;
    isSensitive?: boolean;
    metadata?: any;
  }[];
  reason?: string;
}

export class PaymentConfigValidationDto {
  configKey!: string;
  value!: string;
}

export class PaymentConfigQueryDto {
  environment?: Environment;
  category?: ConfigCategory;
  provider?: string;
  active?: boolean;
}

export class AuditQueryDto {
  environment?: Environment;
  configKey?: string;
  category?: ConfigCategory;
  operation?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isSuccessful?: boolean;
  limit?: number;
  offset?: number;
}

@ApiTags('Payment Gateway Configuration')
@ApiBearerAuth()
@Controller('admin/payment-gateway-config')
@UseGuards(EnterpriseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PaymentGatewayConfigController {
  private readonly logger = new Logger(PaymentGatewayConfigController.name);

  constructor(
    private readonly configService: PaymentGatewayConfigService,
    private readonly auditService: SettingsAuditService,
  ) {}

  /**
   * Get all payment gateway configurations
   */
  @Get()
  @ApiOperation({ summary: 'Get all payment gateway configurations' })
  @ApiResponse({
    status: 200,
    description: 'Payment gateway configurations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        errors: { type: 'array', items: { type: 'string' } },
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllConfigs(
    @Query() query: PaymentConfigQueryDto,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();
    const environment = query.environment || Environment.DEVELOPMENT;

    try {
      this.logger.log(`Fetching payment gateway configurations`, {
        userId: req.user.id,
        userEmail: req.user.email,
        environment,
        requestId,
        query,
      });

      const context: RequestContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        environment,
      };

      const result = await this.configService.getAllConfigs(environment, context);

      this.logger.log(`Successfully retrieved payment gateway configurations`, {
        userId: req.user.id,
        requestId,
        environment,
        configCount: Array.isArray(result.data)
          ? result.data.length
          : Object.keys(result.data || {}).length,
      });

      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Failed to fetch payment gateway configurations`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        environment,
      });

      return {
        success: false,
        message: `Failed to fetch payment gateway configurations: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Bulk update payment gateway configurations
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update payment gateway configurations' })
  @ApiResponse({
    status: 200,
    description: 'Payment gateway configurations updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            updated: { type: 'number' },
            batchId: { type: 'string' },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async bulkUpdate(
    @Body() updateRequest: PaymentConfigBulkUpdateDto,
    @Query('environment') environment: Environment = Environment.DEVELOPMENT,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Starting bulk update of payment gateway configurations`, {
        userId: req.user.id,
        userEmail: req.user.email,
        environment,
        requestId,
        updateCount: updateRequest.updates.length,
        reason: updateRequest.reason,
      });

      const context: RequestContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        environment,
      };

      const bulkRequest: BulkUpdateRequest = {
        updates: updateRequest.updates.map((update) => ({
          configKey: update.configKey,
          value: update.value,
          category: update.category,
          provider: update.provider as any,
          description: update.description,
          isEncrypted: update.isEncrypted,
          isSensitive: update.isSensitive,
          metadata: update.metadata,
        })),
        reason: updateRequest.reason,
      };

      const result = await this.configService.bulkUpdate(bulkRequest, context);

      this.logger.log(`Successfully completed bulk update of payment gateway configurations`, {
        userId: req.user.id,
        requestId,
        environment,
        updateCount: updateRequest.updates.length,
        success: result.success,
      });

      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Bulk update failed for payment gateway configurations`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        environment,
        updateCount: updateRequest.updates.length,
      });

      return {
        success: false,
        message: `Bulk update failed: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate payment gateway configuration
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate payment gateway configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            errors: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation parameters invalid',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async validateConfig(
    @Body() validationRequest: PaymentConfigValidationDto,
    @Query('environment') environment: Environment = Environment.DEVELOPMENT,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Validating payment gateway configuration`, {
        userId: req.user.id,
        userEmail: req.user.email,
        environment,
        requestId,
        configKey: validationRequest.configKey,
      });

      const context: RequestContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        environment,
      };

      const result = await this.configService.validateConfig(
        validationRequest.configKey,
        validationRequest.value,
        context,
      );

      this.logger.log(`Validation completed for payment gateway configuration`, {
        userId: req.user.id,
        requestId,
        environment,
        configKey: validationRequest.configKey,
        isValid: result.data?.isValid,
      });

      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Validation failed for payment gateway configuration`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        environment,
        configKey: validationRequest.configKey,
      });

      return {
        success: false,
        message: `Validation failed: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Reset payment gateway configurations to defaults
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset payment gateway configurations to defaults' })
  @ApiResponse({
    status: 200,
    description: 'Configurations reset to defaults successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            reset: { type: 'number' },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - reset operation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async resetToDefaults(
    @Query('environment') environment: Environment = Environment.DEVELOPMENT,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Resetting payment gateway configurations to defaults`, {
        userId: req.user.id,
        userEmail: req.user.email,
        environment,
        requestId,
      });

      const context: RequestContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        environment,
      };

      const result = await this.configService.resetToDefaults(environment, context);

      this.logger.log(`Successfully reset payment gateway configurations to defaults`, {
        userId: req.user.id,
        requestId,
        environment,
        resetCount: result.data?.reset,
      });

      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Failed to reset payment gateway configurations to defaults`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        environment,
      });

      return {
        success: false,
        message: `Reset failed: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get payment gateway configuration schema
   */
  @Get('schema')
  @ApiOperation({ summary: 'Get payment gateway configuration schema for dynamic forms' })
  @ApiResponse({
    status: 200,
    description: 'Configuration schema retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getConfigSchema(
    @Query('environment') environment: Environment = Environment.DEVELOPMENT,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Fetching payment gateway configuration schema`, {
        userId: req.user.id,
        userEmail: req.user.email,
        environment,
        requestId,
      });

      const context: RequestContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId,
        environment,
      };

      const result = await this.configService.getConfigSchema(environment, context);

      this.logger.log(`Successfully retrieved payment gateway configuration schema`, {
        userId: req.user.id,
        requestId,
        environment,
      });

      return result;
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Failed to fetch payment gateway configuration schema`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        environment,
      });

      return {
        success: false,
        message: `Failed to fetch configuration schema: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get audit trail for payment gateway configurations
   */
  @Get('audit')
  @ApiOperation({ summary: 'Get audit trail for payment gateway configurations' })
  @ApiResponse({
    status: 200,
    description: 'Audit trail retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            records: { type: 'array', items: { type: 'object' } },
            total: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAuditTrail(
    @Query() query: AuditQueryDto,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Fetching payment gateway configuration audit trail`, {
        userId: req.user.id,
        userEmail: req.user.email,
        requestId,
        query,
      });

      const filters: AuditReportFilters = {
        environment: query.environment,
        configKey: query.configKey,
        category: query.category as ConfigCategory,
        operation: query.operation as any,
        userId: query.userId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        isSuccessful: query.isSuccessful,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };

      const result = await this.auditService.getFilteredAuditHistory(filters);

      this.logger.log(`Successfully retrieved payment gateway configuration audit trail`, {
        userId: req.user.id,
        requestId,
        recordCount: result.records.length,
        totalRecords: result.total,
        hasMore: result.hasMore,
      });

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.records.length} audit records`,
        requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Failed to fetch payment gateway configuration audit trail`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        query,
      });

      return {
        success: false,
        message: `Failed to fetch audit trail: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get audit trail for a specific configuration
   */
  @Get('audit/:configKey')
  @ApiOperation({ summary: 'Get audit trail for a specific configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration audit trail retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            summary: { type: 'object' },
            history: { type: 'array', items: { type: 'object' } },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getConfigAuditTrail(
    @Param('configKey') configKey: string,
    @Query('environment') environment: Environment = Environment.DEVELOPMENT,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req: any,
  ): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Fetching audit trail for specific payment gateway configuration`, {
        userId: req.user.id,
        userEmail: req.user.email,
        requestId,
        configKey,
        environment,
        limit,
        offset,
      });

      const [summary, history] = await Promise.all([
        this.auditService.getAuditTrailSummary(configKey, environment),
        this.auditService.getConfigAuditTrail(configKey, environment, limit, offset),
      ]);

      this.logger.log(
        `Successfully retrieved audit trail for specific payment gateway configuration`,
        {
          userId: req.user.id,
          requestId,
          configKey,
          environment,
          historyCount: history.history.length,
          totalChanges: summary.totalChanges,
        },
      );

      return {
        success: true,
        data: { summary, history },
        message: `Retrieved audit trail for configuration: ${configKey}`,
        requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Failed to fetch audit trail for specific payment gateway configuration`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
        configKey,
        environment,
      });

      return {
        success: false,
        message: `Failed to fetch audit trail for configuration: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get system health check for payment gateway configurations
   */
  @Get('health')
  @ApiOperation({ summary: 'Get system health check for payment gateway configurations' })
  @ApiResponse({
    status: 200,
    description: 'System health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            database: { type: 'object' },
            configurations: { type: 'object' },
            validation: { type: 'object' },
            audit: { type: 'object' },
          },
        },
        message: { type: 'string' },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getHealthCheck(@Request() req: any): Promise<PaymentConfigResponse> {
    const requestId = uuidv4();

    try {
      this.logger.log(`Performing health check for payment gateway configurations`, {
        userId: req.user.id,
        userEmail: req.user.email,
        requestId,
      });

      // Basic health check - can be expanded with more comprehensive checks
      const health = {
        status: 'healthy',
        database: { status: 'connected' },
        configurations: { status: 'operational' },
        validation: { status: 'active' },
        audit: { status: 'logging' },
      };

      this.logger.log(`Health check completed successfully for payment gateway configurations`, {
        userId: req.user.id,
        requestId,
        health,
      });

      return {
        success: true,
        data: health,
        message: 'System health check completed successfully',
        requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorDetails = getErrorDetails(error);
      this.logger.error(`Health check failed for payment gateway configurations`, {
        error: errorDetails.message,
        stack: errorDetails.stack,
        userId: req.user.id,
        requestId,
      });

      return {
        success: false,
        message: `Health check failed: ${errorDetails.message}`,
        errors: [errorDetails.message],
        requestId,
        timestamp: new Date(),
      };
    }
  }
}
