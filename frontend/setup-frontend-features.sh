#!/bin/bash

echo "🚀 Setting up frontend features..."

# Create shop pages
mkdir -p src/app/\(shop\)/shop
cat > src/app/\(shop\)/shop/page.tsx << 'EEOF'
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const products = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    price: 299.99,
    image: "/api/placeholder/300/300",
    rating: 4.5,
    reviews: 128,
    category: "Electronics",
  },
  {
    id: "2",
    name: "Smart Watch Pro",
    price: 399.99,
    image: "/api/placeholder/300/300",
    rating: 4.8,
    reviews: 256,
    category: "Electronics",
  },
  {
    id: "3",
    name: "Designer Handbag",
    price: 899.99,
    image: "/api/placeholder/300/300",
    rating: 4.7,
    reviews: 89,
    category: "Fashion",
  },
  {
    id: "4",
    name: "Running Shoes Ultra",
    price: 179.99,
    image: "/api/placeholder/300/300",
    rating: 4.6,
    reviews: 342,
    category: "Sports",
  },
];

export default function ShopPage() {
  const router = useRouter();
  const [cart, setCart] = useState<typeof products>([]);

  const addToCart = (product: typeof products[0]) => {
    setCart([...cart, product]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scalapay Shop</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push("/checkout")}
            className="relative"
          >
            <ShoppingCart className="mr-2" />
            Cart ({cart.length})
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="aspect-square bg-gray-100 rounded-md mb-4">
                    {/* Image placeholder */}
                  </div>
                  <Badge className="mb-2">{product.category}</Badge>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm ml-1">{product.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({product.reviews} reviews)
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    Or 4x {formatCurrency(product.price / 4)} with Scalapay
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
EEOF

# Create dashboard layout
mkdir -p src/app/\(dashboard\)/dashboard
cat > src/app/\(dashboard\)/dashboard/layout.tsx << 'EEOF'
"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNav user={user} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
EEOF

# Create WebSocket service
cat > src/services/websocket-service.ts << 'EEOF'
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

class WebSocketService {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().token;
    
    if (!token) {
      console.error("No auth token available");
      return;
    }

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
      auth: {
        token,
      },
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToAnalytics(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit("subscribe:analytics");
    this.socket.on("analytics:update", callback);
  }

  subscribeToTransactions(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.on("transaction:update", callback);
  }

  unsubscribe(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const wsService = new WebSocketService();
EEOF

# Create payment selection component
mkdir -p src/components/features
cat > src/components/features/payment-plan-selector.tsx << 'EEOF'
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";

interface PaymentPlan {
  id: string;
  name: string;
  installments: number;
  description: string;
}

interface PaymentPlanSelectorProps {
  amount: number;
  onSelect: (plan: PaymentPlan) => void;
}

const plans: PaymentPlan[] = [
  {
    id: "pay_in_2",
    name: "Pay in 2",
    installments: 2,
    description: "Split into 2 interest-free payments",
  },
  {
    id: "pay_in_3",
    name: "Pay in 3",
    installments: 3,
    description: "Split into 3 interest-free payments",
  },
  {
    id: "pay_in_4",
    name: "Pay in 4",
    installments: 4,
    description: "Split into 4 interest-free payments",
  },
];

export function PaymentPlanSelector({ amount, onSelect }: PaymentPlanSelectorProps) {
  const [selected, setSelected] = useState(plans[1].id);

  const handleSelect = (value: string) => {
    setSelected(value);
    const plan = plans.find((p) => p.id === value);
    if (plan) onSelect(plan);
  };

  return (
    <RadioGroup value={selected} onValueChange={handleSelect}>
      <div className="grid gap-4">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Label htmlFor={plan.id} className="cursor-pointer">
              <Card className={`transition-all ${
                selected === plan.id 
                  ? "border-purple-600 shadow-lg" 
                  : "hover:shadow-md"
              }`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                      <p className="text-lg font-bold text-purple-600 mt-1">
                        {plan.installments}x {formatCurrency(amount / plan.installments)}
                      </p>
                    </div>
                  </div>
                  {selected === plan.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-purple-600 text-white rounded-full p-1"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </Label>
          </motion.div>
        ))}
      </div>
    </RadioGroup>
  );
}
EEOF

# Create analytics dashboard component
cat > src/components/features/analytics-dashboard.tsx << 'EEOF'
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ResponsiveContainer 
} from "recharts";
import { wsService } from "@/services/websocket-service";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981"];

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 1250000,
    activeUsers: 6500,
    transactions: 12500,
    avgOrderValue: 280,
  });

  const [revenueData, setRevenueData] = useState([
    { name: "Jan", value: 65000 },
    { name: "Feb", value: 85000 },
    { name: "Mar", value: 95000 },
    { name: "Apr", value: 110000 },
    { name: "May", value: 125000 },
    { name: "Jun", value: 140000 },
  ]);

  const [paymentPlanData] = useState([
    { name: "Pay in 2", value: 35 },
    { name: "Pay in 3", value: 45 },
    { name: "Pay in 4", value: 20 },
  ]);

  useEffect(() => {
    wsService.connect();
    wsService.subscribeToAnalytics((data) => {
      // Update stats with real-time data
      if (data.type === "stats") {
        setStats(data.stats);
      }
      if (data.type === "revenue") {
        setRevenueData(data.revenue);
      }
    });

    return () => {
      wsService.unsubscribe("analytics:update");
    };
  }, []);

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      change: "+12.5%",
      color: "text-green-600",
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toLocaleString(),
      icon: Users,
      change: "+8.2%",
      color: "text-blue-600",
    },
    {
      title: "Transactions",
      value: stats.transactions.toLocaleString(),
      icon: ShoppingCart,
      change: "+15.3%",
      color: "text-purple-600",
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(stats.avgOrderValue),
      icon: TrendingUp,
      change: "+5.7%",
      color: "text-pink-600",
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className={`text-sm mt-2 ${stat.color}`}>
                      {stat.change} from last month
                    </p>
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
                  dot={{ fill: "#8b5cf6" }}
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
EEOF

echo "✅ Frontend features created!"
