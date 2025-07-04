'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { transactionService, Transaction } from '@/services/transaction-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  DollarSign,
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

export default function MerchantTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getMerchantTransactions();
      setTransactions(data);
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

  const getNextPaymentInfo = (transaction: Transaction) => {
    const nextPayment = transaction.payments?.find((p) => p.status === 'scheduled');
    if (!nextPayment) {
      return {
        exists: false,
        amount: 0,
        dueDate: null,
        daysTillDue: 0,
        isOverdue: false,
        formattedDate: 'N/A',
        remainingPayments: 0,
      };
    }

    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    const daysTillDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysTillDue < 0;
    const remainingPayments =
      transaction.payments?.filter((p) => p.status === 'scheduled').length || 0;

    return {
      exists: true,
      amount: parseFloat(nextPayment.amount?.toString() || '0'),
      dueDate,
      daysTillDue: Math.abs(daysTillDue),
      isOverdue,
      formattedDate: dueDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      remainingPayments,
    };
  };

  const getNextPaymentDate = (transaction: Transaction) => {
    const nextPayment = transaction.payments?.find((p) => p.status === 'scheduled');
    return nextPayment ? new Date(nextPayment.dueDate).toLocaleDateString() : 'Completed';
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const completedRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const pendingRevenue = transactions
    .filter((t) => ['pending', 'approved'].includes(t.status))
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Order Management
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your store orders and revenue from Scalapay transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(completedRevenue)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(pendingRevenue)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Orders
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {transactions.length}
                    </p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Complete overview of all orders processed through Scalapay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" onClick={() => setFilter('all')}>
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending" onClick={() => setFilter('pending')}>
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="approved" onClick={() => setFilter('approved')}>
                    Approved
                  </TabsTrigger>
                  <TabsTrigger value="completed" onClick={() => setFilter('completed')}>
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="rejected" onClick={() => setFilter('rejected')}>
                    Rejected
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-6">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        No transactions found
                      </h3>
                      <p className="text-gray-500">
                        No {filter === 'all' ? '' : filter} transactions to display
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTransactions.map((transaction) => (
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
                                  Customer: {transaction.userId?.slice(0, 8)}...
                                </p>
                                <div className="mt-1">
                                  <p
                                    className={`text-xs ${(() => {
                                      const nextInfo = getNextPaymentInfo(transaction);
                                      return nextInfo.isOverdue
                                        ? 'text-red-600 font-medium'
                                        : nextInfo.daysTillDue <= 3
                                          ? 'text-yellow-600'
                                          : 'text-gray-500';
                                    })()}`}
                                  >
                                    {(() => {
                                      const nextInfo = getNextPaymentInfo(transaction);
                                      if (!nextInfo.exists) return 'All payments complete';
                                      return `Next: ${formatCurrency(nextInfo.amount)} • ${nextInfo.isOverdue ? `${nextInfo.daysTillDue} days overdue` : nextInfo.daysTillDue === 0 ? 'Due today' : `${nextInfo.daysTillDue} days left`}`;
                                    })()}
                                  </p>
                                </div>
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
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                Commission
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {formatCurrency(parseFloat(transaction.amount.toString()) * 0.025)}
                              </p>
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
                              <span>Updated {formatDate(transaction.updatedAt)}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTransaction(transaction)}
                              >
                                View Details
                              </Button>
                              {transaction.status === 'completed' && (
                                <Button size="sm" variant="default">
                                  Download Receipt
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                          {selectedTransaction.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Plan</label>
                        <p>{selectedTransaction.paymentPlan?.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order Date</label>
                        <p>{formatDate(selectedTransaction.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Customer Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Customer ID</label>
                        <p className="font-mono">
                          {selectedTransaction.userId?.slice(0, 8) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Revenue</label>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(
                            parseFloat(selectedTransaction.amount?.toString() || '0') * 0.975,
                          )}
                        </p>
                        <p className="text-sm text-gray-500">After 2.5% Scalapay fee</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Commission</label>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(
                            parseFloat(selectedTransaction.amount?.toString() || '0') * 0.025,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Items Sold</h3>
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

                {/* Payment Schedule */}
                {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Payment Schedule</h3>
                    <div className="space-y-3">
                      {selectedTransaction.payments.map((payment: any, index: number) => (
                        <div
                          key={payment.id}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">Payment #{index + 1}</p>
                            <p className="text-sm text-gray-600">
                              Due: {formatDate(payment.dueDate)}
                            </p>
                            {payment.paymentDate && (
                              <p className="text-sm text-green-600">
                                Paid: {formatDate(payment.paymentDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(parseFloat(payment.amount?.toString() || '0'))}
                            </p>
                            <Badge
                              variant={
                                payment.status === 'completed'
                                  ? 'default'
                                  : payment.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
