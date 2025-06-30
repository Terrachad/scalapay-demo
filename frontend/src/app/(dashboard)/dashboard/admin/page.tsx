"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/features/analytics-dashboard";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics-service";
import { formatCurrency } from "@/lib/utils";
import { 
  Users, 
  Store, 
  TrendingUp, 
  AlertCircle,
  Settings,
  Database,
  Activity,
  Shield
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => analyticsService.getStats("month"),
  });

  const systemMetrics = [
    {
      title: "System Health",
      value: "99.9%",
      icon: Activity,
      color: "text-green-600",
      description: "Uptime last 30 days",
    },
    {
      title: "Database Size",
      value: "2.4 GB",
      icon: Database,
      color: "text-blue-600",
      description: "45% of capacity",
    },
    {
      title: "Security Events",
      value: "0",
      icon: Shield,
      color: "text-purple-600",
      description: "No threats detected",
    },
    {
      title: "API Calls",
      value: "1.2M",
      icon: Activity,
      color: "text-orange-600",
      description: "This month",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Platform overview and management
        </p>
      </motion.div>

      {/* System Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {metric.description}
                    </p>
                  </div>
                  <metric.icon className={`w-8 h-8 ${metric.color} opacity-20`} />
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
          <TabsTrigger value="settings">Platform Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">6,543</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-green-600">423</p>
                  <p className="text-sm text-gray-600">New This Month</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">89.2%</p>
                  <p className="text-sm text-gray-600">Active Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="merchants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Merchant Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">245</p>
                  <p className="text-sm text-gray-600">Active Merchants</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-green-600">18</p>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">
                    {formatCurrency(125000)}
                  </p>
                  <p className="text-sm text-gray-600">Avg Monthly Volume</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Fee Structure</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Merchant Fee</p>
                      <p className="font-medium">2.5% per transaction</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Late Payment Fee</p>
                      <p className="font-medium">$25 after 7 days</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Risk Management</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Default Credit Limit</p>
                      <p className="font-medium">$5,000</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Max Transaction</p>
                      <p className="font-medium">$2,000</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
