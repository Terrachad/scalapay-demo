import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionStatus } from '../entities/transaction.entity';

export interface StateTransition {
  from: TransactionStatus;
  to: TransactionStatus;
  condition?: (context: any) => boolean;
  action?: (context: any) => Promise<void>;
}

@Injectable()
export class TransactionStateMachineService {
  private readonly transitions: StateTransition[] = [
    // From PENDING
    {
      from: TransactionStatus.PENDING,
      to: TransactionStatus.APPROVED,
      condition: (context) => this.validateCreditLimit(context),
    },
    {
      from: TransactionStatus.PENDING,
      to: TransactionStatus.REJECTED,
    },
    {
      from: TransactionStatus.PENDING,
      to: TransactionStatus.CANCELLED,
    },

    // From APPROVED
    {
      from: TransactionStatus.APPROVED,
      to: TransactionStatus.COMPLETED,
      condition: (context) => this.validateAllPaymentsCompleted(context),
    },
    {
      from: TransactionStatus.APPROVED,
      to: TransactionStatus.CANCELLED,
      condition: (context) => this.validateCancellationAllowed(context),
    },

    // From REJECTED - No transitions allowed
    // From COMPLETED - No transitions allowed
    // From CANCELLED - No transitions allowed
  ];

  async canTransition(
    from: TransactionStatus,
    to: TransactionStatus,
    context?: any,
  ): Promise<boolean> {
    const transition = this.transitions.find(
      (t) => t.from === from && t.to === to,
    );

    if (!transition) {
      return false;
    }

    if (transition.condition && context) {
      return transition.condition(context);
    }

    return true;
  }

  async transition(
    from: TransactionStatus,
    to: TransactionStatus,
    context: any,
  ): Promise<void> {
    const canTransition = await this.canTransition(from, to, context);

    if (!canTransition) {
      throw new BadRequestException(
        `Invalid state transition from ${from} to ${to}`,
      );
    }

    const transition = this.transitions.find(
      (t) => t.from === from && t.to === to,
    );

    if (transition?.action) {
      await transition.action(context);
    }
  }

  getValidTransitions(from: TransactionStatus): TransactionStatus[] {
    return this.transitions
      .filter((t) => t.from === from)
      .map((t) => t.to);
  }

  isTerminalState(status: TransactionStatus): boolean {
    return [
      TransactionStatus.COMPLETED,
      TransactionStatus.REJECTED,
      TransactionStatus.CANCELLED,
    ].includes(status);
  }

  private validateCreditLimit(context: any): boolean {
    const { user, transaction } = context;
    return user.availableCredit >= transaction.amount;
  }

  private validateAllPaymentsCompleted(context: any): boolean {
    const { payments } = context;
    return payments.every((payment: any) => payment.status === 'completed');
  }

  private validateCancellationAllowed(context: any): boolean {
    const { payments } = context;
    // Allow cancellation if no payments have been processed yet
    return payments.every((payment: any) => 
      payment.status === 'scheduled' || payment.status === 'failed'
    );
  }
}