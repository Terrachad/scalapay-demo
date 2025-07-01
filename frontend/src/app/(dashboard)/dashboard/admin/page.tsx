'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsDashboard } from '@/components/features/analytics-dashboard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  Store,
  TrendingUp,
  AlertCircle,
  Settings,
  Database,
  Activity,
  Shield,
  DollarSign,
  ShoppingCart,
  UserCheck,
  Building2,
  BarChart3,
  PieChart
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminService.getAnalytics,
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.getAllUsers(),
  });

  const { data: merchants } = useQuery({
    queryKey: ['admin-merchants'],
    queryFn: adminService.getAllMerchants,
  });

  // Calculate real metrics
  const activeUsers = users?.filter(u => u.isActive).length || 0;
  const activeUserRate = users?.length ? (activeUsers / users.length) * 100 : 0;
  const activeMerchants = merchants?.filter(m => m.isActive).length || 0;

  const platformMetrics = [
    {
      title: 'Platform Revenue',
      value: formatCurrency(analytics?.platformRevenue || 0),
      icon: DollarSign,
      color: 'text-green-600',
      description: `${analytics?.completedTransactions || 0} completed transactions`,
      change: '+12.3%'
    },
    {
      title: 'Total Users',
      value: analytics?.totalUsers?.toLocaleString() || '0',
      icon: Users,
      color: 'text-blue-600',
      description: `${analytics?.monthlyUsers || 0} new this month`,
      change: '+8.7%'
    },
    {
      title: 'Active Merchants',
      value: activeMerchants.toString(),
      icon: Building2,
      color: 'text-purple-600',
      description: `${analytics?.merchantCount || 0} total merchants`,
      change: '+5.2%'
    },
    {
      title: 'Total Volume',
      value: formatCurrency(analytics?.totalRevenue || 0),
      icon: ShoppingCart,
      color: 'text-orange-600',
      description: `${analytics?.totalTransactions || 0} total transactions`,
      change: '+23.1%'
    },
  ];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Platform overview and management</p>
        </motion.div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {platformMetrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm text-gray-600 truncate">{metric.title}</p>
                      <p className="text-lg lg:text-2xl font-bold truncate">{metric.value}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs lg:text-sm text-gray-500 truncate">{metric.description}</p>
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {metric.change}
                        </Badge>
                      </div>
                    </div>
                    <metric.icon className={`w-6 h-6 lg:w-8 lg:h-8 ${metric.color} opacity-20 flex-shrink-0`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="merchants">Merchant Management</TabsTrigger>
          <TabsTrigger value="navigation">Quick Access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-blue-600">
                      {analytics?.customerCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">Customers</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-green-600">
                      {analytics?.monthlyUsers || 0}
                    </p>
                    <p className="text-sm text-gray-600">New This Month</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-purple-600">
                      {activeUserRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Active Rate</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-orange-600">
                      {analytics?.adminCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentUsers?.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={user.role === 'customer' ? 'default' : user.role === 'merchant' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                        <p className="text-xs text-gray-500">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchants" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Merchant Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-blue-600">
                      {activeMerchants}
                    </p>
                    <p className="text-sm text-gray-600">Active Merchants</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-green-600">
                      {analytics?.merchantCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Merchants</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-purple-600">
                      {formatCurrency(analytics?.monthlyRevenue || 0)}
                    </p>
                    <p className="text-sm text-gray-600">Monthly Volume</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl lg:text-3xl font-bold text-orange-600">
                      {formatCurrency(analytics?.platformRevenue || 0)}
                    </p>
                    <p className="text-sm text-gray-600">Platform Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topMerchants?.slice(0, 5).map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{merchant.name}</p>
                          <p className="text-sm text-gray-600">{merchant.transactions} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(merchant.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">User Management</h3>
                    <p className="text-sm text-gray-600">Manage all platform users</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/users'}
                >
                  View Users
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Merchant Management</h3>
                    <p className="text-sm text-gray-600">Manage merchant accounts</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/merchants'}
                >
                  View Merchants
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Analytics & Reports</h3>
                    <p className="text-sm text-gray-600">Detailed platform analytics</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/analytics'}
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Transaction Management</h3>
                    <p className="text-sm text-gray-600">Approve and manage transactions</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/transactions'}
                >
                  Manage Transactions
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Platform Settings</h3>
                    <p className="text-sm text-gray-600">Configure system settings</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/settings'}
                >
                  View Settings
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pending Approvals</h3>
                    <p className="text-sm text-gray-600">Review merchant applications</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/settings?tab=approvals'}
                >
                  Review Applications
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">System Status</h3>
                    <p className="text-sm text-gray-600">Monitor system health</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = '/dashboard/admin/settings?tab=system'}
                >
                  View Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
