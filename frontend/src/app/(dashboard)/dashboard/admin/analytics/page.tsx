'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Calendar,
  PieChart,
  Activity,
  Target,
  CreditCard
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminService.getAnalytics,
  });

  if (isLoading) {
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

  const conversionRate = analytics?.totalTransactions > 0 
    ? (analytics.completedTransactions / analytics.totalTransactions * 100).toFixed(1)
    : 0;

  const avgTransactionValue = analytics?.completedTransactions > 0
    ? analytics.completedRevenue / analytics.completedTransactions
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Analytics & Reports</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive platform analytics and performance insights</p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Platform Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics?.platformRevenue || 0)}</p>
                  <p className="text-xs text-gray-500">Commission earned</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Volume</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics?.completedRevenue || 0)}</p>
                  <p className="text-xs text-gray-500">{analytics?.completedTransactions || 0} transactions</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{conversionRate}%</p>
                  <p className="text-xs text-gray-500">Transaction success</p>
                </div>
                <Target className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Transaction</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(avgTransactionValue)}</p>
                  <p className="text-xs text-gray-500">Per completed transaction</p>
                </div>
                <CreditCard className="w-8 h-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Daily Activity (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.dailyData?.slice(-7).map((day, index) => (
                      <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{formatDate(day.date)}</p>
                          <p className="text-sm text-gray-600">{day.transactions} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(day.revenue)}</p>
                          <p className="text-sm text-gray-600">{day.newUsers} new users</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Payment Plan Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.paymentPlanStats && Object.entries(analytics.paymentPlanStats).map(([plan, count]) => {
                      const percentage = analytics.totalTransactions > 0 
                        ? ((count as number) / analytics.totalTransactions * 100).toFixed(1) 
                        : 0;
                      return (
                        <div key={plan} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-primary rounded-full"></div>
                            <span className="font-medium capitalize">{plan}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{count as number}</p>
                            <p className="text-sm text-gray-600">{percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentTransactions?.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">#{transaction.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">{transaction.customerName || 'Customer'}</p>
                      </div>
                      <div className="text-center">
                        <Badge variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{transaction.paymentPlan}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(analytics?.monthlyRevenue || 0)}</p>
                    <p className="text-sm text-gray-600">This month</p>
                    <Badge variant="secondary" className="mt-2">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +15.3%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Platform Commission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(analytics?.platformRevenue || 0)}</p>
                    <p className="text-sm text-gray-600">Total earned</p>
                    <p className="text-xs text-gray-500 mt-2">2.5% commission rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Processing Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                    <p className="text-sm text-gray-600">Total processed</p>
                    <p className="text-xs text-gray-500 mt-2">{analytics?.totalTransactions || 0} transactions</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topMerchants?.map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{merchant.name}</p>
                          <p className="text-sm text-gray-600">{merchant.transactions} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(merchant.revenue)}</p>
                        <p className="text-xs text-gray-500">Commission: {formatCurrency(merchant.revenue * 0.025)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{analytics?.totalUsers || 0}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{analytics?.customerCount || 0}</p>
                  <p className="text-sm text-gray-600">Customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{analytics?.merchantCount || 0}</p>
                  <p className="text-sm text-gray-600">Merchants</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{analytics?.monthlyUsers || 0}</p>
                  <p className="text-sm text-gray-600">New This Month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent User Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentUsers?.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={user.role === 'customer' ? 'default' : user.role === 'merchant' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchants" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{analytics?.merchantCount || 0}</p>
                  <p className="text-sm text-gray-600">Total Merchants</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(analytics?.completedRevenue || 0)}</p>
                  <p className="text-sm text-gray-600">Total Merchant Volume</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency((analytics?.completedRevenue || 0) / Math.max(analytics?.merchantCount || 1, 1))}</p>
                  <p className="text-sm text-gray-600">Avg Revenue per Merchant</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Merchant Performance Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topMerchants?.map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{merchant.name}</p>
                          <p className="text-sm text-gray-600">{merchant.transactions} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(merchant.revenue)}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Avg: {formatCurrency(merchant.revenue / Math.max(merchant.transactions, 1))}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}