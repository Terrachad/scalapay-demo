'use client';

import React, { useState, useEffect } from 'react';
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';

interface StripePaymentFormProps {
  totalAmount: number;
  cardAmount: number;
  creditAmount: number;
  userEmail: string;
  userName: string;
  postalCode: string;
  onSuccess: (transaction?: any) => void;
}

export function StripePaymentForm({ 
  totalAmount,
  cardAmount,
  creditAmount,
  userEmail,
  userName,
  postalCode,
  onSuccess
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const isReady = stripe && elements && paymentElementReady;

  useEffect(() => {
    if (!stripe || !elements) return;

    const paymentElement = elements.getElement('payment');
    
    if (paymentElement) {
      paymentElement.on('ready', () => {
        setPaymentElementReady(true);
      });
      
      paymentElement.on('change', (event) => {
        if (event.error) {
          setErrorMessage(event.error.message || 'Payment element error');
        } else {
          setErrorMessage('');
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
      // Confirm payment with minimal billing details
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: {
              email: userEmail,
              name: userName,
              address: {
                postal_code: postalCode,
                // Only collect postal code as requested
              },
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
        setErrorMessage('Additional authentication required. Please complete the verification.');
      } else {
        throw new Error('Payment was not completed successfully');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      
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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border">
        <div className="space-y-3">
          {creditAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700 dark:text-green-300">Credit Applied:</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                -{formatCurrency(creditAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-700 dark:text-purple-300">Card Payment:</span>
            <span className="font-bold text-lg text-purple-700 dark:text-purple-300">
              {formatCurrency(cardAmount)}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Transaction:</span>
              <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
          <div className="p-4 border rounded-lg">
            <PaymentElement
              options={{
                layout: {
                  type: 'accordion',
                  defaultCollapsed: false,
                  radios: false,
                  spacedAccordionItems: false,
                },
                defaultValues: {
                  billingDetails: {
                    email: userEmail,
                    name: userName,
                    address: {
                      postal_code: postalCode,
                    },
                  },
                },
                business: {
                  name: 'ScalaPay Demo',
                },
                fields: {
                  billingDetails: {
                    email: 'never', // Use account email
                    name: 'never', // Use account name
                    address: {
                      line1: 'never',
                      line2: 'never',
                      city: 'never',
                      state: 'never',
                      country: 'never',
                      postalCode: 'never', // Already collected
                    },
                  },
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
          </div>
        </div>

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
          By continuing, you agree to our Terms of Service and Privacy Policy.
          You will be charged {formatCurrency(cardAmount)} today for your first installment.
        </p>
      </form>
    </div>
  );
}