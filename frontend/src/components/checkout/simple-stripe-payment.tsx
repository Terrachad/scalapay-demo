'use client';

import React, { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';

interface SimpleStripePaymentProps {
  clientSecret: string;
  cardData: {
    cardNumber: string;
    cardName: string;
    expiryDate: string;
    cvv: string;
  };
  postalCode: string;
  userEmail: string;
  userName: string;
  cardAmount: number;
  creditAmount: number;
  totalAmount: number;
  onSuccess: (transaction?: any) => void;
}

export function SimpleStripePayment({ 
  clientSecret,
  cardData,
  postalCode,
  userEmail,
  userName,
  cardAmount,
  creditAmount,
  totalAmount,
  onSuccess
}: SimpleStripePaymentProps) {
  const stripe = useStripe();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePayment = async () => {
    if (!stripe) {
      setErrorMessage('Stripe is not loaded yet. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Parse expiry date
      const [month, year] = cardData.expiryDate.split('/');
      const expYear = parseInt(`20${year}`);
      const expMonth = parseInt(month);

      // Create payment method with card data
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardData.cardNumber.replace(/\s/g, ''),
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cardData.cvv,
        },
        billing_details: {
          name: cardData.cardName,
          email: userEmail,
          address: {
            postal_code: postalCode,
          },
        },
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message || 'Failed to create payment method');
      }

      // Confirm payment with the created payment method
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
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

      {/* Card Details Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Payment Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Card:</span>
            <span>**** **** **** {cardData.cardNumber.slice(-4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Name:</span>
            <span>{cardData.cardName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Expiry:</span>
            <span>{cardData.expiryDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Billing ZIP:</span>
            <span>{postalCode}</span>
          </div>
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
        onClick={handlePayment}
        disabled={!stripe || isProcessing}
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
    </div>
  );
}