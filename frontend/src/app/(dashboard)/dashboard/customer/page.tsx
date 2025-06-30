"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionService } from "@/services/transaction-service";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  CreditCard, 
  ShoppingBag, 
  Calendar, 
  TrendingUp,
  ArrowRight,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [creditUsage, setCreditUsage] = useState(0);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: transactionService.getMyTransactions,
  });

  useEffect(() => {
    if (user) {
      const creditLimit = user.creditLimit ?? 0;
      const availableCredit = user.availableCredit ?? 0;
      const used = (creditLimit - availableCredit) || 0;
      const percentage = creditLimit > 0 ? (used / creditLimit) * 100 : 0;
      setCreditUsage(percentage);
    }
  }, [user]);

  const upcomingPayments = transactions
    ?.flatMap(t => t.payments)
    .filter(p => p.status === "scheduled")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const recentTransactions = transactions?.slice(0, 5);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your purchases and payments
        </p>
      </motion.div>

      {/* Credit Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Credit Used</span>
                <span className="text-sm font-medium">
                  {formatCurrency((user?.creditLimit ?? 0) - (user?.availableCredit ?? 0))} / 
                  {formatCurrency(user?.creditLimit ?? 0)}
                </span>
              </div>
              <Progress value={creditUsage} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-sm text-gray-600">Available Credit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(user?.availableCredit ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold">
                  {transactions?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/shop">
              <Button variant="secondary" className="w-full justify-between">
                <span>Continue Shopping</span>
                <ShoppingBag className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard/customer/transactions">
              <Button variant="secondary" className="w-full justify-between">
                <span>View All Transactions</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Payments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>
              Your next scheduled payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingPayments && upcomingPayments.length > 0 ? (
              <div className="space-y-4">
                {upcomingPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Due {formatDate(payment.dueDate)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Scheduled</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No upcoming payments
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-4 mt-4">
                {recentTransactions?.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.merchant.businessName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge
                        variant={
                          transaction.status === "completed"
                            ? "default"
                            : transaction.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
