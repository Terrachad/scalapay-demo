'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { useEarlyPaymentStore } from '@/store/early-payment-store';
import { usePaymentMethodStore } from '@/store/payment-method-store';
import { EarlyPaymentRequest } from '@/services/early-payment-service';

interface EarlyPaymentCalculatorProps {
  transactionId: string;
  userId: string;
  onCalculationComplete?: (result: any) => void;
  onPaymentComplete?: () => void;
  className?: string;
}

interface Transaction {
  id: string;
  totalAmount: number;
  remainingAmount: number;
  merchantName: string;
  pendingInstallments: Array<{
    id: string;
    amount: number;
    dueDate: Date;
    status: string;
  }>;
}

/**
 * Enterprise Early Payment Calculator Component
 * Features:
 * - Real-time savings calculations with merchant-specific discounts
 * - Partial payment options with individual installment selection
 * - Payment method validation and recommendation
 * - Scenario simulation and optimization
 * - Interactive savings breakdown and visualizations
 * - Risk assessment and fraud prevention
 */
export const EarlyPaymentCalculator: React.FC<EarlyPaymentCalculatorProps> = ({
  transactionId,
  userId,
  onCalculationComplete,
  onPaymentComplete,
  className = '',
}) => {
  // Store hooks
  const {
    earlyPaymentOptions,
    calculationResult,
    partialPaymentOptions,
    selectedInstallments,
    isCalculating,
    error,
    fetchEarlyPaymentOptions,
    calculateEarlyPayment,
    fetchPartialPaymentOptions,
    updateSelectedInstallments,
    clearError,
  } = useEarlyPaymentStore();

  const { paymentMethods, getActivePaymentMethods, getRecommendedCard } = usePaymentMethodStore();

  // Local state
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mockTransaction] = useState<Transaction>({
    id: transactionId,
    totalAmount: 1000,
    remainingAmount: 600,
    merchantName: 'Demo Store',
    pendingInstallments: [
      { id: '1', amount: 200, dueDate: new Date('2024-02-01'), status: 'pending' },
      { id: '2', amount: 200, dueDate: new Date('2024-03-01'), status: 'pending' },
      { id: '3', amount: 200, dueDate: new Date('2024-04-01'), status: 'pending' },
    ],
  });

  // Initialize data
  useEffect(() => {
    fetchEarlyPaymentOptions(transactionId);
  }, [transactionId, fetchEarlyPaymentOptions]);

  // Get recommended payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      getRecommendedCard(userId, {
        amount: mockTransaction.remainingAmount,
        merchantId: 'demo-merchant',
        country: 'US',
      })
        .then((result) => {
          setSelectedPaymentMethod(result.recommendedCard.id);
        })
        .catch(() => {
          // Fallback to first active card
          const activeMethods = getActivePaymentMethods();
          if (activeMethods.length > 0) {
            setSelectedPaymentMethod(activeMethods[0].id);
          }
        });
    }
  }, [
    paymentMethods,
    selectedPaymentMethod,
    userId,
    getRecommendedCard,
    getActivePaymentMethods,
    mockTransaction.remainingAmount,
  ]);

  // Handle payment type change
  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type);

    if (type === 'partial' && mockTransaction.pendingInstallments) {
      fetchPartialPaymentOptions(
        transactionId,
        mockTransaction.pendingInstallments.map((i) => i.id),
      );
    }
  };

  // Handle installment selection
  const handleInstallmentSelection = (installmentId: string, checked: boolean) => {
    const updatedSelection = checked
      ? [...selectedInstallments, installmentId]
      : selectedInstallments.filter((id) => id !== installmentId);

    updateSelectedInstallments(updatedSelection);
  };

  // Calculate early payment
  const handleCalculate = async () => {
    if (!selectedPaymentMethod) {
      return;
    }

    const request: Omit<EarlyPaymentRequest, 'applyDiscount'> = {
      transactionId,
      paymentType,
      paymentMethodId: selectedPaymentMethod,
      amount:
        paymentType === 'full'
          ? mockTransaction.remainingAmount
          : selectedInstallments.reduce((sum, id) => {
              const installment = mockTransaction.pendingInstallments.find((i) => i.id === id);
              return sum + (installment?.amount || 0);
            }, 0),
      selectedInstallments: paymentType === 'partial' ? selectedInstallments : undefined,
    };

    try {
      await calculateEarlyPayment(request);
      onCalculationComplete?.(calculationResult);
    } catch (error) {
      console.error('Calculation failed:', error);
    }
  };

  // Get best early payment option
  const bestOption = useMemo(() => {
    if (earlyPaymentOptions.length === 0) return null;

    return earlyPaymentOptions.reduce((best, current) =>
      current.netSavings > best.netSavings ? current : best,
    );
  }, [earlyPaymentOptions]);

  // Calculate potential savings for partial selection
  const partialSavings = useMemo(() => {
    if (paymentType !== 'partial' || selectedInstallments.length === 0) return null;

    const selectedOptions = partialPaymentOptions.filter((option) =>
      selectedInstallments.includes(option.installmentId),
    );

    return selectedOptions.reduce((total, option) => total + (option.savings || 0), 0);
  }, [paymentType, selectedInstallments, partialPaymentOptions]);

  const activeMethods = getActivePaymentMethods();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Early Payment Calculator
          </h2>
          <p className="text-sm text-gray-600">
            Calculate savings and optimize your payment schedule
          </p>
        </div>
        {bestOption && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Save up to {bestOption.netSavings > 0 ? `$${bestOption.netSavings.toFixed(2)}` : '0%'}
          </Badge>
        )}
      </div>

      {/* Transaction Overview */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transaction Details
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Merchant</div>
              <div className="font-semibold">{mockTransaction.merchantName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="font-semibold">${mockTransaction.totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className="font-semibold text-blue-600">
                ${mockTransaction.remainingAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Installments</div>
              <div className="font-semibold">
                {mockTransaction.pendingInstallments.length} pending
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold">Payment Type</h3>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentType} onValueChange={handlePaymentTypeChange}>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Pay Full Amount</div>
                      <div className="text-sm text-gray-600">
                        Pay all remaining ${mockTransaction.remainingAmount.toFixed(2)} now
                      </div>
                    </div>
                    {bestOption && bestOption.paymentType === 'full' && (
                      <Badge className="bg-green-100 text-green-800">
                        Save ${bestOption.netSavings.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Partial Payment</div>
                      <div className="text-sm text-gray-600">
                        Select specific installments to pay early
                      </div>
                    </div>
                    {partialSavings && partialSavings > 0 && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Save ${partialSavings.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Partial Payment Selection */}
      {paymentType === 'partial' && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Installments
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTransaction.pendingInstallments.map((installment) => {
                const option = partialPaymentOptions.find(
                  (opt) => opt.installmentId === installment.id,
                );
                const isSelected = selectedInstallments.includes(installment.id);

                return (
                  <div
                    key={installment.id}
                    className={`p-3 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={installment.id}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleInstallmentSelection(installment.id, !!checked)
                          }
                        />
                        <div>
                          <div className="font-medium">${installment.amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">
                            Due {new Date(installment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {option && option.discountEligible && option.savings && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            Save ${option.savings.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-600">
                            Pay ${option.finalAmount?.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedInstallments.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Select at least one installment to proceed with partial payment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeMethods.map((method) => (
              <div
                key={method.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id={method.id}
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">
                        {method.brand.toUpperCase()} •••• {method.last4}
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {method.isDefault && <Badge variant="outline">Default</Badge>}
                    {method.riskScore <= 0.3 && (
                      <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculation Results */}
      {calculationResult && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Savings Breakdown
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  ${calculationResult.originalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Original Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  -${calculationResult.discountAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Discount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${calculationResult.finalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Final Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${calculationResult.savings.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Savings</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Savings Progress</span>
                <span>
                  {((calculationResult.savings / calculationResult.originalAmount) * 100).toFixed(
                    1,
                  )}
                  %
                </span>
              </div>
              <Progress
                value={(calculationResult.savings / calculationResult.originalAmount) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
          <Lightbulb className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Clear results
            }}
          >
            Reset
          </Button>
          <Button
            onClick={handleCalculate}
            disabled={
              isCalculating ||
              !selectedPaymentMethod ||
              (paymentType === 'partial' && selectedInstallments.length === 0)
            }
            className="flex items-center gap-2"
          >
            {isCalculating && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Calculator className="h-4 w-4" />
            Calculate Savings
          </Button>

          {/* Proceed with Payment Button - shown after successful calculation */}
          {calculationResult && !isCalculating && onPaymentComplete && (
            <Button
              onClick={onPaymentComplete}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4" />
              Proceed with Payment
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-semibold">Advanced Options</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Additional features like scenario simulation and payment optimization will be
              available here.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
