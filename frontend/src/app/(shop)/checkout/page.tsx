'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PaymentPlanSelector } from '@/components/features/payment-plan-selector';
import { useToast } from '@/components/ui/use-toast';
import { transactionService } from '@/services/transaction-service';
import { merchantService } from '@/services/merchant-service';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import Link from 'next/link';

interface PaymentPlan {
  id: string;
  name: string;
  installments: number;
  description: string;
}

const steps = ['Cart Review', 'Payment Plan', 'Payment Details', 'Confirmation'];

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const { items: cartItems, getTotalPrice, clearCart } = useCartStore();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalAmount = getTotalPrice();

  const handlePlanSelect = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
  };

  // Initialize with default plan when component mounts
  useEffect(() => {
    if (mounted && !selectedPlan) {
      const defaultPlan = {
        id: 'pay_in_3',
        name: 'Pay in 3',
        installments: 3,
        description: 'Split into 3 interest-free payments',
      };
      setSelectedPlan(defaultPlan);
    }
  }, [mounted, selectedPlan]);

  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!selectedPlan) {
      toast({
        title: 'Error',
        description: 'Please select a payment plan.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Get demo merchant ID from backend, with fallback
      let merchantId = '123e4567-e89b-12d3-a456-426614174000'; // Default fallback
      try {
        const demoMerchant = await merchantService.getDemoMerchant();
        merchantId = demoMerchant.id;
        console.log('Using merchant:', demoMerchant);
      } catch (error) {
        console.warn('Failed to fetch demo merchant, using fallback:', error);
      }
      
      const transactionData = {
        amount: totalAmount,
        merchantId: merchantId,
        paymentPlan: selectedPlan.id,
        items: cartItems.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };
      
      console.log('Transaction data being sent:', transactionData);
      
      const transaction = await transactionService.create(transactionData);

      // Invalidate and refetch transaction queries
      await queryClient.invalidateQueries({ queryKey: ['customer-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });

      toast({
        title: 'Success!',
        description: 'Your order has been placed successfully.',
      });

      // Clear cart after successful purchase
      clearCart();

      router.push(`/checkout/success?id=${transaction.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (mounted && cartItems.length === 0) {
      router.push('/cart');
    }
  }, [mounted, cartItems.length, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/cart">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cart
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">Checkout</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Shield className="w-4 h-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <Progress value={progress} className="h-2 sm:h-3 mb-3 sm:mb-4" />
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <span
                key={step}
                className={`text-xs sm:text-sm font-medium ${
                  index <= currentStep ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <span className="hidden sm:inline">{step}</span>
                <span className="sm:hidden">{index + 1}</span>
              </span>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="shadow-elegant border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Review Your Cart
                      </CardTitle>
                      <CardDescription>
                        Confirm your items before proceeding to payment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 sm:space-y-4">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/api/placeholder/300/300';
                                }}
                              />
                              {item.isOnSale && (
                                <div className="absolute top-1 left-1">
                                  <span className="text-xs font-bold text-red-600 bg-white px-1 rounded">
                                    SALE
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2">
                                {item.name}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {item.category} • Qty: {item.quantity}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-bold text-sm sm:text-base text-primary">
                                  {formatCurrency(item.price)}
                                </span>
                                {item.originalPrice && (
                                  <span className="text-xs sm:text-sm text-gray-500 line-through">
                                    {formatCurrency(item.originalPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-sm sm:text-lg">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                or 4x {formatCurrency((item.price * item.quantity) / 4)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="payment-plan"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="shadow-elegant border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Select Payment Plan
                      </CardTitle>
                      <CardDescription>
                        Choose how you'd like to split your payment - completely interest-free
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentPlanSelector amount={totalAmount} onSelect={handlePlanSelect} />
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <Shield className="w-5 h-5" />
                          <p className="text-sm font-medium">No interest or hidden fees</p>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Pay exactly what you see, split over time with complete transparency
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="shadow-elegant border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Payment Information
                      </CardTitle>
                      <CardDescription>
                        Enter your payment details securely - all data is encrypted
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber" className="text-sm font-medium">
                            Card Number
                          </Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={paymentDetails.cardNumber}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                cardNumber: e.target.value,
                              })
                            }
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardName" className="text-sm font-medium">
                            Cardholder Name
                          </Label>
                          <Input
                            id="cardName"
                            placeholder="John Doe"
                            value={paymentDetails.cardName}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                cardName: e.target.value,
                              })
                            }
                            className="h-12"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate" className="text-sm font-medium">
                              Expiry Date
                            </Label>
                            <Input
                              id="expiryDate"
                              placeholder="MM/YY"
                              value={paymentDetails.expiryDate}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  expiryDate: e.target.value,
                                })
                              }
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv" className="text-sm font-medium">
                              CVV
                            </Label>
                            <Input
                              id="cvv"
                              placeholder="123"
                              value={paymentDetails.cvv}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  cvv: e.target.value,
                                })
                              }
                              className="h-12"
                            />
                          </div>
                        </div>
                      </form>
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <Lock className="w-4 h-4" />
                          <p className="text-sm font-medium">SSL Encrypted & Secure</p>
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Your payment information is protected with bank-level security
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Confirmation</CardTitle>
                      <CardDescription>Review and confirm your order</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Ready to Complete!</h3>
                            <p className="text-gray-600">
                              Your order total: {formatCurrency(totalAmount)}
                            </p>
                            {selectedPlan && (
                              <p className="text-purple-600 font-medium mt-2">
                                {selectedPlan.installments} payments of{' '}
                                {formatCurrency(totalAmount / selectedPlan.installments)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Payment Schedule</h4>
                          <div className="space-y-2">
                            {selectedPlan &&
                              Array.from({ length: selectedPlan.installments }).map((_, index) => {
                                const date = new Date();
                                date.setMonth(date.getMonth() + index);
                                return (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>Payment {index + 1}</span>
                                    <span>
                                      {formatCurrency(totalAmount / selectedPlan.installments)} -{' '}
                                      {date.toLocaleDateString()}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 sm:mt-8"
            >
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="h-10 sm:h-12 px-4 sm:px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && !selectedPlan}
                  className="button-gradient h-10 sm:h-12 px-4 sm:px-6"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="button-gradient h-10 sm:h-12 px-6 sm:px-8"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm sm:text-base">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Complete Purchase</span>
                    </div>
                  )}
                </Button>
              )}
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-24"
            >
              <Card className="shadow-elegant border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-gray-600 dark:text-gray-300">
                            Qty: {item.quantity} • {item.category}
                          </p>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Shipping</span>
                      <span className="font-medium text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Tax</span>
                      <span className="font-medium">{formatCurrency(totalAmount * 0.1)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(totalAmount + totalAmount * 0.1)}
                      </span>
                    </div>
                    {selectedPlan && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                        <p className="text-sm font-medium text-primary">
                          {selectedPlan.installments}x{' '}
                          {formatCurrency(
                            (totalAmount + totalAmount * 0.1) / selectedPlan.installments,
                          )}{' '}
                          interest-free
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          First payment today, then every 2 weeks
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Security Badge */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs font-medium">256-bit SSL Secured</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
