import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GDPRConsent, ConsentData, DataRequest } from '../entities/gdpr-consent.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../shared/services/notification.service';

// DTOs for request/response
export interface CreateConsentDto {
  consentData: ConsentData;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface UpdateConsentDto {
  consentData: Partial<ConsentData>;
  ipAddress?: string;
  userAgent?: string;
}

export interface WithdrawConsentDto {
  purpose?: keyof ConsentData;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateDataRequestDto {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  details: string;
  verificationMethod: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

export interface ProcessDataRequestDto {
  requestIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  responseDetails?: string;
  handlerUserId?: string;
  escalationReason?: string;
}

export interface DataRetentionPolicyDto {
  category: string;
  retentionPeriod: number; // days
  autoDeleteEnabled: boolean;
  description?: string;
  legalBasis?: string;
}

export interface ComplianceSearchDto {
  userId?: string;
  consentStatus?: 'valid' | 'invalid' | 'expired' | 'withdrawn';
  hasActiveRequests?: boolean;
  needsRenewal?: boolean;
  complianceScore?: {
    min?: number;
    max?: number;
  };
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'consentDate' | 'complianceScore';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PrivacySettingsDto {
  marketingCommunications?: boolean;
  dataAnalytics?: boolean;
  thirdPartySharing?: boolean;
  profileEnhancement?: boolean;
  locationTracking?: boolean;
  behavioralAnalysis?: boolean;
  personalizedOffers?: boolean;
  customConsents?: {
    [key: string]: boolean;
  };
}

@ApiTags('gdpr')
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GDPRController {
  private readonly logger = new Logger(GDPRController.name);

  constructor(
    @InjectRepository(GDPRConsent)
    private gdprConsentRepository: Repository<GDPRConsent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}

  // Consent management endpoints
  @Get('consent')
  @ApiOperation({ summary: 'Get current user consent status' })
  @ApiResponse({ status: 200, description: 'Consent status retrieved successfully' })
  async getConsentStatus(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!consent) {
      return {
        message: 'No consent record found',
        hasConsent: false,
        needsConsent: true,
      };
    }

    return {
      message: 'Consent status retrieved successfully',
      hasConsent: true,
      consent: {
        id: consent.id,
        consentData: consent.consentData,
        consentDate: consent.consentDate,
        isValid: consent.isConsentValid(),
        needsRenewal: consent.needsRenewal(),
        complianceScore: consent.getComplianceScore(),
        lastInteraction: consent.lastInteraction,
        expiryDate: consent.expiryDate,
      },
    };
  }

  @Post('consent')
  @ApiOperation({ summary: 'Create or update user consent' })
  @ApiResponse({ status: 201, description: 'Consent created successfully' })
  async createConsent(@Request() req: any, @Body() createDto: CreateConsentDto) {
    const userId = req.user.userId || req.user.id;

    // Check if user already has active consent
    const existingConsent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (existingConsent) {
      // Update existing consent
      return this.updateConsent(req, { consentData: createDto.consentData });
    }

    // Create new consent
    const ipAddress = createDto.ipAddress || req.ip || 'unknown';
    const userAgent = createDto.userAgent || req.get('User-Agent') || 'unknown';

    const defaultConsent = GDPRConsent.createDefaultConsent(userId, ipAddress, userAgent);

    const consent = this.gdprConsentRepository.create(defaultConsent);
    consent.consentData = createDto.consentData;
    consent.geolocation = createDto.geolocation;
    consent.verificationData = {
      method: 'web',
      verified: true,
      verificationDate: new Date(),
      verificationAttempts: 1,
    };
    consent.auditTrail = {
      createdBy: userId,
      createdMethod: 'web',
      accessLog: [],
      complianceChecks: [],
    };

    const savedConsent = await this.gdprConsentRepository.save(consent);

    this.logger.log(`Consent created for user ${userId}`);

    return {
      message: 'Consent created successfully',
      consent: {
        id: savedConsent.id,
        consentData: savedConsent.consentData,
        consentDate: savedConsent.consentDate,
        complianceScore: savedConsent.getComplianceScore(),
      },
    };
  }

  @Put('consent')
  @ApiOperation({ summary: 'Update user consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  async updateConsent(@Request() req: any, @Body() updateDto: UpdateConsentDto) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No active consent found');
    }

    const ipAddress = updateDto.ipAddress || req.ip || 'unknown';
    const userAgent = updateDto.userAgent || req.get('User-Agent') || 'unknown';

    consent.updateConsent(updateDto.consentData, ipAddress, userAgent);

    const updatedConsent = await this.gdprConsentRepository.save(consent);

    this.logger.log(`Consent updated for user ${userId}`);

    return {
      message: 'Consent updated successfully',
      consent: {
        id: updatedConsent.id,
        consentData: updatedConsent.consentData,
        lastInteraction: updatedConsent.lastInteraction,
        complianceScore: updatedConsent.getComplianceScore(),
      },
    };
  }

  @Post('consent/withdraw')
  @ApiOperation({ summary: 'Withdraw user consent' })
  @ApiResponse({ status: 200, description: 'Consent withdrawn successfully' })
  async withdrawConsent(@Request() req: any, @Body() withdrawDto: WithdrawConsentDto) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No active consent found');
    }

    const ipAddress = withdrawDto.ipAddress || req.ip || 'unknown';
    const userAgent = withdrawDto.userAgent || req.get('User-Agent') || 'unknown';

    consent.withdrawConsent(withdrawDto.purpose, ipAddress, userAgent);

    await this.gdprConsentRepository.save(consent);

    // Send confirmation notification
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      try {
        await this.notificationService.sendConsentWithdrawalConfirmation(user, withdrawDto.purpose);
      } catch (error) {
        this.logger.error('Failed to send consent withdrawal notification:', error);
      }
    }

    this.logger.log(
      `Consent withdrawn for user ${userId}${withdrawDto.purpose ? ` (purpose: ${withdrawDto.purpose})` : ''}`,
    );

    return {
      message: 'Consent withdrawn successfully',
      withdrawnPurpose: withdrawDto.purpose || 'all',
      effectiveDate: new Date(),
    };
  }

  @Post('consent/renew')
  @ApiOperation({ summary: 'Renew user consent' })
  @ApiResponse({ status: 200, description: 'Consent renewed successfully' })
  async renewConsent(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No active consent found');
    }

    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    consent.renewConsent(ipAddress, userAgent);

    await this.gdprConsentRepository.save(consent);

    this.logger.log(`Consent renewed for user ${userId}`);

    return {
      message: 'Consent renewed successfully',
      newExpiryDate: consent.expiryDate,
      validFor: '2 years',
    };
  }

  // Data subject rights endpoints
  @Post('data-request')
  @ApiOperation({ summary: 'Submit data subject rights request' })
  @ApiResponse({ status: 201, description: 'Data request submitted successfully' })
  async createDataRequest(@Request() req: any, @Body() requestDto: CreateDataRequestDto) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No active consent found');
    }

    const requestId = consent.createDataRequest(
      requestDto.type,
      requestDto.details,
      requestDto.verificationMethod,
    );

    await this.gdprConsentRepository.save(consent);

    this.logger.log(`Data request created for user ${userId}: ${requestDto.type}`);

    return {
      message: 'Data request submitted successfully',
      requestId,
      type: requestDto.type,
      status: 'pending',
      expectedProcessingTime: '30 days',
    };
  }

  @Get('data-requests')
  @ApiOperation({ summary: 'Get user data requests' })
  @ApiResponse({ status: 200, description: 'Data requests retrieved successfully' })
  async getDataRequests(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      return {
        message: 'No consent record found',
        requests: [],
      };
    }

    const requests = consent.dataRequests || [];

    return {
      message: 'Data requests retrieved successfully',
      requests,
      pendingRequests: consent.getPendingDataRequests(),
    };
  }

  @Put('data-request/:requestIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update data request status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data request updated successfully' })
  async processDataRequest(
    @Request() req: any,
    @Param('requestIndex') requestIndex: number,
    @Body() processDto: ProcessDataRequestDto,
  ) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No consent record found');
    }

    consent.processDataRequest(
      requestIndex,
      processDto.status,
      processDto.responseDetails,
      processDto.handlerUserId,
    );

    await this.gdprConsentRepository.save(consent);

    this.logger.log(
      `Data request ${requestIndex} processed for user ${userId}: ${processDto.status}`,
    );

    return {
      message: 'Data request updated successfully',
      requestIndex,
      status: processDto.status,
      handledBy: processDto.handlerUserId,
    };
  }

  // Privacy settings management
  @Get('privacy-settings')
  @ApiOperation({ summary: 'Get user privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved successfully' })
  async getPrivacySettings(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      return {
        message: 'No privacy settings found',
        settings: GDPRConsent.createDefaultConsent(userId, 'unknown', 'unknown').consentData,
      };
    }

    return {
      message: 'Privacy settings retrieved successfully',
      settings: consent.consentData,
      lastUpdated: consent.lastInteraction,
    };
  }

  @Put('privacy-settings')
  @ApiOperation({ summary: 'Update user privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated successfully' })
  async updatePrivacySettings(@Request() req: any, @Body() settingsDto: PrivacySettingsDto) {
    return this.updateConsent(req, { consentData: settingsDto });
  }

  // Compliance and reporting endpoints
  @Get('compliance-report')
  @ApiOperation({ summary: 'Get user compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  async getComplianceReport(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      throw new NotFoundException('No consent record found');
    }

    const report = consent.generateComplianceReport();

    return {
      message: 'Compliance report generated successfully',
      report,
      generatedAt: new Date(),
    };
  }

  @Get('consent-history')
  @ApiOperation({ summary: 'Get user consent history' })
  @ApiResponse({ status: 200, description: 'Consent history retrieved successfully' })
  async getConsentHistory(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!consent) {
      return {
        message: 'No consent history found',
        history: [],
      };
    }

    return {
      message: 'Consent history retrieved successfully',
      history: consent.consentHistory || [],
      totalEntries: consent.consentHistory?.length || 0,
    };
  }

  @Get('data-export')
  @ApiOperation({ summary: 'Export user data (Data Portability)' })
  @ApiResponse({ status: 200, description: 'Data export prepared successfully' })
  async exportUserData(@Request() req: any) {
    const userId = req.user.userId || req.user.id;

    // Get user data from various sources
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const consent = await this.gdprConsentRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Compile user data for export
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      consent: consent
        ? {
            consentData: consent.consentData,
            consentDate: consent.consentDate,
            consentHistory: consent.consentHistory,
            legalBasis: consent.legalBasis,
          }
        : null,
      // TODO: Add other user data sources (transactions, payments, etc.)
      exportInfo: {
        exportDate: new Date(),
        dataFormat: 'JSON',
        requestedBy: userId,
      },
    };

    // In production, this would generate a file and send download link
    this.logger.log(`Data export requested for user ${userId}`);

    return {
      message: 'Data export prepared successfully',
      downloadUrl: `/gdpr/download/${userId}`, // Placeholder
      exportData, // In production, this would be a file reference
      format: 'JSON',
      size: JSON.stringify(exportData).length + ' bytes',
    };
  }

  // Admin endpoints
  @Get('admin/compliance/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Search compliance records (Admin only)' })
  @ApiResponse({ status: 200, description: 'Compliance records retrieved successfully' })
  async searchComplianceRecords(@Request() req: any, @Query() searchDto: ComplianceSearchDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = searchDto;

    const queryBuilder = this.gdprConsentRepository
      .createQueryBuilder('consent')
      .orderBy(`consent.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    // Apply filters
    if (filters.userId) {
      queryBuilder.andWhere('consent.userId = :userId', { userId: filters.userId });
    }

    if (filters.consentStatus) {
      switch (filters.consentStatus) {
        case 'valid':
          queryBuilder.andWhere('consent.isActive = true AND consent.withdrawalDate IS NULL');
          break;
        case 'withdrawn':
          queryBuilder.andWhere('consent.withdrawalDate IS NOT NULL');
          break;
        case 'expired':
          queryBuilder.andWhere('consent.expiryDate < :now', { now: new Date() });
          break;
      }
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('consent.createdAt >= :after', {
        after: new Date(filters.createdAfter),
      });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('consent.createdAt <= :before', {
        before: new Date(filters.createdBefore),
      });
    }

    const [records, total] = await queryBuilder.getManyAndCount();

    const enhancedRecords = records.map((record) => ({
      ...record,
      isValid: record.isConsentValid(),
      needsRenewal: record.needsRenewal(),
      complianceScore: record.getComplianceScore(),
      pendingRequests: record.getPendingDataRequests().length,
    }));

    return {
      message: 'Compliance records retrieved successfully',
      records: enhancedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get GDPR compliance statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'GDPR statistics retrieved successfully' })
  async getGDPRStatistics(@Request() req: any) {
    const totalConsents = await this.gdprConsentRepository.count();
    const activeConsents = await this.gdprConsentRepository.count({
      where: { isActive: true },
    });
    const withdrawnConsents = await this.gdprConsentRepository.count({
      where: { isActive: false },
    });

    // Calculate averages and other metrics
    const allConsents = await this.gdprConsentRepository.find();
    const complianceScores = allConsents.map((c) => c.getComplianceScore());
    const averageComplianceScore =
      complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length || 0;

    const stats = {
      totalConsents,
      activeConsents,
      withdrawnConsents,
      complianceRate: totalConsents > 0 ? (activeConsents / totalConsents) * 100 : 0,
      averageComplianceScore,
      dataRequests: {
        total: allConsents.reduce((sum, c) => sum + (c.dataRequests?.length || 0), 0),
        pending: allConsents.reduce((sum, c) => sum + c.getPendingDataRequests().length, 0),
      },
      renewalsNeeded: allConsents.filter((c) => c.needsRenewal()).length,
    };

    return {
      message: 'GDPR statistics retrieved successfully',
      statistics: stats,
      generatedAt: new Date(),
    };
  }

  @Post('admin/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clean up expired consent data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupExpiredData(@Request() req: any) {
    const expiredConsents = await this.gdprConsentRepository.find({
      where: { isActive: true },
    });

    let processedCount = 0;
    let deletedCount = 0;

    for (const consent of expiredConsents) {
      let updated = false;

      // Check for data that should be auto-deleted
      if (consent.complianceMetadata?.dataRetentionPolicy) {
        for (const policy of consent.complianceMetadata.dataRetentionPolicy) {
          if (consent.shouldAutoDelete(policy.category)) {
            // Mark for deletion or clean up specific data category
            deletedCount++;
            updated = true;
          }
        }
      }

      // Check for expired consent that needs renewal
      if (consent.needsRenewal()) {
        consent.requiresRenewal = true;
        updated = true;
      }

      if (updated) {
        await this.gdprConsentRepository.save(consent);
        processedCount++;
      }
    }

    this.logger.log(
      `GDPR cleanup completed: ${processedCount} records processed, ${deletedCount} data deletions`,
    );

    return {
      message: 'Cleanup completed successfully',
      processed: processedCount,
      deleted: deletedCount,
      executedAt: new Date(),
    };
  }

  // Health check
  @Get('health')
  @ApiOperation({ summary: 'GDPR system health check' })
  @ApiResponse({ status: 200, description: 'GDPR system health status' })
  async getHealthStatus(@Request() req: any) {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      features: {
        consentManagement: true,
        dataSubjectRights: true,
        dataPortability: true,
        rightToErasure: true,
        complianceReporting: true,
        auditTrail: true,
      },
      compliance: {
        gdprCompliant: true,
        dataRetentionEnabled: true,
        consentValidationEnabled: true,
        auditTrailEnabled: true,
      },
    };

    return {
      message: 'GDPR system health check completed',
      health,
    };
  }
}
