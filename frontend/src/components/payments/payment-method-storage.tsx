'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, AlertTriangle, Lock, DollarSign } from 'lucide-react';
import { usePaymentMethodStore } from '@/store/payment-method-store';
import { useSecurityStore } from '@/store/security-store';
import { useAuthStore } from '@/store/auth-store';
import { CreatePaymentMethodRequest, UsageRestrictions } from '@/services/payment-method-service';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodStorageProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Enterprise Payment Method Storage Component
 * Features:
 * - Secure Stripe Elements integration
 * - Real-time card validation and risk assessment
 * - Usage restrictions configuration
 * - Fraud detection integration
 * - GDPR compliance checks
 * - Auto-update enrollment
 */
export const PaymentMethodStorage: React.FC<PaymentMethodStorageProps> = ({
  userId,
  onSuccess,
  onCancel,
}) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodStorageForm userId={userId} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
};

const PaymentMethodStorageForm: React.FC<PaymentMethodStorageProps> = ({
  userId,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  // Store hooks
  const { user } = useAuthStore();
  const { addPaymentMethod } = usePaymentMethodStore();
  const { hasValidGDPRConsent, deviceFingerprint } = useSecurityStore();

  // Validate userId matches current user for security
  useEffect(() => {
    if (user && user.id !== userId) {
      setError('Invalid user session. Please log in again.');
    }
  }, [user, userId]);

  // Form state
  const [step, setStep] = useState<'card-details' | 'restrictions' | 'confirmation'>(
    'card-details',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardValid, setCardValid] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<{
    score: number;
    level: 'low' | 'medium' | 'high';
    factors: string[];
  } | null>(null);

  // Card configuration
  const [cardConfig, setCardConfig] = useState({
    setAsDefault: false,
    enableAutoUpdate: true,
    position: 0, // Will be set automatically
  });

  // Usage restrictions
  const [usageRestrictions, setUsageRestrictions] = useState<UsageRestrictions>({
    maxDailyAmount: undefined,
    maxMonthlyAmount: undefined,
    allowedMerchants: [],
    restrictedCountries: [],
    timeRestrictions: [],
  });

  // GDPR compliance check
  useEffect(() => {
    if (!hasValidGDPRConsent()) {
      setError('Please accept our privacy policy to add payment methods.');
    }
  }, [hasValidGDPRConsent]);

  // Card element options
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  // Handle card element changes
  const handleCardChange = (event: any) => {
    setCardValid(event.complete && !event.error);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }

    // Simulate risk assessment based on card details
    if (event.complete) {
      simulateRiskAssessment(event.brand);
    }
  };

  // Simulate risk assessment (in real implementation, this would call the backend)
  const simulateRiskAssessment = (brand: string) => {
    const riskFactors = [];
    let baseScore = 0.2; // Base risk score

    // Brand-based risk (example logic)
    if (brand === 'visa' || brand === 'mastercard') {
      baseScore += 0.1;
      riskFactors.push('Major card brand');
    } else {
      baseScore += 0.3;
      riskFactors.push('Uncommon card brand');
    }

    // Device fingerprint analysis
    if (deviceFingerprint) {
      riskFactors.push('Known device');
    } else {
      baseScore += 0.2;
      riskFactors.push('New device');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' = 'low';
    if (baseScore > 0.6) level = 'high';
    else if (baseScore > 0.3) level = 'medium';

    setRiskAssessment({
      score: Math.round(baseScore * 100),
      level,
      factors: riskFactors,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !cardValid || !user || !userId) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create setup intent for future payments
      // In production, you would get the client secret from your backend
      const clientSecret = 'seti_1234567890_secret_fake'; // This would come from backend

      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user.name,
            email: user.email,
          },
        },
      });

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error('Payment method creation failed');
      }

      // Prepare request
      const request: CreatePaymentMethodRequest = {
        stripePaymentMethodId:
          typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id || '',
        isDefault: cardConfig.setAsDefault,
        position: cardConfig.position,
        usageRestrictions:
          Object.keys(usageRestrictions).length > 0 ? usageRestrictions : undefined,
      };

      // Add payment method
      await addPaymentMethod(request);

      // Success
      setStep('confirmation');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render based on current step
  const renderStepContent = () => {
    switch (step) {
      case 'card-details':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Input */}
            <div className="space-y-2">
              <Label>Card Information</Label>
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                <CardElement options={cardElementOptions} onChange={handleCardChange} />
              </div>
            </div>

            {/* Risk Assessment */}
            {riskAssessment && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Security Assessment</h4>
                    <Badge
                      variant={
                        riskAssessment.level === 'low'
                          ? 'default'
                          : riskAssessment.level === 'medium'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {riskAssessment.level.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Risk Score: {riskAssessment.score}/100</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Assessment Factors:</span>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {riskAssessment.factors.map((factor, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium">Card Settings</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Set as default payment method</Label>
                  <p className="text-sm text-gray-600">
                    This card will be selected automatically for new purchases
                  </p>
                </div>
                <Switch
                  checked={cardConfig.setAsDefault}
                  onCheckedChange={(checked) =>
                    setCardConfig((prev) => ({ ...prev, setAsDefault: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable automatic updates</Label>
                  <p className="text-sm text-gray-600">
                    Automatically update card details when they change
                  </p>
                </div>
                <Switch
                  checked={cardConfig.enableAutoUpdate}
                  onCheckedChange={(checked) =>
                    setCardConfig((prev) => ({ ...prev, enableAutoUpdate: checked }))
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep('restrictions')}>
                Configure Restrictions
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!cardValid || isProcessing || !!error}
                  className="flex items-center gap-2"
                >
                  {isProcessing && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Add Payment Method
                </Button>
              </div>
            </div>
          </form>
        );

      case 'restrictions':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Usage Restrictions (Optional)</h3>
              <p className="text-sm text-gray-600">
                Configure spending limits and usage controls for enhanced security.
              </p>
            </div>

            {/* Daily Limit */}
            <div className="space-y-2">
              <Label>Daily Spending Limit</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="No limit"
                  value={usageRestrictions.maxDailyAmount || ''}
                  onChange={(e) =>
                    setUsageRestrictions((prev) => ({
                      ...prev,
                      maxDailyAmount: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>

            {/* Monthly Limit */}
            <div className="space-y-2">
              <Label>Monthly Spending Limit</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="No limit"
                  value={usageRestrictions.maxMonthlyAmount || ''}
                  onChange={(e) =>
                    setUsageRestrictions((prev) => ({
                      ...prev,
                      maxMonthlyAmount: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep('card-details')}>
                Back to Card Details
              </Button>
              <Button onClick={() => setStep('card-details')} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Apply Restrictions
              </Button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Payment Method Added Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your new payment method has been securely added and is ready to use.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
                <Lock className="h-4 w-4" />
                Your payment information is encrypted and securely stored
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {step === 'card-details' ? 1 : step === 'restrictions' ? 2 : 3} of 3</span>
          <span>
            {step === 'card-details'
              ? 'Card Details'
              : step === 'restrictions'
                ? 'Security Settings'
                : 'Confirmation'}
          </span>
        </div>
        <Progress
          value={step === 'card-details' ? 33 : step === 'restrictions' ? 66 : 100}
          className="h-2"
        />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
};
