'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { StripeCheckoutForm } from '@/components/checkout/stripe-checkout-form';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cart-store';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PendingTransaction {
  transactionId: string;
  clientSecret: string;
  paymentBreakdown: {
    creditAmount: number;
    cardAmount: number;
    totalAmount: number;
  };
  firstInstallmentCardAmount: number;
  installmentInfo?: {
    total: number;
    current: number;
    frequency: string;
  };
}

export default function EnterpriseStripePaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clearCart } = useCartStore();

  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      // Get transaction details from session storage
      const storedTransaction = sessionStorage.getItem('pendingTransaction');
      if (!storedTransaction) {
        setError('No pending transaction found. Please start checkout again.');
        setIsLoading(false);
        return;
      }

      const transaction = JSON.parse(storedTransaction) as PendingTransaction;

      // Validate transaction data
      if (!transaction.clientSecret || !transaction.transactionId) {
        setError('Invalid transaction data. Please start checkout again.');
        setIsLoading(false);
        return;
      }

      setPendingTransaction(transaction);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading pending transaction:', error);
      setError('Failed to load transaction details. Please try again.');
      setIsLoading(false);
    }
  }, []);

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      console.log('Payment succeeded:', paymentIntent);

      // Clear pending transaction from session storage
      sessionStorage.removeItem('pendingTransaction');

      // Clear the cart since payment was successful
      clearCart();

      toast({
        title: 'Payment Successful!',
        description: 'Your first installment has been processed successfully.',
      });

      // Redirect to success page with transaction details
      router.push(
        `/checkout/success?transaction=${pendingTransaction?.transactionId}&payment=${paymentIntent.id}`,
      );
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: 'Payment Processed',
        description:
          'Your payment was successful, but there was an issue updating your account. Please contact support if needed.',
        variant: 'default',
      });
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
    setError(errorMessage);
  };

  const handleReturnToCheckout = () => {
    router.push('/checkout');
  };

  // Show loading state
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h2 className="text-xl font-semibold">Loading Payment</h2>
              <p className="text-gray-600">Please wait while we prepare your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || !pendingTransaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
                Payment Error
              </h2>
              <p className="text-gray-600">{error || 'Unable to load payment details'}</p>
              <Button onClick={handleReturnToCheckout} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configure Stripe Elements options for enterprise use
  const stripeElementsOptions = {
    clientSecret: pendingTransaction.clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#7c3aed', // Purple brand color
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
      },
      rules: {
        '.Input': {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #d1d5db',
        },
        '.Input:focus': {
          boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.2)',
          borderColor: '#7c3aed',
        },
        '.Error': {
          color: '#ef4444',
        },
      },
    },
    locale: 'en' as const,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/checkout">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Checkout
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">Secure Payment</h1>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Step 2 of 2</div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2">
              <Elements stripe={stripePromise} options={stripeElementsOptions}>
                <StripeCheckoutForm
                  clientSecret={pendingTransaction.clientSecret}
                  amount={pendingTransaction.paymentBreakdown.totalAmount}
                  creditAmount={pendingTransaction.paymentBreakdown.creditAmount}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Transaction Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      First Installment
                    </CardTitle>
                    <CardDescription>
                      You're paying the first installment of your BNPL plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Purchase:</span>
                        <span className="font-semibold">
                          {formatCurrency(pendingTransaction.paymentBreakdown.totalAmount)}
                        </span>
                      </div>

                      {pendingTransaction.paymentBreakdown.creditAmount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Credit Applied:</span>
                          <span className="font-semibold text-green-600">
                            -{formatCurrency(pendingTransaction.paymentBreakdown.creditAmount)}
                          </span>
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Card Payment Today:</span>
                          <span className="font-bold text-lg text-purple-600">
                            {formatCurrency(pendingTransaction.firstInstallmentCardAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Installment Info */}
                    {pendingTransaction.installmentInfo && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                          Payment Schedule
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Installments:</span>
                            <span className="font-medium">
                              {pendingTransaction.installmentInfo.total}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment Frequency:</span>
                            <span className="font-medium capitalize">
                              {pendingTransaction.installmentInfo.frequency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remaining Payments:</span>
                            <span className="font-medium">
                              {pendingTransaction.installmentInfo.total - 1} automatic payments
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Security Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security & Protection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>SSL encrypted payment processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>PCI DSS compliant infrastructure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>3D Secure authentication</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Fraud detection & prevention</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Buyer protection guarantee</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Support Info */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Having trouble? Contact our support team at{' '}
                    <a
                      href="mailto:support@scalapay.com"
                      className="font-medium text-purple-600 hover:underline"
                    >
                      support@scalapay.com
                    </a>{' '}
                    or call{' '}
                    <a
                      href="tel:+1-555-0123"
                      className="font-medium text-purple-600 hover:underline"
                    >
                      +1-555-0123
                    </a>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
