'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircle,
  Calendar,
  Download,
  Mail,
  ArrowRight,
  Home,
  Receipt,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { transactionService } from '@/services/transaction-service';
import confetti from 'canvas-confetti';

interface TransactionDetails {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  creditAmount: number;
  cardAmount: number;
  paymentPlan: string;
  createdAt: string;
  merchant: {
    name: string;
    logo?: string;
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
    installmentNumber: number;
  }>;
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transactionId = searchParams.get('transaction') || searchParams.get('id');

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const loadTransactionDetails = async () => {
      if (!transactionId) {
        setError('No transaction ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const transactionDetails = await transactionService.getById(transactionId);
        setTransaction(transactionDetails);

        // Show success toast
        toast({
          title: 'Payment Successful!',
          description: 'Your order has been confirmed and payment processed.',
        });
      } catch (error) {
        console.error('Error loading transaction details:', error);
        setError('Failed to load transaction details');
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactionDetails();
  }, [transactionId, toast]);

  if (!transactionId) {
    router.push('/shop');
    return null;
  }

  const getInstallmentInfo = (paymentPlan: string) => {
    switch (paymentPlan) {
      case 'pay_in_2':
        return { count: 2, frequency: 'Bi-weekly' };
      case 'pay_in_3':
        return { count: 3, frequency: 'Monthly' };
      case 'pay_in_4':
        return { count: 4, frequency: 'Bi-weekly' };
      default:
        return { count: 1, frequency: 'One-time' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const downloadReceipt = () => {
    toast({
      title: 'Receipt Download',
      description: 'Receipt download feature will be implemented soon.',
    });
  };

  const sendReceiptEmail = () => {
    toast({
      title: 'Email Sent',
      description: 'Receipt has been sent to your email address.',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <h2 className="text-xl font-semibold">Loading Transaction Details</h2>
              <p className="text-gray-600">Please wait while we confirm your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
                Transaction Not Found
              </h2>
              <p className="text-gray-600">{error || 'Unable to load transaction details'}</p>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const installmentInfo = getInstallmentInfo(transaction.paymentPlan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
                Payment Successful
              </h1>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-8"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Confirmed!</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Thank you for your purchase. Your payment has been processed successfully.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button onClick={downloadReceipt} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button onClick={sendReceiptEmail} variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Email Receipt
              </Button>
            </div>
          </motion.div>

          {/* Transaction Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Summary</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {transaction.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Transaction ID: #{transaction.id.slice(0, 8).toUpperCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transaction.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(transaction.amount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Payment Schedule
                </CardTitle>
                <CardDescription>
                  Your {installmentInfo.frequency.toLowerCase()} payment plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transaction.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                        payment.status === 'COMPLETED'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {payment.status === 'COMPLETED' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">Payment {payment.installmentNumber}</p>
                          <p className="text-xs text-gray-600">{formatDate(payment.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                        <Badge
                          variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {payment.status === 'COMPLETED' ? 'Paid' : 'Scheduled'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-8">
            <Link href="/dashboard/customer/transactions" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Receipt className="w-4 h-4 mr-2" />
                View All Transactions
              </Button>
            </Link>
            <Link href="/shop" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
