'use client';

import { motion } from 'framer-motion';
import { AnalyticsDashboard } from '@/components/features/analytics-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transaction-service';
import { merchantService } from '@/services/merchant-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Download,
  Store,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function MerchantDashboard() {
  const { data: transactions } = useQuery({
    queryKey: ['merchant-transactions'],
    queryFn: transactionService.getMerchantTransactions,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['merchant-analytics'],
    queryFn: merchantService.getAnalytics,
  });

  const { data: profile } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: merchantService.getProfile,
  });

  // Use real analytics data when available, fallback to calculated data
  const todaysRevenue =
    analytics?.todayRevenue ??
    (transactions && Array.isArray(transactions)
      ? transactions
          .filter((t) => {
            const today = new Date().toDateString();
            return new Date(t.createdAt).toDateString() === today;
          })
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
      : 0);

  const pendingSettlements = analytics?.completedRevenue
    ? analytics.completedRevenue * 0.975
    : transactions && Array.isArray(transactions)
      ? transactions
          .filter((t) => t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()) * 0.975, 0)
      : 0; // 2.5% fee

  const conversionRate = analytics?.conversionRate ?? 68.5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-8 h-8 text-primary" />
              <h1 className="text-2xl lg:text-3xl font-bold">
                {profile?.businessName || 'Merchant Dashboard'}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Monitor your sales and analytics</p>
            {profile && (
              <Badge variant={profile.isActive ? 'default' : 'secondary'} className="mt-2">
                {profile.isActive ? 'Active Store' : 'Inactive Store'}
              </Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm">
              Filter
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-gray-600 truncate">Today&apos;s Revenue</p>
                    <p className="text-lg lg:text-2xl font-bold truncate">
                      {formatCurrency(todaysRevenue)}
                    </p>
                    <p className="text-xs lg:text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {analytics
                          ? `+${((todaysRevenue / (analytics.weekRevenue / 7 || 1) - 1) * 100).toFixed(1)}%`
                          : '+23%'}{' '}
                        from avg
                      </span>
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 opacity-20 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-gray-600 truncate">Pending Settlements</p>
                    <p className="text-lg lg:text-2xl font-bold truncate">
                      {formatCurrency(pendingSettlements)}
                    </p>
                    <p className="text-xs lg:text-sm text-gray-500 mt-1 truncate">
                      Next payout in 2 days
                    </p>
                  </div>
                  <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600 opacity-20 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-gray-600 truncate">Total Transactions</p>
                    <p className="text-lg lg:text-2xl font-bold truncate">
                      {analytics?.totalTransactions ?? transactions?.length ?? 0}
                    </p>
                    <p className="text-xs lg:text-sm text-blue-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {analytics
                          ? `${analytics.completedTransactions} completed`
                          : '+15% this month'}
                      </span>
                    </p>
                  </div>
                  <ShoppingCart className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 opacity-20 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-gray-600 truncate">Conversion Rate</p>
                    <p className="text-lg lg:text-2xl font-bold truncate">
                      {conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-xs lg:text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {analytics
                          ? `${analytics.pendingTransactions} pending`
                          : '+2.3% improvement'}
                      </span>
                    </p>
                  </div>
                  <Users className="w-6 h-6 lg:w-8 lg:h-8 text-pink-600 opacity-20 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <AnalyticsDashboard />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.recentTransactions || transactions)?.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">Order #{transaction.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.createdAt)}</p>
                      {transaction.items && transaction.items.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {transaction.items[0].name}
                          {transaction.items.length > 1 && ` +${transaction.items.length - 1} more`}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right flex sm:flex-col items-start sm:items-end gap-2">
                      <p className="font-bold text-lg sm:text-base">
                        {formatCurrency(parseFloat(transaction.amount.toString()))}
                      </p>
                      <Badge
                        variant={
                          transaction.status === 'completed'
                            ? 'default'
                            : transaction.status === 'pending'
                              ? 'secondary'
                              : transaction.status === 'approved'
                                ? 'outline'
                                : 'destructive'
                        }
                        className="text-xs"
                      >
                        {transaction.status === 'approved' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {transaction.status}
                          </>
                        ) : (
                          transaction.status
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!transactions || transactions.length === 0) && !analyticsLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
