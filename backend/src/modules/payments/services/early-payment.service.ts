import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { StripeService } from './stripe.service';
import { NotificationService } from './notification.service';

@Injectable()
export class EarlyPaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private stripeService: StripeService,
    private notificationService: NotificationService,
  ) {}

  async processEarlyPayment(transactionId: string, userId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['payments', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const pendingPayments = transaction.payments.filter(
      payment => payment.status === PaymentStatus.SCHEDULED
    );

    if (pendingPayments.length === 0) {
      throw new BadRequestException('No pending payments to process early');
    }

    const totalAmount = pendingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount), 
      0
    );

    // Create payment intent for the total remaining amount
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: totalAmount,
      currency: 'usd',
      customerId: transaction.user.stripeCustomerId!,
      metadata: {
        transactionId,
        type: 'early_payment',
        paymentIds: pendingPayments.map(p => p.id).join(','),
      },
    });

    return {
      paymentIntentId: paymentIntent.paymentIntentId,
      clientSecret: paymentIntent.clientSecret,
      amount: totalAmount,
      pendingPayments: pendingPayments.length,
    };
  }

  async confirmEarlyPayment(paymentIntentId: string) {
    const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not succeeded');
    }

    const metadata = paymentIntent.metadata;
    const transactionId = metadata.transactionId;
    const paymentIds = metadata.paymentIds?.split(',') || [];

    // Mark all pending payments as completed
    for (const paymentId of paymentIds) {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.paymentDate = new Date();
        payment.stripePaymentIntentId = paymentIntentId;
        await this.paymentRepository.save(payment);
      }
    }

    // Send notification
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user'],
    });

    if (transaction) {
      await this.notificationService.sendEarlyPaymentConfirmation(
        transaction.user,
        transaction,
        Number(paymentIntent.amount) / 100
      );
    }

    return {
      message: 'Early payment processed successfully',
      transactionId,
      completedPayments: paymentIds.length,
    };
  }

  async calculateEarlyPaymentDiscount(transactionId: string): Promise<number> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['payments'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const pendingPayments = transaction.payments.filter(
      payment => payment.status === PaymentStatus.SCHEDULED
    );

    // Simple discount calculation: 1% discount for early payment
    const totalAmount = pendingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount), 
      0
    );

    return totalAmount * 0.01; // 1% discount
  }
}