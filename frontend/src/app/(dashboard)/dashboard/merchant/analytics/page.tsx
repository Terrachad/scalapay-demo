'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { transactionService, Transaction } from '@/services/transaction-service';
import { merchantService } from '@/services/merchant-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  BarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Download,
  Filter,
  PieChart,
  LineChart,
  Target,
  Clock
} from 'lucide-react';

export default function MerchantAnalyticsPage() {
  const [timeframe, setTimeframe] = useState('7d');

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['merchant-transactions'],
    queryFn: transactionService.getMerchantTransactions,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['merchant-analytics'],
    queryFn: merchantService.getAnalytics,
  });

  const loading = transactionsLoading || analyticsLoading;

  // Use real analytics data when available, fallback to calculated data
  const totalRevenue = analytics?.totalRevenue ?? (transactions ? 
    transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) : 0
  );

  const completedTransactions = analytics?.completedTransactions ?? (transactions ? 
    transactions.filter(t => t.status === 'completed').length : 0
  );
  
  const completedRevenue = analytics?.completedRevenue ?? (transactions ? 
    transactions.filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) : 0
  );

  const pendingRevenue = transactions ? 
    transactions.filter(t => ['pending', 'approved'].includes(t.status))
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) : 0;

  const avgOrderValue = analytics?.avgOrderValue ?? (transactions && transactions.length > 0 ? totalRevenue / transactions.length : 0);
  const conversionRate = analytics?.conversionRate ?? (transactions && transactions.length > 0 ? (completedTransactions / transactions.length) * 100 : 0);

  // Payment plan distribution
  const paymentPlanStats = analytics?.paymentPlanStats ?? (transactions ? 
    transactions.reduce((acc, t) => {
      acc[t.paymentPlan] = (acc[t.paymentPlan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) : {}
  );

  // Daily revenue for the last 7 days
  const dailyRevenue = analytics?.dailyRevenue ?? (transactions ? 
    (() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      return last7Days.map(date => {
        const dayTransactions = transactions.filter(t => 
          t.createdAt.startsWith(date)
        );
        return {
          date,
          revenue: dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
          orders: dayTransactions.length
        };
      });
    })() : []
  );

  // Top performing items
  const topItems = analytics?.topItems ?? (transactions ? 
    (() => {
      const itemStats = transactions.flatMap(t => t.items).reduce((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += item.price * item.quantity;
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>);

      return Object.entries(itemStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([name, stats]) => ({ name, ...stats }));
    })() : []
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Store Analytics
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Detailed insights into your store performance
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalRevenue)}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +23% from last period
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(avgOrderValue)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +8% from last period
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5.2% from last period
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {transactions.length}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% from last period
                    </p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed breakdown of your store metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="payments">Payment Plans</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="mt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Daily Revenue (Last 7 Days)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {dailyRevenue.map((day, index) => (
                            <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div>
                                <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-600">{day.orders} orders</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(day.revenue)}</p>
                                <div className="w-20 h-2 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-2 bg-blue-500 rounded-full" 
                                    style={{ width: `${Math.min((day.revenue / Math.max(...dailyRevenue.map(d => d.revenue))) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-300">Completed Orders</p>
                              <p className="text-sm text-green-600">{completedTransactions.length} transactions</p>
                            </div>
                            <p className="text-xl font-bold text-green-800 dark:text-green-300">
                              {formatCurrency(completedRevenue)}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div>
                              <p className="font-medium text-yellow-800 dark:text-yellow-300">Pending Revenue</p>
                              <p className="text-sm text-yellow-600">{transactions.filter(t => ['pending', 'approved'].includes(t.status)).length} transactions</p>
                            </div>
                            <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300">
                              {formatCurrency(pendingRevenue)}
                            </p>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-300">Commission (2.5%)</p>
                              <p className="text-sm text-blue-600">Platform fee</p>
                            </div>
                            <p className="text-xl font-bold text-blue-800 dark:text-blue-300">
                              {formatCurrency(totalRevenue * 0.025)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="products" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Performing Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topItems.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold">#{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-600">{item.quantity} units sold</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(item.revenue)}</p>
                              <p className="text-sm text-gray-600">{formatCurrency(item.revenue / item.quantity)} avg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Plan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(paymentPlanStats).map(([plan, count]) => (
                          <div key={plan} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{plan.replace('_', ' ').toUpperCase()}</p>
                              <p className="text-sm text-gray-600">{((count / transactions.length) * 100).toFixed(1)}% of orders</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">{count}</p>
                              <div className="w-24 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-primary rounded-full" 
                                  style={{ width: `${(count / Math.max(...Object.values(paymentPlanStats))) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Growth Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="font-medium">Revenue Growth</p>
                                <p className="text-sm text-gray-600">vs last period</p>
                              </div>
                            </div>
                            <span className="text-xl font-bold text-green-600">+23.4%</span>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">Order Volume</p>
                                <p className="text-sm text-gray-600">vs last period</p>
                              </div>
                            </div>
                            <span className="text-xl font-bold text-blue-600">+12.1%</span>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-purple-500" />
                              <div>
                                <p className="font-medium">Customer Acquisition</p>
                                <p className="text-sm text-gray-600">vs last period</p>
                              </div>
                            </div>
                            <span className="text-xl font-bold text-purple-600">+8.7%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-800 dark:text-green-300">Strong Performance</span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Your conversion rate is 15% above industry average
                            </p>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-800 dark:text-blue-300">Optimization Opportunity</span>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Consider promoting Pay in 4 plans to increase average order value
                            </p>
                          </div>

                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium text-yellow-800 dark:text-yellow-300">Pending Review</span>
                            </div>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              {transactions.filter(t => t.status === 'pending').length} transactions waiting for approval
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}