'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { transactionService } from '@/services/transaction-service';
import { EarlyPaymentCalculator } from '@/components/payments/early-payment-calculator';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  ArrowLeft,
  Clock,
  CheckCircle,
  DollarSign,
  Calendar,
  Calculator,
  Star,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface EarlyPaymentOpportunity {
  transactionId: string;
  merchantName: string;
  totalAmount: number;
  remainingAmount: number;
  nextPaymentDate: string;
  potentialSavings: number;
  discountRate: number;
  paymentsRemaining: number;
}

export default function EarlyPaymentsPage() {
  const { user } = useAuthStore();
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['customer-transactions'],
    queryFn: transactionService.getMyTransactions,
    enabled: !!user && mounted,
  });

  // Calculate early payment opportunities
  const earlyPaymentOpportunities: EarlyPaymentOpportunity[] =
    transactions
      ?.filter((transaction) => {
        const upcomingPayments =
          transaction.payments?.filter((p) => p.status === 'scheduled') || [];
        return upcomingPayments.length > 0;
      })
      ?.map((transaction) => {
        const upcomingPayments =
          transaction.payments?.filter((p) => p.status === 'scheduled') || [];
        const totalRemaining = upcomingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const nextPayment = upcomingPayments.sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        )[0];

        // Simulate discount calculation (1% discount for early payment)
        const discountRate = 0.01;
        const potentialSavings = totalRemaining * discountRate;

        return {
          transactionId: transaction.id,
          merchantName: transaction.merchant?.businessName || 'Unknown Merchant',
          totalAmount: Number(transaction.amount),
          remainingAmount: totalRemaining,
          nextPaymentDate: nextPayment?.dueDate || '',
          potentialSavings,
          discountRate,
          paymentsRemaining: upcomingPayments.length,
        };
      }) || [];

  // Mock historical early payments for demo
  const historicalEarlyPayments = [
    {
      id: '1',
      merchantName: 'TechWorld Electronics',
      originalAmount: 800,
      paidAmount: 792,
      savings: 8,
      paidDate: '2024-06-15T10:30:00Z',
      discountRate: 0.01,
    },
    {
      id: '2',
      merchantName: 'Fashion Forward',
      originalAmount: 450,
      paidAmount: 445.5,
      savings: 4.5,
      paidDate: '2024-05-20T14:20:00Z',
      discountRate: 0.01,
    },
  ];

  const totalSavingsToDate = historicalEarlyPayments.reduce(
    (sum, payment) => sum + payment.savings,
    0,
  );
  const totalPotentialSavings = earlyPaymentOpportunities.reduce(
    (sum, opp) => sum + opp.potentialSavings,
    0,
  );

  const handleStartEarlyPayment = (transactionId: string) => {
    setSelectedTransaction(transactionId);
    setShowCalculator(true);
  };

  const handleEarlyPaymentComplete = () => {
    setShowCalculator(false);
    setSelectedTransaction(null);
    // Refresh transactions data
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Early Payment Options
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Save money by paying your installments early
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Total Savings
                  </p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {formatCurrency(totalSavingsToDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Potential Savings
                  </p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {formatCurrency(totalPotentialSavings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Opportunities
                  </p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {earlyPaymentOpportunities.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="opportunities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="opportunities" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Current Opportunities
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Payment History
              </TabsTrigger>
            </TabsList>

            {/* Current Opportunities */}
            <TabsContent value="opportunities" className="space-y-4">
              {isLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading early payment opportunities...</p>
                  </CardContent>
                </Card>
              ) : earlyPaymentOpportunities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No early payment opportunities</h3>
                    <p className="text-gray-600 mb-4">
                      You don&apos;t have any upcoming payments that can be paid early right now.
                    </p>
                    <Link href="/shop">
                      <Button>Continue Shopping</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                earlyPaymentOpportunities.map((opportunity, index) => (
                  <motion.div
                    key={opportunity.transactionId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold">{opportunity.merchantName}</h3>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Star className="w-3 h-3 mr-1" />
                                Save {formatCurrency(opportunity.potentialSavings)}
                              </Badge>
                            </div>

                            <div className="grid md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Remaining Balance
                                </p>
                                <p className="font-semibold">
                                  {formatCurrency(opportunity.remainingAmount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Next Payment Due</p>
                                <p className="font-semibold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(opportunity.nextPaymentDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Payments Remaining
                                </p>
                                <p className="font-semibold">
                                  {opportunity.paymentsRemaining} payments
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Discount Rate</p>
                                <p className="font-semibold text-green-600">
                                  {(opportunity.discountRate * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-6">
                            <Button
                              onClick={() => handleStartEarlyPayment(opportunity.transactionId)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Pay Early
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Payment History */}
            <TabsContent value="history" className="space-y-4">
              {historicalEarlyPayments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No early payments yet</h3>
                    <p className="text-gray-600">
                      Your early payment history will appear here once you make your first early
                      payment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {historicalEarlyPayments.map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{payment.merchantName}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Paid early on {formatDate(payment.paidDate)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                {formatCurrency(payment.paidAmount)}
                              </p>
                              <p className="text-sm text-green-600 font-medium">
                                Saved {formatCurrency(payment.savings)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>How Early Payments Work</CardTitle>
              <CardDescription>Save money and pay off your purchases faster</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <h4 className="font-semibold mb-2">Choose Your Payment</h4>
                  <p className="text-sm text-gray-600">
                    Select any upcoming payment that you&apos;d like to pay early.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">2</span>
                  </div>
                  <h4 className="font-semibold mb-2">Calculate Savings</h4>
                  <p className="text-sm text-gray-600">
                    See exactly how much you&apos;ll save with our early payment discount.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      3
                    </span>
                  </div>
                  <h4 className="font-semibold mb-2">Pay & Save</h4>
                  <p className="text-sm text-gray-600">
                    Complete your early payment and enjoy the savings!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Early Payment Calculator Modal */}
      {showCalculator && selectedTransaction && (
        <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Early Payment Calculator
              </DialogTitle>
            </DialogHeader>
            <EarlyPaymentCalculator
              transactionId={selectedTransaction}
              userId={user?.id || ''}
              onPaymentComplete={handleEarlyPaymentComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
