"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth-service";
import { Eye, EyeOff, CreditCard, Shield, Zap, ArrowRight, Star } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, setToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      console.log("🚀 Starting login process with:", data);
      const response = await authService.login(data);
      console.log("🔍 Full login response:", response);
      console.log("🔍 Response type:", typeof response);
      console.log("🔍 Response keys:", response ? Object.keys(response) : 'null/undefined');
      
      if (!response || !response.accessToken || !response.user) {
        console.log("❌ Missing required fields:", {
          hasResponse: !!response,
          hasAccessToken: !!response?.accessToken,
          hasUser: !!response?.user
        });
        throw new Error("Invalid response format");
      }
      
      setToken(response.accessToken);
      setUser(response.user);
      
      toast({
        title: "Welcome back! 🎉",
        description: "You have successfully logged in.",
      });

      // Redirect based on role
      if (response.user.role === "merchant") {
        router.push("/dashboard/merchant");
      } else if (response.user.role === "admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/customer");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: CreditCard, text: "Flexible Payment Plans" },
    { icon: Shield, text: "Bank-level Security" },
    { icon: Zap, text: "Instant Approvals" },
  ];

  const demoAccounts = [
    { role: "Customer", email: "customer@demo.com", color: "bg-blue-500" },
    { role: "Merchant", email: "merchant@demo.com", color: "bg-green-500" },
    { role: "Admin", email: "admin@demo.com", color: "bg-purple-500" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-8 h-8" />
                <h1 className="text-4xl font-bold">Scalapay</h1>
              </div>
              <p className="text-xl text-white/90">
                The Ultimate Buy Now Pay Later Platform
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  className="flex items-center space-x-4"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <span className="text-lg">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center space-x-1 text-yellow-300">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
              <span className="ml-2 text-white/90">Trusted by 6.5M+ users</span>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm" />
        <div className="absolute bottom-20 right-32 w-20 h-20 bg-white/5 rounded-full backdrop-blur-sm" />
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/5 rounded-full backdrop-blur-sm" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CreditCard className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold gradient-text">Scalapay</h1>
            </div>
            <p className="text-muted-foreground">Buy Now, Pay Later</p>
          </div>

          <Card className="shadow-elegant border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Sign in to your Scalapay account
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-12 bg-white border-muted focus:border-primary transition-all duration-200 text-gray-900"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-12 bg-white border-muted focus:border-primary transition-all duration-200 pr-12 text-gray-900"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 button-gradient text-white font-semibold text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="space-y-6">
              <div className="text-center w-full">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Create Account
                  </Link>
                </p>
              </div>

              {/* Demo Accounts */}
              <div className="w-full space-y-3">
                <p className="text-xs text-gray-600 text-center font-medium">
                  Demo Accounts (password: password123)
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {demoAccounts.map((account, index) => (
                    <motion.div
                      key={account.role}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${account.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.role}</p>
                          <p className="text-xs text-gray-600">{account.email}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
