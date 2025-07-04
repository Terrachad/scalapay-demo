'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { transactionService, Transaction, Payment } from '@/services/transaction-service';
import { EarlyPaymentModal } from '@/components/payments/early-payment-modal';
import { formatCurrency } from '@/lib/utils';
import {
  getNextPaymentInfo,
  getPaymentProgress,
  getPaymentScheduleSummary,
  sortTransactionsWithPayments,
  isNextPayment,
  isPaymentOverdue,
  getDaysUntilDue,
} from '@/lib/payment-sorting';
import {
  ShoppingBag,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Wallet,
  TrendingUp,
} from 'lucide-react';

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  completed: CheckCircle,
  rejected: XCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
};

interface EarlyPaymentState {
  isOpen: boolean;
  transaction: Transaction | null;
  payment: Payment | null;
}

export default function CustomerTransactionsPage() {
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [earlyPaymentModal, setEarlyPaymentModal] = useState<EarlyPaymentState>({
    isOpen: false,
    transaction: null,
    payment: null,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getMyTransactions();
      console.log('Fetched transactions:', data);

      // Use enterprise payment sorting for consistent ordering
      const sortedTransactions = sortTransactionsWithPayments(data, {
        sortBy: 'hybrid',
        order: 'ASC',
        validateSequence: true,
      });

      setTransactions(sortedTransactions);
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  // Use enterprise payment sorting utility
  const getTransactionNextPaymentInfo = (transaction: Transaction) => {
    return getNextPaymentInfo(transaction);
  };

  const getNextPaymentDate = (transaction: Transaction) => {
    const info = getNextPaymentInfo(transaction);
    return info.exists ? info.formattedDate : 'N/A';
  };

  // Use enterprise payment progress utility
  const getTransactionPaymentProgress = (transaction: Transaction) => {
    return getPaymentProgress(transaction);
  };

  const handleEarlyPayment = (transaction: Transaction, payment: Payment) => {
    setEarlyPaymentModal({
      isOpen: true,
      transaction,
      payment,
    });
  };

  const handleEarlyPaymentSuccess = () => {
    fetchTransactions();
    queryClient.invalidateQueries({ queryKey: ['customer-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setEarlyPaymentModal({
      isOpen: false,
      transaction: null,
      payment: null,
    });
  };

  const closeEarlyPaymentModal = () => {
    setEarlyPaymentModal({
      isOpen: false,
      transaction: null,
      payment: null,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={fetchTransactions} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">My Orders</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track your purchases and manage payments
          </p>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{transactions.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Spent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {transactions.filter((t) => t.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {transactions.filter((t) => ['pending', 'approved'].includes(t.status)).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Active</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Customer Portal Enhancements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Wallet Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Wallet & Credit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Credit</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(
                      transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) *
                        0.15,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reward Points</span>
                  <span className="font-bold text-purple-600">{transactions.length * 25}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spending Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Spending Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(
                      transactions
                        .filter((t) => new Date(t.createdAt).getMonth() === new Date().getMonth())
                        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Order</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(
                      transactions.length > 0
                        ? transactions.reduce(
                            (sum, t) => sum + parseFloat(t.amount.toString()),
                            0,
                          ) / transactions.length
                        : 0,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Payment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span>
                      {transactions.filter((t) => t.status === 'completed').length}/
                      {transactions.length}
                    </span>
                  </div>
                  <Progress
                    value={
                      transactions.length > 0
                        ? (transactions.filter((t) => t.status === 'completed').length /
                            transactions.length) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {transactions.filter((t) => t.status === 'completed').length} of{' '}
                  {transactions.length} orders completed
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-elegant border-0">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your recent purchases and payment schedules</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No transactions found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Start shopping to see your orders here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Order #{transaction.id.slice(0, 8)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {transaction.merchant.businessName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(transaction.amount.toString()))}
                          </p>
                          <Badge
                            className={
                              statusColors[transaction.status as keyof typeof statusColors]
                            }
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(transaction.status)}
                              {transaction.status.charAt(0).toUpperCase() +
                                transaction.status.slice(1)}
                            </span>
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Payment Plan
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {transaction.paymentPlan.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Order Date
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Next Payment
                          </p>
                          <div className="space-y-1">
                            <p
                              className={`text-sm font-medium ${(() => {
                                const nextInfo = getTransactionNextPaymentInfo(transaction);
                                return nextInfo.isOverdue
                                  ? 'text-red-600'
                                  : nextInfo.daysTillDue <= 3
                                    ? 'text-yellow-600'
                                    : 'text-gray-900 dark:text-white';
                              })()}`}
                            >
                              {getNextPaymentDate(transaction)}
                            </p>
                            {(() => {
                              const nextInfo = getTransactionNextPaymentInfo(transaction);
                              if (nextInfo.exists) {
                                return (
                                  <p
                                    className={`text-xs ${
                                      nextInfo.isOverdue
                                        ? 'text-red-600 font-medium'
                                        : nextInfo.daysTillDue <= 3
                                          ? 'text-yellow-600'
                                          : 'text-gray-500'
                                    }`}
                                  >
                                    {formatCurrency(nextInfo.amount)} •{' '}
                                    {nextInfo.isOverdue
                                      ? `${nextInfo.daysTillDue} days overdue`
                                      : nextInfo.daysTillDue === 0
                                        ? 'Due today'
                                        : `${nextInfo.daysTillDue} days left`}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                          Items
                        </p>
                        <div className="space-y-1">
                          {transaction.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-900 dark:text-white">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Updated {new Date(transaction.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {(() => {
                            const nextInfo = getNextPaymentInfo(transaction);

                            if (nextInfo.exists && nextInfo.daysTillDue <= 7) {
                              // Find the actual next payment (earliest scheduled payment)
                              const scheduledPayments =
                                transaction.payments?.filter((p) => p.status === 'scheduled') || [];
                              const nextPayment = scheduledPayments.sort(
                                (a, b) =>
                                  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
                              )[0];

                              if (nextPayment) {
                                return (
                                  <Button
                                    variant={nextInfo.isOverdue ? 'destructive' : 'default'}
                                    size="sm"
                                    onClick={() => handleEarlyPayment(transaction, nextPayment)}
                                    className={
                                      nextInfo.isOverdue ? '' : 'bg-blue-600 hover:bg-blue-700'
                                    }
                                  >
                                    {nextInfo.isOverdue ? 'Pay Overdue' : 'Pay Early'}
                                  </Button>
                                );
                              }
                            }
                            return null;
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            View Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Details</CardTitle>
                  <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Order Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order ID</label>
                        <p className="font-mono">#{selectedTransaction.id?.slice(0, 8) || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Amount</label>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(
                            parseFloat(selectedTransaction.amount?.toString() || '0'),
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge
                          className={
                            statusColors[selectedTransaction.status as keyof typeof statusColors]
                          }
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(selectedTransaction.status)}
                            {selectedTransaction.status}
                          </span>
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Plan</label>
                        <p>{selectedTransaction.paymentPlan?.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order Date</label>
                        <p>{new Date(selectedTransaction.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Merchant Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Store</label>
                        <p className="font-medium">
                          {selectedTransaction.merchant?.businessName || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Next Payment</label>
                        <p className="text-sm text-gray-600">
                          {getNextPaymentDate(selectedTransaction)}
                        </p>
                      </div>
                      {selectedTransaction.status === 'pending' && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            Your order is being reviewed by Scalapay
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Payment Highlight */}
                {(() => {
                  const nextPaymentInfo = getTransactionNextPaymentInfo(selectedTransaction);
                  const paymentProgress = getTransactionPaymentProgress(selectedTransaction);

                  if (!nextPaymentInfo.exists) {
                    return (
                      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                              <h4 className="font-semibold text-green-800 dark:text-green-200">
                                All Payments Complete!
                              </h4>
                              <p className="text-sm text-green-600 dark:text-green-300">
                                You&apos;ve successfully completed all installments for this order.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      className={`border-2 ${
                        nextPaymentInfo.isOverdue
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-700'
                          : nextPaymentInfo.daysTillDue <= 3
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-3 rounded-full ${
                                nextPaymentInfo.isOverdue
                                  ? 'bg-red-100 dark:bg-red-900/30'
                                  : nextPaymentInfo.daysTillDue <= 3
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                                    : 'bg-blue-100 dark:bg-blue-900/30'
                              }`}
                            >
                              <CreditCard
                                className={`w-6 h-6 ${
                                  nextPaymentInfo.isOverdue
                                    ? 'text-red-600'
                                    : nextPaymentInfo.daysTillDue <= 3
                                      ? 'text-yellow-600'
                                      : 'text-blue-600'
                                }`}
                              />
                            </div>
                            <div>
                              <h4
                                className={`text-lg font-semibold ${
                                  nextPaymentInfo.isOverdue
                                    ? 'text-red-800 dark:text-red-200'
                                    : nextPaymentInfo.daysTillDue <= 3
                                      ? 'text-yellow-800 dark:text-yellow-200'
                                      : 'text-blue-800 dark:text-blue-200'
                                }`}
                              >
                                {nextPaymentInfo.isOverdue ? 'Payment Overdue' : 'Next Payment Due'}
                              </h4>
                              <p
                                className={`text-sm ${
                                  nextPaymentInfo.isOverdue
                                    ? 'text-red-600 dark:text-red-400'
                                    : nextPaymentInfo.daysTillDue <= 3
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {nextPaymentInfo.isOverdue
                                  ? `${nextPaymentInfo.daysTillDue} day${nextPaymentInfo.daysTillDue !== 1 ? 's' : ''} overdue`
                                  : nextPaymentInfo.daysTillDue === 0
                                    ? 'Due today'
                                    : `Due in ${nextPaymentInfo.daysTillDue} day${nextPaymentInfo.daysTillDue !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-2xl font-bold ${
                                nextPaymentInfo.isOverdue
                                  ? 'text-red-600'
                                  : nextPaymentInfo.daysTillDue <= 3
                                    ? 'text-yellow-600'
                                    : 'text-blue-600'
                              }`}
                            >
                              {formatCurrency(nextPaymentInfo.amount)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {nextPaymentInfo.formattedDate}
                            </p>
                          </div>
                        </div>

                        {/* Payment Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              Payment Progress
                            </span>
                            <span className="font-medium">
                              {paymentProgress.completedPayments} of {paymentProgress.totalPayments}{' '}
                              completed
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                nextPaymentInfo.isOverdue
                                  ? 'bg-red-500'
                                  : nextPaymentInfo.daysTillDue <= 3
                                    ? 'bg-yellow-500'
                                    : 'bg-blue-500'
                              }`}
                              style={{ width: `${paymentProgress.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{paymentProgress.remainingPayments} payments remaining</span>
                            <span>{paymentProgress.progress.toFixed(0)}% complete</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        {nextPaymentInfo.daysTillDue <= 7 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className={`flex-1 ${
                                  nextPaymentInfo.isOverdue || nextPaymentInfo.daysTillDue <= 3
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                onClick={() => {
                                  const nextPayment = selectedTransaction.payments?.find(
                                    (p) => p.status === 'scheduled',
                                  );
                                  if (nextPayment) {
                                    handleEarlyPayment(selectedTransaction, nextPayment);
                                  }
                                }}
                              >
                                {nextPaymentInfo.isOverdue ? 'Pay Now (Overdue)' : 'Pay Early'}
                              </Button>
                              <Button variant="outline" size="sm">
                                Set Reminder
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Items Section */}
                {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Items Ordered</h3>
                    <div className="space-y-3">
                      {selectedTransaction.items.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.price)}</p>
                            <p className="text-sm text-gray-600">
                              Total: {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Order Total:</span>
                          <span className="text-lg text-green-600">
                            {formatCurrency(
                              parseFloat(selectedTransaction.amount?.toString() || '0'),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Payment Schedule */}
                {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Payment Schedule
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {selectedTransaction.paymentPlan?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {selectedTransaction.payments.map((payment: any, index: number) => {
                        const dueDate = new Date(payment.dueDate);
                        const today = new Date();
                        const isNext =
                          payment.status === 'scheduled' &&
                          selectedTransaction.payments?.find(
                            (p) => p.status === 'scheduled' && new Date(p.dueDate) <= dueDate,
                          )?.id === payment.id;
                        const isOverdue = payment.status === 'scheduled' && dueDate < today;
                        const daysTillDue = Math.ceil(
                          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                        );

                        return (
                          <div
                            key={payment.id}
                            className={`relative p-4 rounded-lg border-2 transition-all ${
                              isNext
                                ? isOverdue
                                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                                  : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 shadow-md'
                                : payment.status === 'completed'
                                  ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                                  : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                            }`}
                          >
                            {isNext && (
                              <div
                                className={`absolute -top-2 left-4 px-2 py-1 text-xs font-medium rounded-full ${
                                  isOverdue ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                                }`}
                              >
                                {isOverdue ? 'OVERDUE' : 'NEXT PAYMENT'}
                              </div>
                            )}

                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-medium text-lg">Payment #{index + 1}</p>
                                  {payment.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                  {payment.status === 'failed' && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  {isNext && (
                                    <Clock
                                      className={`w-4 h-4 ${
                                        isOverdue ? 'text-red-600' : 'text-blue-600'
                                      }`}
                                    />
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <p
                                    className={`text-sm font-medium ${
                                      isOverdue
                                        ? 'text-red-700 dark:text-red-300'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    Due:{' '}
                                    {dueDate.toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </p>

                                  {payment.status === 'scheduled' && (
                                    <p
                                      className={`text-xs ${
                                        isOverdue
                                          ? 'text-red-600 dark:text-red-400 font-medium'
                                          : daysTillDue <= 7
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                    >
                                      {isOverdue
                                        ? `${Math.abs(daysTillDue)} day${Math.abs(daysTillDue) !== 1 ? 's' : ''} overdue`
                                        : daysTillDue === 0
                                          ? 'Due today'
                                          : `Due in ${daysTillDue} day${daysTillDue !== 1 ? 's' : ''}`}
                                    </p>
                                  )}

                                  {payment.paymentDate && (
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                      ✓ Paid: {new Date(payment.paymentDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right ml-4">
                                <p
                                  className={`text-xl font-bold mb-1 ${
                                    payment.status === 'completed'
                                      ? 'text-green-600'
                                      : isNext
                                        ? isOverdue
                                          ? 'text-red-600'
                                          : 'text-blue-600'
                                        : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {formatCurrency(parseFloat(payment.amount?.toString() || '0'))}
                                </p>
                                <Badge
                                  variant={
                                    payment.status === 'completed'
                                      ? 'default'
                                      : payment.status === 'failed'
                                        ? 'destructive'
                                        : isOverdue
                                          ? 'destructive'
                                          : 'secondary'
                                  }
                                  className={`text-xs uppercase font-medium ${
                                    isNext && !isOverdue
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                      : ''
                                  }`}
                                >
                                  {payment.status === 'scheduled' && isOverdue
                                    ? 'overdue'
                                    : payment.status}
                                </Badge>
                              </div>
                            </div>

                            {/* Quick Pay Button for Next Payment */}
                            {payment.status === 'scheduled' && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <Button
                                  size="sm"
                                  className={`w-full ${
                                    isOverdue
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                  onClick={() => handleEarlyPayment(selectedTransaction, payment)}
                                >
                                  {isOverdue ? '⚠️ Pay Overdue Amount' : '💳 Pay Early'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedTransaction.status === 'pending' && (
                    <Button variant="destructive" className="flex-1">
                      Cancel Order
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1">
                    Download Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Early Payment Modal */}
        {earlyPaymentModal.isOpen && earlyPaymentModal.transaction && earlyPaymentModal.payment && (
          <EarlyPaymentModal
            transaction={earlyPaymentModal.transaction}
            payment={earlyPaymentModal.payment}
            isOpen={earlyPaymentModal.isOpen}
            onClose={closeEarlyPaymentModal}
            onSuccess={handleEarlyPaymentSuccess}
          />
        )}
      </div>
    </div>
  );
}
