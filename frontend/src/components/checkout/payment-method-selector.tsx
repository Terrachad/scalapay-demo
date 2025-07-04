'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Wallet, Layers, Check } from 'lucide-react';

export interface PaymentMethod {
  id: 'credit' | 'card' | 'hybrid';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

export interface PaymentMethodSelection {
  method: PaymentMethod;
  creditAmount: number;
  cardAmount: number;
}

interface PaymentMethodSelectorProps {
  totalAmount: number;
  availableCredit: number;
  onSelect: (selection: PaymentMethodSelection) => void;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'credit',
    name: 'Credit Only',
    description: 'Use your available credit balance',
    icon: Wallet,
  },
  {
    id: 'card',
    name: 'Card Only',
    description: 'Pay with your credit/debit card',
    icon: CreditCard,
  },
  {
    id: 'hybrid',
    name: 'Credit + Card',
    description: 'Use credit first, then card for remainder',
    icon: Layers,
  },
];

export function PaymentMethodSelector({
  totalAmount,
  availableCredit,
  onSelect,
}: PaymentMethodSelectorProps) {
  // Determine default method
  const getDefaultMethod = () => {
    if (availableCredit >= totalAmount) {
      return { method: 'credit', credit: totalAmount, card: 0 };
    } else if (availableCredit > 0) {
      return { method: 'hybrid', credit: availableCredit, card: totalAmount - availableCredit };
    } else {
      return { method: 'card', credit: 0, card: totalAmount };
    }
  };

  const defaultSelection = getDefaultMethod();
  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultSelection.method);
  const [creditAmount, setCreditAmount] = useState(defaultSelection.credit);
  const [cardAmount, setCardAmount] = useState(defaultSelection.card);

  // Notify parent of initial selection
  useEffect(() => {
    const method = paymentMethods.find((m) => m.id === defaultSelection.method)!;
    const selection = {
      method,
      creditAmount: defaultSelection.credit,
      cardAmount: defaultSelection.card,
    };
    console.log('PaymentMethodSelector: Initial selection:', selection);
    onSelect(selection);
  }, []); // Only run once on mount

  const handleMethodChange = (methodId: string) => {
    setSelectedMethodId(methodId);
    const method = paymentMethods.find((m) => m.id === methodId)!;

    let newCreditAmount: number;
    let newCardAmount: number;

    switch (methodId) {
      case 'credit':
        newCreditAmount = Math.min(availableCredit, totalAmount);
        newCardAmount = Math.max(0, totalAmount - newCreditAmount);
        break;
      case 'card':
        newCreditAmount = 0;
        newCardAmount = totalAmount;
        break;
      case 'hybrid':
        newCreditAmount = Math.min(availableCredit, totalAmount);
        newCardAmount = Math.max(0, totalAmount - newCreditAmount);
        break;
      default:
        newCreditAmount = 0;
        newCardAmount = totalAmount;
    }

    setCreditAmount(newCreditAmount);
    setCardAmount(newCardAmount);

    onSelect({
      method,
      creditAmount: newCreditAmount,
      cardAmount: newCardAmount,
    });
  };

  const handleCreditAmountChange = (value: string) => {
    const amount = Math.min(parseFloat(value) || 0, availableCredit, totalAmount);
    const newCardAmount = totalAmount - amount;

    setCreditAmount(amount);
    setCardAmount(newCardAmount);

    const method = paymentMethods.find((m) => m.id === selectedMethodId)!;
    onSelect({
      method,
      creditAmount: amount,
      cardAmount: newCardAmount,
    });
  };

  return (
    <div className="space-y-6">
      <RadioGroup value={selectedMethodId} onValueChange={handleMethodChange}>
        <div className="grid gap-4">
          {paymentMethods.map((method, index) => {
            const disabled = method.id === 'credit' && availableCredit === 0;

            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Label
                  htmlFor={method.id}
                  className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Card
                    className={`transition-all ${
                      selectedMethodId === method.id
                        ? 'border-purple-600 shadow-lg'
                        : 'hover:shadow-md'
                    } ${disabled ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <RadioGroupItem value={method.id} id={method.id} disabled={disabled} />
                        <method.icon className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {method.description}
                          </p>
                          {method.id === 'credit' && (
                            <p className="text-sm text-purple-600 mt-1">
                              Available: {formatCurrency(availableCredit)}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedMethodId === method.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-purple-600 text-white rounded-full p-1"
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </Label>
              </motion.div>
            );
          })}
        </div>
      </RadioGroup>

      {/* Payment breakdown */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
            Payment Breakdown
          </h4>
          <div className="space-y-2">
            {creditAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  Credit Payment:
                </span>
                <span className="font-semibold text-purple-900 dark:text-purple-100">
                  {formatCurrency(creditAmount)}
                </span>
              </div>
            )}
            {cardAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700 dark:text-purple-300">Card Payment:</span>
                <span className="font-semibold text-purple-900 dark:text-purple-100">
                  {formatCurrency(cardAmount)}
                </span>
              </div>
            )}
            <div className="border-t border-purple-200 dark:border-purple-700 pt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900 dark:text-purple-100">Total:</span>
                <span className="font-bold text-lg text-purple-900 dark:text-purple-100">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Custom credit amount input for hybrid */}
          {selectedMethodId === 'hybrid' && availableCredit > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
              <Label
                htmlFor="credit-amount"
                className="text-sm font-medium text-purple-900 dark:text-purple-100"
              >
                Credit Amount (max {formatCurrency(Math.min(availableCredit, totalAmount))})
              </Label>
              <Input
                id="credit-amount"
                type="number"
                min="0"
                max={Math.min(availableCredit, totalAmount)}
                step="0.01"
                value={creditAmount}
                onChange={(e) => handleCreditAmountChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
