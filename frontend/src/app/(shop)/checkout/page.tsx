"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PaymentPlanSelector } from "@/components/features/payment-plan-selector";
import { useToast } from "@/components/ui/use-toast";
import { transactionService } from "@/services/transaction-service";
import { formatCurrency } from "@/lib/utils";
import { 
  ShoppingCart, 
  CreditCard, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  Shield,
  Lock
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface PaymentPlan {
  id: string;
  name: string;
  installments: number;
  description: string;
}

const steps = ["Cart Review", "Payment Plan", "Payment Details", "Confirmation"];

// Mock cart data - in real app, this would come from cart state
const cartItems = [
  { id: "1", name: "Premium Wireless Headphones", price: 299.99, quantity: 1 },
  { id: "2", name: "Smart Watch Pro", price: 399.99, quantity: 1 },
];

const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
  };
  
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
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
      router.push("/auth/login");
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a payment plan.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const transaction = await transactionService.create({
        amount: totalAmount,
        merchantId: "demo-merchant-id",
        paymentPlan: selectedPlan.id,
        items: cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      toast({
        title: "Success!",
        description: "Your order has been placed successfully.",
      });

      router.push(`/checkout/success?id=${transaction.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Checkout</h1>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <span
                key={step}
                className={`text-sm ${
                  index <= currentStep
                    ? "text-purple-600 font-medium"
                    : "text-gray-400"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Your Cart</CardTitle>
                      <CardDescription>
                        Confirm your items before proceeding
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-4 border rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-600">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <p className="font-bold">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Payment Plan</CardTitle>
                      <CardDescription>
                        Choose how you'd like to split your payment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentPlanSelector
                        amount={totalAmount}
                        onSelect={handlePlanSelect}
                      />
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <Shield className="w-5 h-5" />
                          <p className="text-sm font-medium">
                            No interest or hidden fees
                          </p>
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Pay exactly what you see, split over time
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Information</CardTitle>
                      <CardDescription>
                        Enter your payment details securely
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4">
                        <div>
                          <Label htmlFor="cardNumber">Card Number</Label>
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
                          />
                        </div>
                        <div>
                          <Label htmlFor="cardName">Cardholder Name</Label>
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
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expiryDate">Expiry Date</Label>
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
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
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
                            />
                          </div>
                        </div>
                      </form>
                      <div className="mt-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Lock className="w-4 h-4" />
                        <p>Your payment information is encrypted and secure</p>
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
                      <CardDescription>
                        Review and confirm your order
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                              Ready to Complete!
                            </h3>
                            <p className="text-gray-600">
                              Your order total: {formatCurrency(totalAmount)}
                            </p>
                            {selectedPlan && (
                              <p className="text-purple-600 font-medium mt-2">
                                {selectedPlan.installments} payments of{" "}
                                {formatCurrency(totalAmount / selectedPlan.installments)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Payment Schedule</h4>
                          <div className="space-y-2">
                            {selectedPlan &&
                              Array.from({ length: selectedPlan.installments }).map(
                                (_, index) => {
                                  const date = new Date();
                                  date.setMonth(date.getMonth() + index);
                                  return (
                                    <div
                                      key={index}
                                      className="flex justify-between text-sm"
                                    >
                                      <span>Payment {index + 1}</span>
                                      <span>
                                        {formatCurrency(
                                          totalAmount / selectedPlan.installments
                                        )}{" "}
                                        - {date.toLocaleDateString()}
                                      </span>
                                    </div>
                                  );
                                }
                              )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && !selectedPlan}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {isProcessing ? "Processing..." : "Complete Purchase"}
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Shipping</span>
                      <span>Free</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    {selectedPlan && (
                      <div className="mt-2 text-sm text-purple-600">
                        {selectedPlan.installments}x{" "}
                        {formatCurrency(totalAmount / selectedPlan.installments)}{" "}
                        interest-free
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
