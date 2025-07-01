'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { wsService } from '@/services/websocket-service';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 1250000,
    activeUsers: 6500,
    transactions: 12500,
    avgOrderValue: 280,
  });

  const [revenueData, setRevenueData] = useState([
    { name: 'Jan', value: 65000 },
    { name: 'Feb', value: 85000 },
    { name: 'Mar', value: 95000 },
    { name: 'Apr', value: 110000 },
    { name: 'May', value: 125000 },
    { name: 'Jun', value: 140000 },
  ]);

  const [paymentPlanData] = useState([
    { name: 'Pay in 2', value: 35 },
    { name: 'Pay in 3', value: 45 },
    { name: 'Pay in 4', value: 20 },
  ]);

  useEffect(() => {
    wsService.connect();
    wsService.subscribeToAnalytics((data) => {
      // Update stats with real-time data
      if (data.type === 'stats') {
        setStats(data.stats);
      }
      if (data.type === 'revenue') {
        setRevenueData(data.revenue);
      }
    });

    return () => {
      wsService.unsubscribe('analytics:update');
    };
  }, []);

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      change: '+12.5%',
      color: 'text-green-600',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Users,
      change: '+8.2%',
      color: 'text-blue-600',
    },
    {
      title: 'Transactions',
      value: stats.transactions.toLocaleString(),
      icon: ShoppingCart,
      change: '+15.3%',
      color: 'text-purple-600',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      icon: TrendingUp,
      change: '+5.7%',
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className={`text-sm mt-2 ${stat.color}`}>{stat.change} from last month</p>
                  </div>
                  <stat.icon className={`w-12 h-12 ${stat.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentPlanData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
