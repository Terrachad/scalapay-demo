'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, CreditCard, Lock, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { PaymentMethodList } from '@/components/payments/payment-method-list';
import { AddPaymentMethodModal } from '@/components/payments/add-payment-method-modal';
import { Badge } from '@/components/ui/badge';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Card Element options
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false, // Show postal code field
};

function PaymentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  useEffect(() => {
    // Get transaction details from session storage
    const storedTransaction = sessionStorage.getItem('pendingTransaction');
    if (storedTransaction) {
      setPendingTransaction(JSON.parse(storedTransaction));
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !pendingTransaction) {
      toast({
        title: 'Error',
        description: 'Stripe has not loaded yet or no pending transaction.',
        variant: 'destructive',
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({
        title: 'Error',
        description: 'Card element not found.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Processing payment...');
      console.log('Client Secret:', pendingTransaction.clientSecret);
      console.log('Selected Payment Method:', selectedPaymentMethod);
      console.log('Use New Card:', useNewCard);
      console.log('Save Card:', saveCard);

      let paymentResult;

      if (selectedPaymentMethod && !useNewCard) {
        // Using saved payment method
        console.log('Using saved payment method:', selectedPaymentMethod);
        paymentResult = await stripe.confirmCardPayment(pendingTransaction.clientSecret, {
          payment_method: selectedPaymentMethod,
        });
      } else {
        // Using new card
        console.log('Using new card...');

        if (saveCard && user) {
          // Create payment method and save it for future use
          const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
            pendingTransaction.setupIntentClientSecret, // This would need to be provided by backend
            {
              payment_method: {
                card: cardElement,
                billing_details: {
                  name: user.name || 'Customer',
                  email: user.email,
                },
              },
            },
          );

          if (setupError) {
            throw new Error(setupError.message);
          }

          // Now use the saved payment method for the payment
          paymentResult = await stripe.confirmCardPayment(pendingTransaction.clientSecret, {
            payment_method: (setupIntent.payment_method as any)?.id || setupIntent.payment_method,
          });
        } else {
          // Standard one-time payment
          paymentResult = await stripe.confirmCardPayment(pendingTransaction.clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: user?.name || 'Customer',
                email: user?.email,
              },
            },
          });
        }
      }

      const { error, paymentIntent } = paymentResult;

      if (error) {
        console.error('Payment failed:', error);
        toast({
          title: 'Payment Failed',
          description: error.message || 'An error occurred while processing your payment.',
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded!', paymentIntent);

        // Clear pending transaction
        sessionStorage.removeItem('pendingTransaction');

        // Clear the cart now that payment is successful
        clearCart();

        toast({
          title: 'Payment Successful!',
          description: 'Your payment has been processed successfully.',
        });

        // Redirect to success page
        router.push(`/checkout/success?transaction=${pendingTransaction.transactionId}`);
      } else {
        console.log('Payment status:', paymentIntent?.status);
        toast({
          title: 'Payment Processing',
          description: 'Your payment is being processed.',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pendingTransaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">No Payment Required</h2>
              <p className="text-gray-600 mb-4">No pending transaction found.</p>
              <Link href="/checkout">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Checkout
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/checkout"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Checkout
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Complete Your Payment
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Secure payment processing with Stripe Elements
            </p>
          </div>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>First installment payment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      First Installment (Card):
                    </span>
                    <span className="font-bold text-lg text-purple-600">
                      {formatCurrency(pendingTransaction.firstInstallmentCardAmount)}
                    </span>
                  </div>
                  {pendingTransaction.paymentBreakdown && (
                    <>
                      {pendingTransaction.paymentBreakdown.creditAmount > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            Credit Used:
                          </span>
                          <span className="text-sm text-green-600">
                            {formatCurrency(pendingTransaction.paymentBreakdown.creditAmount)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total Transaction:</span>
                          <span className="font-bold">
                            {formatCurrency(pendingTransaction.paymentBreakdown.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>✓ Remaining installments will be automatically scheduled</p>
                  <p>✓ No interest or hidden fees</p>
                  <p>✓ Cancel anytime before next payment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
              <CardDescription>Enter your card information securely</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Payment Method Selection */}
              {user && (
                <div className="space-y-6 mb-6">
                  <div className="border-b pb-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Choose Payment Method
                    </h3>

                    {/* Existing Payment Methods */}
                    <div className="space-y-3 mb-4">
                      <PaymentMethodList
                        userId={user.id}
                        showAnalytics={false}
                        showSecurityOverview={false}
                        allowReordering={false}
                      />
                    </div>

                    {/* Add New Payment Method Option */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => {
                        setUseNewCard(true);
                        setSelectedPaymentMethod(null);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Use New Card
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Stripe Card Element - Only show if using new card or no saved methods */}
                {(!user || useNewCard || !selectedPaymentMethod) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Card Information
                    </label>
                    <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                      <CardElement options={cardElementOptions} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Your card information is encrypted and secure.
                    </p>

                    {/* Save Card Option */}
                    {user && (
                      <div className="flex items-center space-x-2 mt-3">
                        <input
                          type="checkbox"
                          id="saveCard"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor="saveCard"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Save this card for future purchases
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Payment Method Display */}
                {user && selectedPaymentMethod && (
                  <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Using saved payment method
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        Selected
                      </Badge>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!stripe || isProcessing}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {isProcessing
                    ? 'Processing Payment...'
                    : `Pay ${formatCurrency(pendingTransaction.firstInstallmentCardAmount)}`}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span>Secured by Stripe • SSL Encrypted • PCI Compliant</span>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  By continuing, you agree to our Terms of Service and Privacy Policy. You will be
                  charged {formatCurrency(pendingTransaction.firstInstallmentCardAmount)} today.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Add Payment Method Modal */}
          {user && (
            <AddPaymentMethodModal
              isOpen={showAddPaymentModal}
              onClose={() => setShowAddPaymentModal(false)}
              userId={user.id}
              currentCount={0}
              maxCards={10}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function StripePaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}
