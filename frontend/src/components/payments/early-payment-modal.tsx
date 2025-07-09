'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Calendar, DollarSign, Clock } from 'lucide-react';
import { Transaction } from '@/services/transaction-service';

interface EarlyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onPaymentComplete?: () => void;
}

export function EarlyPaymentModal({
  isOpen,
  onClose,
  transaction,
  onPaymentComplete,
}: EarlyPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingPayments =
    transaction.payments?.filter((payment) => payment.status === 'scheduled') || [];

  const totalRemainingAmount = pendingPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  const handleEarlyPayment = async () => {
    setIsProcessing(true);
    try {
      // This would integrate with your early payment service
      // For now, just simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onPaymentComplete?.();
      onClose();
    } catch (error) {
      console.error('Early payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Early Payment
          </DialogTitle>
          <DialogDescription>
            Pay off your remaining installments early and save on future payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Transaction</span>
                <Badge variant="secondary">
                  {transaction.paymentPlan?.replace('pay_in_', '')} installments
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span className="font-medium">{formatCurrency(Number(transaction.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid So Far</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(Number(transaction.amount) - totalRemainingAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Remaining</span>
                  <span>{formatCurrency(totalRemainingAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Pending Payments ({pendingPayments.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingPayments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Payment {index + 1}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Early Payment Benefits */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Early Payment Benefits</span>
              </div>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• No future payment reminders</li>
                <li>• Complete your purchase immediately</li>
                <li>• Potential small discount (if applicable)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleEarlyPayment}
              disabled={isProcessing || pendingPayments.length === 0}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pay {formatCurrency(totalRemainingAmount)}
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
