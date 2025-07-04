'use client';

import React from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';
import { Label } from '@/components/ui/label';

const stripeElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      fontSmoothing: 'antialiased',
      fontWeight: '400',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
    complete: {
      color: '#ffffff',
    },
  },
};

interface StripeCardElementsProps {
  onElementChange: (element: string, error: string | null, complete: boolean) => void;
  errors: {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
  };
}

export function StripeCardElements({ onElementChange, errors }: StripeCardElementsProps) {
  return (
    <>
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber" className="text-sm font-medium">
          Card Number
        </Label>
        <div
          className={`relative h-12 w-full rounded-md border border-input bg-background ring-offset-background ${
            errors.cardNumber ? 'border-red-500' : ''
          } focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`}
        >
          <CardNumberElement
            options={{
              ...stripeElementOptions,
              placeholder: '1234 5678 9012 3456',
            }}
            onChange={(event) => {
              onElementChange('cardNumber', event.error?.message || null, event.complete);
            }}
            className="absolute inset-0 w-full h-full p-3 rounded-md bg-transparent"
          />
        </div>
        {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cardExpiry" className="text-sm font-medium">
            Expiry Date
          </Label>
          <div
            className={`relative h-12 w-full rounded-md border border-input bg-background ring-offset-background ${
              errors.cardExpiry ? 'border-red-500' : ''
            } focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`}
          >
            <CardExpiryElement
              options={{
                ...stripeElementOptions,
                placeholder: 'MM/YY',
              }}
              onChange={(event) => {
                onElementChange('cardExpiry', event.error?.message || null, event.complete);
              }}
              className="absolute inset-0 w-full h-full p-3 rounded-md bg-transparent"
            />
          </div>
          {errors.cardExpiry && <p className="text-sm text-red-500">{errors.cardExpiry}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardCvc" className="text-sm font-medium">
            CVC
          </Label>
          <div
            className={`relative h-12 w-full rounded-md border border-input bg-background ring-offset-background ${
              errors.cardCvc ? 'border-red-500' : ''
            } focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`}
          >
            <CardCvcElement
              options={{
                ...stripeElementOptions,
                placeholder: '123',
              }}
              onChange={(event) => {
                onElementChange('cardCvc', event.error?.message || null, event.complete);
              }}
              className="absolute inset-0 w-full h-full p-3 rounded-md bg-transparent"
            />
          </div>
          {errors.cardCvc && <p className="text-sm text-red-500">{errors.cardCvc}</p>}
        </div>
      </div>
    </>
  );
}
