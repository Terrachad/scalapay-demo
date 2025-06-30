"use client";

import { motion } from "framer-motion";
import { AnalyticsDashboard } from "@/components/features/analytics-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { transactionService } from "@/services/transaction-service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Download,
  Filter
} from "lucide-react";

export default function MerchantDashboard() {
  const { data: transactions } = useQuery({
    queryKey: ["merchant-transactions"],
    queryFn: transactionService.getMerchantTransactions,
  });

  const todaysRevenue = transactions
    ?.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.createdAt).toDateString() === today;
    })
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const pendingSettlements = transactions
    ?.filter(t => t.status === "completed")
    .reduce((sum, t) => sum + (t.amount * 0.975), 0) || 0; // 2.5% fee

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Merchant Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your sales and analytics
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
      </motion.div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(todaysRevenue)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +23% from yesterday
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Settlements</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pendingSettlements)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Next payout in 2 days
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold">
                    {transactions?.length || 0}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +15% this month
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold">68.5%</p>
                  <p className="text-sm text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +2.3% improvement
                  </p>
                </div>
                <Users className="w-8 h-8 text-pink-600 opacity-20" />
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
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions?.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Order #{transaction.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant={
                      transaction.status === "completed" ? "default" : "secondary"
                    }>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
