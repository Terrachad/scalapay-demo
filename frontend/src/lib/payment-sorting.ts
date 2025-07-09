import { Transaction, Payment } from '@/services/transaction-service';

export type SortingMethod = 'hybrid' | 'installmentNumber' | 'dueDate';
export type SortingOrder = 'ASC' | 'DESC';

export interface SortingOptions {
  sortBy: SortingMethod;
  order: SortingOrder;
  validateSequence?: boolean;
}

export interface PaymentProgress {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalPayments: number;
  completedPayments: number;
  progressPercentage: number;
}

export interface NextPaymentInfo {
  nextPayment: Payment | null;
  upcomingPayments: Payment[];
  overduePayments: Payment[];
  daysUntilNext: number | null;
}

export interface PaymentScheduleSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalInstallments: number;
  completedInstallments: number;
  nextPayment: Payment | null;
  schedule: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    status: string;
    paidAt?: Date;
  }>;
}

/**
 * Sort transactions with their payments using unified logic
 */
export function sortTransactionsWithPayments(
  transactions: Transaction[],
  options: SortingOptions = { sortBy: 'hybrid', order: 'ASC' },
): Transaction[] {
  return transactions
    .map((transaction) => ({
      ...transaction,
      payments: sortPayments(transaction.payments || [], options),
    }))
    .sort((a, b) => {
      const firstPaymentA = a.payments?.[0];
      const firstPaymentB = b.payments?.[0];

      if (!firstPaymentA && !firstPaymentB) return 0;
      if (!firstPaymentA) return 1;
      if (!firstPaymentB) return -1;

      const comparison =
        new Date(firstPaymentA.dueDate).getTime() - new Date(firstPaymentB.dueDate).getTime();

      return options.order === 'DESC' ? -comparison : comparison;
    });
}

/**
 * Sort payments using the specified method
 */
export function sortPayments(
  payments: Payment[],
  options: SortingOptions = { sortBy: 'hybrid', order: 'ASC' },
): Payment[] {
  const { sortBy, order } = options;

  // Ensure payments is an array
  const paymentsArray = Array.isArray(payments) ? payments : [];

  return [...paymentsArray].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'hybrid':
        // Primary: installment number, Secondary: due date
        comparison = a.installmentNumber - b.installmentNumber;
        if (comparison === 0) {
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        break;

      case 'installmentNumber':
        comparison = a.installmentNumber - b.installmentNumber;
        break;

      case 'dueDate':
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;

      default:
        comparison = a.installmentNumber - b.installmentNumber;
    }

    return order === 'DESC' ? -comparison : comparison;
  });
}

/**
 * Get next payment information
 */
export function getNextPaymentInfo(payments: Payment[]): NextPaymentInfo {
  const now = new Date();

  // Ensure payments is an array
  const paymentsArray = Array.isArray(payments) ? payments : [];

  const scheduledPayments = paymentsArray.filter((p: Payment) => p.status === 'scheduled');
  const overduePayments = scheduledPayments.filter((p: Payment) => new Date(p.dueDate) < now);
  const upcomingPayments = scheduledPayments.filter((p: Payment) => new Date(p.dueDate) >= now);

  // Sort upcoming payments by due date
  const sortedUpcoming = upcomingPayments.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  const nextPayment = sortedUpcoming[0] || null;
  const daysUntilNext = nextPayment
    ? Math.ceil((new Date(nextPayment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    nextPayment,
    upcomingPayments: sortedUpcoming,
    overduePayments,
    daysUntilNext,
  };
}

/**
 * Calculate payment progress
 */
export function getPaymentProgress(payments: Payment[]): PaymentProgress {
  // Ensure payments is an array
  const paymentsArray = Array.isArray(payments) ? payments : [];

  const totalAmount = paymentsArray.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidAmount = paymentsArray
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingAmount = totalAmount - paidAmount;

  const totalPayments = paymentsArray.length;
  const completedPayments = paymentsArray.filter((p) => p.status === 'completed').length;
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    totalPayments,
    completedPayments,
    progressPercentage,
  };
}

/**
 * Get payment schedule summary
 */
export function getPaymentScheduleSummary(transaction: Transaction): PaymentScheduleSummary {
  const payments = transaction.payments || [];
  const progress = getPaymentProgress(payments);
  const nextInfo = getNextPaymentInfo(payments);

  return {
    totalAmount: progress.totalAmount,
    paidAmount: progress.paidAmount,
    remainingAmount: progress.remainingAmount,
    totalInstallments: progress.totalPayments,
    completedInstallments: progress.completedPayments,
    nextPayment: nextInfo.nextPayment,
    schedule: payments.map((p) => ({
      installmentNumber: p.installmentNumber,
      amount: Number(p.amount),
      dueDate: new Date(p.dueDate),
      status: p.status,
      paidAt: p.paymentDate ? new Date(p.paymentDate) : undefined,
    })),
  };
}

/**
 * Check if a payment is the next due payment
 */
export function isNextPayment(payment: Payment, payments: Payment[]): boolean {
  const nextInfo = getNextPaymentInfo(payments);
  return nextInfo.nextPayment?.id === payment.id;
}

/**
 * Check if a payment is overdue
 */
export function isPaymentOverdue(payment: Payment): boolean {
  const now = new Date();
  return payment.status === 'scheduled' && new Date(payment.dueDate) < now;
}

/**
 * Get days until payment is due
 */
export function getDaysUntilDue(payment: Payment): number {
  const now = new Date();
  const dueDate = new Date(payment.dueDate);
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Validate payment sequence integrity
 */
export function validatePaymentSequence(payments: Payment[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Ensure payments is an array
  const paymentsArray = Array.isArray(payments) ? payments : [];

  if (paymentsArray.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Check installment number sequence
  const installmentNumbers = paymentsArray.map((p) => p.installmentNumber).sort((a, b) => a - b);
  const expectedNumbers = Array.from({ length: paymentsArray.length }, (_, i) => i + 1);

  if (JSON.stringify(installmentNumbers) !== JSON.stringify(expectedNumbers)) {
    errors.push('Installment numbers are not sequential or have duplicates');
  }

  // Check date progression
  const sortedByInstallment = paymentsArray.sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );
  for (let i = 1; i < sortedByInstallment.length; i++) {
    const current = sortedByInstallment[i];
    const previous = sortedByInstallment[i - 1];

    if (new Date(current.dueDate).getTime() <= new Date(previous.dueDate).getTime()) {
      warnings.push(
        `Payment ${current.installmentNumber} due date is not after payment ${previous.installmentNumber}`,
      );
    }
  }

  // Check for zero amounts
  const zeroAmountPayments = paymentsArray.filter((p) => Number(p.amount) <= 0);
  if (zeroAmountPayments.length > 0) {
    errors.push('Some payments have zero or negative amounts');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get payment status badge color
 */
export function getPaymentStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Format payment status for display
 */
export function formatPaymentStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Paid';
    case 'scheduled':
      return 'Scheduled';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
