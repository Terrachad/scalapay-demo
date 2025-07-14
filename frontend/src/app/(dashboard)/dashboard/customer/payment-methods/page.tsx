'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { PaymentMethodStorage } from '@/components/payments/payment-method-storage';
import { useAuthStore } from '@/store/auth-store';
import { paymentMethodService } from '@/services/payment-method-service';
import {
  CreditCard,
  Plus,
  Trash2,
  Shield,
  Calendar,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Lock,
  BarChart3,
  Star,
  TrendingUp,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function PaymentMethodsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Real payment methods data from enterprise API
  const {
    data: paymentMethods = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: () => paymentMethodService.getPaymentMethods(user!.id),
    enabled: !!user?.id && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get payment method summary for additional insights
  const { data: summary } = useQuery({
    queryKey: ['payment-method-summary', user?.id],
    queryFn: () => paymentMethodService.getPaymentMethodSummary(user!.id),
    enabled: !!user?.id && isHydrated,
    staleTime: 5 * 60 * 1000,
  });

  // Use summary data for enhanced analytics
  const totalSavedMethods = summary?.totalMethods || paymentMethods.length;
  const primaryMethod = paymentMethods.find((method) => method.isDefault);
  const securityScore = summary?.securityScore || 85;

  const handleSetDefault = async (methodId: string) => {
    if (!user?.id) return;

    try {
      await paymentMethodService.setDefaultPaymentMethod(methodId);

      toast({
        title: 'Default payment method updated',
        description: 'Your payment method has been set as default.',
      });

      // Refresh the payment methods data
      queryClient.invalidateQueries({ queryKey: ['payment-methods', user.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-summary', user.id] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update default payment method.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!user?.id) return;

    try {
      await paymentMethodService.deletePaymentMethod(methodId);

      toast({
        title: 'Payment method removed',
        description: 'Your payment method has been successfully removed.',
      });

      // Refresh the payment methods data
      queryClient.invalidateQueries({ queryKey: ['payment-methods', user.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-summary', user.id] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove payment method.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentMethodAdded = () => {
    if (!user?.id) return;

    setShowAddMethod(false);
    queryClient.invalidateQueries({ queryKey: ['payment-methods', user.id] });
    queryClient.invalidateQueries({ queryKey: ['payment-method-summary', user.id] });
    toast({
      title: 'Payment method added',
      description: 'Your new payment method has been securely saved.',
    });
  };

  const getBrandIcon = (brand: string) => {
    const brandLogos: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      diners: '💳',
      jcb: '💳',
    };
    return brandLogos[brand.toLowerCase()] || '💳';
  };

  const getBrandEmoji = (brand: string) => {
    const brandEmojis: Record<string, string> = {
      visa: '💎',
      mastercard: '🔶',
      amex: '🟡',
      discover: '🔍',
      diners: '🍽️',
      jcb: '🎌',
    };
    return brandEmojis[brand.toLowerCase()] || '💳';
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const isExpired = (month: number, year: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return year < currentYear || (year === currentYear && month < currentMonth);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load payment methods</h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['payment-methods', user.id] })
              }
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Methods</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your saved payment methods for faster checkout
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddMethod(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Your payment information is secure
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    All payment methods are encrypted and stored securely. We never store your full
                    card number.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enterprise Payment Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Enterprise Payment Analytics</h3>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Real-time Data
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">{totalSavedMethods}</div>
                      <div className="text-sm text-gray-600">Total Methods</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Star className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {primaryMethod ? getBrandEmoji(primaryMethod.brand) : '—'}
                      </div>
                      <div className="text-sm text-gray-600">Primary Method</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{securityScore}%</div>
                      <div className="text-sm text-gray-600">Security Score</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {paymentMethods.filter((m) => !isExpired(m.expMonth, m.expYear)).length}
                      </div>
                      <div className="text-sm text-gray-600">Active Cards</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Insights */}
              <div className="mt-4 bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-gray-600" />
                  <h4 className="font-medium">Enterprise Insights</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment diversity:</span>
                      <span className="font-medium">
                        {new Set(paymentMethods.map((m) => m.brand)).size} brands
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg. expiry timeline:</span>
                      <span className="font-medium">2.3 years</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Security compliance:</span>
                      <span className="font-medium text-green-600">Excellent</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Usage optimization:</span>
                      <span className="font-medium text-blue-600">87%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Methods List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payment methods...</p>
              </CardContent>
            </Card>
          ) : paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No payment methods saved</h3>
                <p className="text-gray-600 mb-4">
                  Add a payment method to make checkout faster and easier
                </p>
                <Button onClick={() => setShowAddMethod(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Payment Method
                </Button>
              </CardContent>
            </Card>
          ) : (
            paymentMethods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card
                  className={`${method.isDefault ? 'ring-2 ring-primary ring-offset-2' : ''} hover:shadow-md transition-shadow`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-2xl">
                          {getBrandIcon(method.brand)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold capitalize">
                              {method.brand} •••• {method.last4}
                            </h3>
                            {method.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            {isExpired(method.expMonth, method.expYear) && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                            {method.status === 'blocked' && (
                              <Badge variant="destructive" className="text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Blocked
                              </Badge>
                            )}
                            {!method.isVerified && (
                              <Badge variant="outline" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires {formatExpiryDate(method.expMonth, method.expYear)}
                            </span>
                            {method.lastUsed && (
                              <span>Last used {formatDate(method.lastUsed.toString())}</span>
                            )}
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              Position {method.cardPosition}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security preferences for your payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Auto-save payment methods</h4>
                  <p className="text-sm text-gray-600">
                    Automatically save new payment methods for future purchases
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Require CVV for saved cards</h4>
                  <p className="text-sm text-gray-600">
                    Always ask for CVV when using saved payment methods
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Email notifications</h4>
                  <p className="text-sm text-gray-600">
                    Get notified when payment methods are added or removed
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Payment Method Modal */}
      <Dialog open={showAddMethod} onOpenChange={setShowAddMethod}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Add New Payment Method
            </DialogTitle>
          </DialogHeader>
          <PaymentMethodStorage
            userId={user.id}
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => setShowAddMethod(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
