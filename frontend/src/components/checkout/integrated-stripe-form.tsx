'use client';

import React, { useState } from 'react';
import { useStripe, useElements, CardNumberElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, AlertCircle } from 'lucide-react';
import { StripeCardElements } from './stripe-card-elements';

interface IntegratedStripeFormProps {
  clientSecret: string;
  cardholderName: string;
  postalCode: string;
  userEmail: string;
  cardAmount: number;
  creditAmount: number;
  totalAmount: number;
  onSuccess: (transaction?: any) => void;
  onElementChange: (element: string, error: string | null, complete: boolean) => void;
  stripeErrors: {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
  };
  allElementsReady: boolean;
}

export function IntegratedStripeForm({ 
  clientSecret,
  cardholderName,
  postalCode,
  userEmail,
  cardAmount,
  creditAmount,
  totalAmount,
  onSuccess,
  onElementChange,
  stripeErrors,
  allElementsReady
}: IntegratedStripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePayment = async () => {
    if (!stripe || !elements || !allElementsReady) {
      setErrorMessage('Payment form is not ready yet. Please complete all fields.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Get the card element
      const cardNumberElement = elements.getElement(CardNumberElement);
      
      if (!cardNumberElement) {
        throw new Error('Card element not found. Please refresh the page and try again.');
      }

      // Confirm payment using Stripe Elements
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardholderName,
            email: userEmail,
            address: {
              postal_code: postalCode,
            },
          },
        },
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
      {/* Stripe Card Elements */}
      <StripeCardElements 
        onElementChange={onElementChange}
        errors={stripeErrors}
      />

      {/* Payment Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border">
        <div className="space-y-2">
          {creditAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Credit Applied:</span>
              <span className="font-semibold text-green-600">
                -{formatCurrency(creditAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">Card Payment:</span>
            <span className="font-bold text-lg text-purple-600">
              {formatCurrency(cardAmount)}
            </span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
            </div>
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

      {/* Submit Button */}
      <Button
        onClick={handlePayment}
        disabled={!stripe || !elements || !allElementsReady || isProcessing}
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
    </div>
  );
}