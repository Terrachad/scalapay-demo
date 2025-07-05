import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';
import { User } from '../../users/entities/user.entity';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
  ) {}

  async createSetupIntent(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create Stripe customer if doesn't exist
    if (!user.stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(user.email, user.name);
      user.stripeCustomerId = customer.id;
      await this.userRepository.save(user);
    }

    const setupIntent = await this.stripeService.createSetupIntent(user.stripeCustomerId);

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  async storePaymentMethod(userId: string, setupIntentId: string, makeDefault = false) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const setupIntent = await this.stripeService.retrieveSetupIntent(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestException('Setup intent not succeeded');
    }

    const paymentMethodId = setupIntent.payment_method as string;
    const stripePaymentMethod = await this.stripeService.retrievePaymentMethod(paymentMethodId);

    // If making this default, unset other defaults
    if (makeDefault) {
      await this.paymentMethodRepository.update({ userId, isDefault: true }, { isDefault: false });
    }

    const paymentMethod = new PaymentMethod();
    paymentMethod.userId = userId;
    paymentMethod.stripePaymentMethodId = paymentMethodId;
    paymentMethod.stripeCustomerId = user.stripeCustomerId!;
    paymentMethod.type = stripePaymentMethod.type as any; // Map Stripe type to our enum
    paymentMethod.isDefault = makeDefault;

    if (stripePaymentMethod.card) {
      paymentMethod.cardDetails = {
        brand: stripePaymentMethod.card.brand,
        last4: stripePaymentMethod.card.last4,
        exp_month: stripePaymentMethod.card.exp_month,
        exp_year: stripePaymentMethod.card.exp_year,
        funding: stripePaymentMethod.card.funding || 'credit',
        country: stripePaymentMethod.card.country || 'US',
      };
    }

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async getUserPaymentMethods(userId: string) {
    return this.paymentMethodRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async deletePaymentMethod(id: string, userId: string) {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Detach from Stripe
    await this.stripeService.detachPaymentMethod(paymentMethod.stripePaymentMethodId);

    await this.paymentMethodRepository.remove(paymentMethod);

    return { message: 'Payment method deleted successfully' };
  }

  async setAsDefault(id: string, userId: string) {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset other defaults
    await this.paymentMethodRepository.update({ userId, isDefault: true }, { isDefault: false });

    // Set this as default
    paymentMethod.isDefault = true;
    await this.paymentMethodRepository.save(paymentMethod);

    return { message: 'Default payment method updated' };
  }

  async getDefaultPaymentMethod(userId: string): Promise<PaymentMethod | null> {
    return this.paymentMethodRepository.findOne({
      where: { userId, isDefault: true },
    });
  }
}
