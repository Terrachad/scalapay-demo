'use client';

import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  AddressElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';

interface StripeCheckoutFormProps {
  clientSecret: string;
  amount: number;
  creditAmount?: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export function StripeCheckoutForm({
  amount,
  creditAmount = 0,
  onSuccess,
  onError,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [addressElementReady, setAddressElementReady] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const cardAmount = amount - creditAmount;
  const isReady = stripe && elements && paymentElementReady && addressElementReady;

  useEffect(() => {
    if (!stripe || !elements) return;

    // Set up event listeners for element readiness
    const paymentElement = elements.getElement('payment');
    const addressElement = elements.getElement('address');

    if (paymentElement) {
      paymentElement.on('ready', () => setPaymentElementReady(true));
      paymentElement.on('change', (event) => {
        if (event.error) {
          setErrorMessage(event.error.message || 'Payment element error');
        } else {
          setErrorMessage('');
        }
      });
    }

    if (addressElement) {
      addressElement.on('ready', () => setAddressElementReady(true));
      addressElement.on('change', (event) => {
        if (event.error) {
          setErrorMessage(event.error.message || 'Address element error');
        }
      });
    }
  }, [stripe, elements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isReady) {
      setErrorMessage('Payment form is not ready yet. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Get the address from the AddressElement
      const addressElement = elements.getElement('address');
      const { error: addressError, value: addressValue } = (await addressElement?.getValue()) || {};

      if (addressError) {
        throw new Error(addressError.message || 'Invalid address information');
      }

      // Validate required address fields
      if (!addressValue?.address || !addressValue.address.postal_code) {
        throw new Error('Please provide a complete billing address including ZIP/postal code');
      }

      // Confirm payment with collected information
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: {
              email: email || undefined,
              address: {
                line1: addressValue.address.line1,
                line2: addressValue.address.line2,
                city: addressValue.address.city,
                state: addressValue.address.state,
                postal_code: addressValue.address.postal_code,
                country: addressValue.address.country,
              },
              name: addressValue.name,
              phone: addressValue.phone,
            },
          },
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      });

      if (paymentError) {
        if (paymentError.type === 'card_error' || paymentError.type === 'validation_error') {
          throw new Error(paymentError.message || 'Your payment was declined');
        } else {
          throw new Error('An unexpected error occurred. Please try again.');
        }
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: 'Payment Successful!',
          description: `Your payment of ${formatCurrency(cardAmount)} has been processed.`,
        });
        onSuccess(paymentIntent);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // This shouldn't happen with redirect: 'if_required', but handle just in case
        setErrorMessage('Additional authentication required. Please complete the verification.');
      } else {
        throw new Error('Payment was not completed successfully');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError(errorMsg);

      toast({
        title: 'Payment Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {creditAmount > 0 && (
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-green-700 dark:text-green-300">Credit Applied:</span>
                <span className="font-semibold text-green-700 dark:text-green-300">
                  -{formatCurrency(creditAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-purple-700 dark:text-purple-300">Card Payment:</span>
              <span className="font-bold text-lg text-purple-700 dark:text-purple-300">
                {formatCurrency(cardAmount)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Transaction:</span>
                <span className="font-bold text-lg">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
            <CardDescription>
              We&apos;ll use this email for order confirmations and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkAuthenticationElement
              onChange={(event) => {
                if (event.value?.email) {
                  setEmail(event.value.email);
                }
              }}
              options={{
                defaultValues: {
                  email: email,
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Address</CardTitle>
            <CardDescription>
              Enter your complete billing address for payment verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressElement
              options={{
                mode: 'billing',
                allowedCountries: ['US', 'CA', 'GB', 'AU'], // Adjust based on your business
                blockPoBox: true, // Prevent P.O. Box addresses if needed
                fields: {
                  phone: 'always', // Always collect phone for better fraud protection
                },
                validation: {
                  phone: {
                    required: 'never', // Make phone optional but available
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
            <CardDescription>Your payment information is encrypted and secure</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentElement
              options={{
                layout: 'accordion',
                defaultValues: {
                  billingDetails: {
                    email: email,
                  },
                },
                business: {
                  name: 'ScalaPay Demo', // Your business name
                },
                fields: {
                  billingDetails: {
                    email: email ? 'never' : 'auto', // Don't duplicate email collection
                    address: 'never', // We're using AddressElement instead
                  },
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Secure Payment Processing</span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <p>✓ 256-bit SSL encryption</p>
            <p>✓ PCI DSS compliant</p>
            <p>✓ 3D Secure authentication</p>
            <p>✓ Real-time fraud detection</p>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isReady || isProcessing}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Pay {formatCurrency(cardAmount)}</span>
            </div>
          )}
        </Button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy. You will be charged{' '}
          {formatCurrency(cardAmount)} today for your first installment.
        </p>
      </form>
    </div>
  );
}
