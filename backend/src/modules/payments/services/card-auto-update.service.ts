import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
} from '../entities/payment-method.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../shared/services/notification.service';
import { User } from '../../users/entities/user.entity';

export interface UpdateResult {
  success: boolean;
  paymentMethodId: string;
  updateSource: 'stripe_updater' | 'manual' | 'bank_notification';
  previousDetails?: any;
  newDetails?: any;
  error?: string;
  requiresUserAction?: boolean;
}

export interface UpdateDetails {
  exp_month?: number;
  exp_year?: number;
  last4?: string;
  brand?: string;
  country?: string;
  funding?: string;
}

export interface BulkUpdateResult {
  totalChecked: number;
  totalUpdated: number;
  totalFailed: number;
  totalSkipped: number;
  results: UpdateResult[];
  executionTime: number;
}

@Injectable()
export class CardAutoUpdateService {
  private readonly logger = new Logger(CardAutoUpdateService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {}

  // Daily cron job to process card updates
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processCardUpdates(): Promise<BulkUpdateResult> {
    if (this.isProcessing) {
      this.logger.warn('Card update process already running, skipping...');
      return {
        totalChecked: 0,
        totalUpdated: 0,
        totalFailed: 0,
        totalSkipped: 0,
        results: [],
        executionTime: 0,
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting daily card auto-update process...');

      // Get cards eligible for update check
      const eligibleCards = await this.getCardsEligibleForUpdate();
      this.logger.log(`Found ${eligibleCards.length} cards eligible for update check`);

      const results: UpdateResult[] = [];
      let totalUpdated = 0;
      let totalFailed = 0;
      let totalSkipped = 0;

      // Process cards in batches to avoid overwhelming Stripe API
      const batchSize = 10;
      for (let i = 0; i < eligibleCards.length; i += batchSize) {
        const batch = eligibleCards.slice(i, i + batchSize);

        const batchPromises = batch.map((card) => this.checkSingleCardUpdate(card.id));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);

            if (result.value.success) {
              totalUpdated++;
            } else if (result.value.error) {
              totalFailed++;
            } else {
              totalSkipped++;
            }
          } else {
            totalFailed++;
            results.push({
              success: false,
              paymentMethodId: 'unknown',
              updateSource: 'stripe_updater',
              error: result.reason?.message || 'Unknown error',
            });
          }
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < eligibleCards.length) {
          await this.delay(1000); // 1 second delay
        }
      }

      const executionTime = Date.now() - startTime;
      const bulkResult: BulkUpdateResult = {
        totalChecked: eligibleCards.length,
        totalUpdated,
        totalFailed,
        totalSkipped,
        results,
        executionTime,
      };

      this.logger.log(
        `Card update process completed: ${totalUpdated} updated, ${totalFailed} failed, ${totalSkipped} skipped in ${executionTime}ms`,
      );

      // Send summary notification to administrators
      await this.sendUpdateSummaryNotification(bulkResult);

      return bulkResult;
    } catch (error) {
      this.logger.error('Error in card update process:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async checkSingleCardUpdate(paymentMethodId: string): Promise<UpdateResult> {
    try {
      const paymentMethod = await this.paymentMethodRepository.findOne({
        where: { id: paymentMethodId },
        relations: ['user'],
      });

      if (!paymentMethod) {
        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'Payment method not found',
        };
      }

      if (paymentMethod.type !== PaymentMethodType.CARD) {
        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'Not a card payment method',
        };
      }

      if (!paymentMethod.stripePaymentMethodId) {
        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'No Stripe payment method ID',
        };
      }

      // Check if card is eligible for update
      if (!paymentMethod.isEligibleForAutoUpdate()) {
        paymentMethod.autoUpdateData = {
          ...paymentMethod.autoUpdateData,
          lastUpdateCheck: new Date(),
          updateSource: 'stripe_updater',
          updateHistory: paymentMethod.autoUpdateData?.updateHistory || [],
          autoUpdateEnabled: paymentMethod.autoUpdateData?.autoUpdateEnabled ?? true,
          failedUpdateAttempts: paymentMethod.autoUpdateData?.failedUpdateAttempts || 0,
        };
        await this.paymentMethodRepository.save(paymentMethod);

        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'Not eligible for auto-update',
        };
      }

      // Retrieve latest payment method data from Stripe
      const stripePaymentMethod = await this.stripeService.retrievePaymentMethod(
        paymentMethod.stripePaymentMethodId,
      );

      if (!stripePaymentMethod.card) {
        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'No card data in Stripe payment method',
        };
      }

      // Check if any details have changed
      const currentDetails = paymentMethod.cardDetails;
      const stripeDetails = stripePaymentMethod.card;

      const hasChanges = this.hasCardDetailsChanged(currentDetails, stripeDetails);

      if (!hasChanges) {
        // Update last check time
        paymentMethod.autoUpdateData = {
          ...paymentMethod.autoUpdateData,
          lastUpdateCheck: new Date(),
          nextUpdateCheck: this.calculateNextUpdateCheck(),
          updateSource: 'stripe_updater',
          updateHistory: paymentMethod.autoUpdateData?.updateHistory || [],
          autoUpdateEnabled: paymentMethod.autoUpdateData?.autoUpdateEnabled ?? true,
          failedUpdateAttempts: paymentMethod.autoUpdateData?.failedUpdateAttempts || 0,
        };
        await this.paymentMethodRepository.save(paymentMethod);

        return {
          success: false,
          paymentMethodId,
          updateSource: 'stripe_updater',
          error: 'No changes detected',
        };
      }

      // Update the payment method with new details
      const updateResult = await this.updateCardDetails(
        paymentMethod,
        stripeDetails,
        'Automatic update from Stripe Account Updater',
      );

      return updateResult;
    } catch (error) {
      this.logger.error(`Error checking card update for ${paymentMethodId}:`, error);

      // Record failed update attempt
      try {
        const paymentMethod = await this.paymentMethodRepository.findOne({
          where: { id: paymentMethodId },
        });

        if (paymentMethod) {
          paymentMethod.recordFailedUpdate();
          await this.paymentMethodRepository.save(paymentMethod);
        }
      } catch (saveError) {
        this.logger.error('Error recording failed update:', saveError);
      }

      return {
        success: false,
        paymentMethodId,
        updateSource: 'stripe_updater',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateCardDetails(
    paymentMethod: PaymentMethod,
    newDetails: any,
    reason: string,
  ): Promise<UpdateResult> {
    try {
      const previousDetails = paymentMethod.cardDetails;

      // Update card details
      paymentMethod.cardDetails = {
        brand: newDetails.brand || paymentMethod.cardDetails?.brand || '',
        last4: newDetails.last4 || paymentMethod.cardDetails?.last4 || '',
        exp_month: newDetails.exp_month || paymentMethod.cardDetails?.exp_month || 0,
        exp_year: newDetails.exp_year || paymentMethod.cardDetails?.exp_year || 0,
        funding: newDetails.funding || paymentMethod.cardDetails?.funding || 'credit',
        country: newDetails.country || paymentMethod.cardDetails?.country || 'US',
      };

      // Update expiration date
      if (newDetails.exp_month && newDetails.exp_year) {
        paymentMethod.expiresAt = new Date(newDetails.exp_year, newDetails.exp_month - 1, 1);
      }

      // Record the update
      paymentMethod.recordCardUpdate('stripe_updater', newDetails, reason);

      // Save the updated payment method
      await this.paymentMethodRepository.save(paymentMethod);

      // Send notification to user
      await this.notifyUserOfUpdate(paymentMethod.user, paymentMethod, {
        previousDetails,
        newDetails: paymentMethod.cardDetails,
      });

      this.logger.log(
        `Successfully updated card ${paymentMethod.id} for user ${paymentMethod.userId}`,
      );

      return {
        success: true,
        paymentMethodId: paymentMethod.id,
        updateSource: 'stripe_updater',
        previousDetails,
        newDetails: paymentMethod.cardDetails,
      };
    } catch (error) {
      this.logger.error(`Error updating card details for ${paymentMethod.id}:`, error);

      // Record failed update
      paymentMethod.recordFailedUpdate();
      await this.paymentMethodRepository.save(paymentMethod);

      return {
        success: false,
        paymentMethodId: paymentMethod.id,
        updateSource: 'stripe_updater',
        error: error instanceof Error ? error.message : 'Failed to update card details',
      };
    }
  }

  async forceUpdateCheck(paymentMethodId: string): Promise<UpdateResult> {
    this.logger.log(`Force checking update for payment method ${paymentMethodId}`);
    return this.checkSingleCardUpdate(paymentMethodId);
  }

  async enableAutoUpdate(paymentMethodId: string): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    if (!paymentMethod.autoUpdateData) {
      paymentMethod.autoUpdateData = {
        lastUpdateCheck: new Date(),
        updateSource: 'stripe_updater',
        updateHistory: [],
        autoUpdateEnabled: true,
        failedUpdateAttempts: 0,
      };
    } else {
      paymentMethod.autoUpdateData.autoUpdateEnabled = true;
      paymentMethod.autoUpdateData.failedUpdateAttempts = 0;
    }

    paymentMethod.scheduleAutoUpdate();
    await this.paymentMethodRepository.save(paymentMethod);
  }

  async disableAutoUpdate(paymentMethodId: string): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    if (paymentMethod.autoUpdateData) {
      paymentMethod.autoUpdateData.autoUpdateEnabled = false;
      paymentMethod.autoUpdateData.nextUpdateCheck = undefined;
    }

    await this.paymentMethodRepository.save(paymentMethod);
  }

  private async getCardsEligibleForUpdate(): Promise<PaymentMethod[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get cards that:
    // 1. Are active cards
    // 2. Have auto-update enabled
    // 3. Are expiring within 30 days OR haven't been checked in 24 hours
    // 4. Haven't failed update more than 3 times
    return this.paymentMethodRepository
      .createQueryBuilder('pm')
      .where('pm.type = :type', { type: PaymentMethodType.CARD })
      .andWhere('pm.status = :status', { status: PaymentMethodStatus.ACTIVE })
      .andWhere('JSON_EXTRACT(pm.autoUpdateData, "$.autoUpdateEnabled") = true')
      .andWhere('JSON_EXTRACT(pm.autoUpdateData, "$.failedUpdateAttempts") < 3')
      .andWhere(
        '(pm.expiresAt <= :thirtyDays OR JSON_EXTRACT(pm.autoUpdateData, "$.lastUpdateCheck") <= :yesterday OR JSON_EXTRACT(pm.autoUpdateData, "$.lastUpdateCheck") IS NULL)',
        {
          thirtyDays: thirtyDaysFromNow,
          yesterday: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      )
      .getMany();
  }

  private hasCardDetailsChanged(currentDetails: any, stripeDetails: any): boolean {
    if (!currentDetails || !stripeDetails) return true;

    return (
      currentDetails.exp_month !== stripeDetails.exp_month ||
      currentDetails.exp_year !== stripeDetails.exp_year ||
      currentDetails.last4 !== stripeDetails.last4 ||
      currentDetails.brand !== stripeDetails.brand
    );
  }

  private calculateNextUpdateCheck(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM tomorrow
    return tomorrow;
  }

  private async notifyUserOfUpdate(
    user: User,
    paymentMethod: PaymentMethod,
    updateDetails: { previousDetails: any; newDetails: any },
  ): Promise<void> {
    try {
      await this.notificationService.sendCardUpdateNotification(user, paymentMethod, updateDetails);
    } catch (error) {
      this.logger.error(`Failed to send update notification to user ${user.id}:`, error);
      // Don't throw error as notification failure shouldn't fail the update
    }
  }

  private async sendUpdateSummaryNotification(result: BulkUpdateResult): Promise<void> {
    try {
      // Send summary to administrators
      const adminEmails = this.configService.get<string>('ADMIN_EMAIL_ADDRESSES')?.split(',') || [];

      if (adminEmails.length > 0) {
        await this.notificationService.sendCardUpdateSummary(adminEmails, result);
      }
    } catch (error) {
      this.logger.error('Failed to send update summary notification:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Manual update methods for admin use
  async bulkUpdateCheck(paymentMethodIds: string[]): Promise<UpdateResult[]> {
    this.logger.log(`Performing bulk update check for ${paymentMethodIds.length} payment methods`);

    const results: UpdateResult[] = [];

    for (const id of paymentMethodIds) {
      try {
        const result = await this.checkSingleCardUpdate(id);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          paymentMethodId: id,
          updateSource: 'stripe_updater',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async getUpdateStatistics(): Promise<{
    totalCardsWithAutoUpdate: number;
    cardsExpiringIn30Days: number;
    cardsWithFailedUpdates: number;
    lastUpdateRun: Date | null;
    nextScheduledRun: Date;
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalCardsWithAutoUpdate, cardsExpiringIn30Days, cardsWithFailedUpdates] =
      await Promise.all([
        this.paymentMethodRepository.count({
          where: {
            type: PaymentMethodType.CARD,
            status: PaymentMethodStatus.ACTIVE,
          },
        }),
        this.paymentMethodRepository.count({
          where: {
            type: PaymentMethodType.CARD,
            status: PaymentMethodStatus.ACTIVE,
            expiresAt: thirtyDaysFromNow as any, // TypeORM LessThanOrEqual
          },
        }),
        this.paymentMethodRepository
          .createQueryBuilder('pm')
          .where('pm.type = :type', { type: PaymentMethodType.CARD })
          .andWhere('JSON_EXTRACT(pm.autoUpdateData, "$.failedUpdateAttempts") >= 3')
          .getCount(),
      ]);

    const nextScheduledRun = new Date();
    nextScheduledRun.setDate(nextScheduledRun.getDate() + 1);
    nextScheduledRun.setHours(2, 0, 0, 0); // Next 2 AM

    return {
      totalCardsWithAutoUpdate,
      cardsExpiringIn30Days,
      cardsWithFailedUpdates,
      lastUpdateRun: null, // Would be tracked in a separate settings table
      nextScheduledRun,
    };
  }
}
