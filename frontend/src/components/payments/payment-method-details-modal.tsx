'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Shield,
  Activity,
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Lock,
} from 'lucide-react';
import { PaymentMethod, PaymentMethodAnalytics } from '@/services/payment-method-service';
import { usePaymentMethodStore } from '@/store/payment-method-store';

interface PaymentMethodDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod | null;
}

/**
 * Enterprise Payment Method Details Modal
 * Features:
 * - Comprehensive card analytics and usage statistics
 * - Risk assessment details and fraud analysis
 * - Auto-update history and status
 * - Usage restrictions management
 * - Compliance and audit information
 * - Performance insights and recommendations
 */
export const PaymentMethodDetailsModal: React.FC<PaymentMethodDetailsModalProps> = ({
  isOpen,
  onClose,
  paymentMethod,
}) => {
  const { fetchPaymentMethodAnalytics } = usePaymentMethodStore();
  const [analytics, setAnalytics] = useState<PaymentMethodAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Fetch analytics when modal opens
  useEffect(() => {
    if (isOpen && paymentMethod) {
      setIsLoadingAnalytics(true);
      fetchPaymentMethodAnalytics(paymentMethod.id)
        .then(setAnalytics)
        .catch(console.error)
        .finally(() => setIsLoadingAnalytics(false));
    }
  }, [isOpen, paymentMethod, fetchPaymentMethodAnalytics]);

  if (!paymentMethod) return null;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSecurityLevel = () => {
    if (paymentMethod.riskScore <= 0.3)
      return { level: 'High', color: 'text-green-600', bg: 'bg-green-100' };
    if (paymentMethod.riskScore <= 0.6)
      return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const securityLevel = getSecurityLevel();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Card Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
                      </h3>
                      <p className="text-gray-600">
                        Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/
                        {paymentMethod.expYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {paymentMethod.isDefault && (
                      <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                    )}
                    <Badge variant={paymentMethod.status === 'active' ? 'default' : 'secondary'}>
                      {paymentMethod.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {paymentMethod.usageCount}
                    </div>
                    <div className="text-sm text-gray-600">Times Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      #{paymentMethod.cardPosition}
                    </div>
                    <div className="text-sm text-gray-600">Card Position</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {paymentMethod.failureCount}
                    </div>
                    <div className="text-sm text-gray-600">Failures</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${securityLevel.color}`}>
                      {Math.round((1 - paymentMethod.riskScore) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Security Score</div>
                  </div>
                </div>

                {paymentMethod.lastUsed && (
                  <div className="text-sm text-gray-600">
                    Last used: {formatDate(paymentMethod.lastUsed)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Activity Status</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {paymentMethod.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {paymentMethod.isVerified ? 'Verified' : 'Pending verification'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Security Level</span>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${securityLevel.color}`}>
                    {securityLevel.level}
                  </div>
                  <div className="text-sm text-gray-600">
                    Risk score: {Math.round(paymentMethod.riskScore * 100)}/100
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Auto-Update</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {paymentMethod.autoUpdateData ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {paymentMethod.autoUpdateData?.lastUpdateCheck
                      ? `Last check: ${formatDate(paymentMethod.autoUpdateData.lastUpdateCheck)}`
                      : 'Never checked'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Usage Statistics */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Usage Statistics
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Transactions</div>
                        <div className="text-2xl font-bold">
                          {analytics.usageStats.totalTransactions}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(analytics.usageStats.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Average Transaction</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(analytics.usageStats.averageTransactionAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                        <div className="text-2xl font-bold">
                          {Math.round(analytics.usageStats.successRate * 100)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Risk Assessment
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${securityLevel.bg}`}
                      >
                        <Shield className={`h-6 w-6 ${securityLevel.color}`} />
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          Current Risk Score: {analytics.riskAssessment.currentScore}/100
                        </div>
                        <div className="text-sm text-gray-600">
                          Security Level: {securityLevel.level}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Risk Factors:</h4>
                      <div className="space-y-2">
                        {analytics.riskAssessment.factors.map((factor, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                          >
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <div className="flex-1">
                              <div className="font-medium">{factor.factor}</div>
                              <div className="text-sm text-gray-600">{factor.description}</div>
                            </div>
                            <Badge
                              variant={
                                factor.impact > 0.5
                                  ? 'destructive'
                                  : factor.impact > 0.3
                                    ? 'secondary'
                                    : 'default'
                              }
                            >
                              {Math.round(factor.impact * 100)}% impact
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {analytics.riskAssessment.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Recommendations:</h4>
                        <ul className="space-y-1">
                          {analytics.riskAssessment.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">No analytics data available</div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Information
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="font-medium">Verification Status</span>
                    <div className="flex items-center gap-2">
                      {paymentMethod.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span>{paymentMethod.verificationStatus}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-medium">Funding Type</span>
                    <Badge variant="outline">{paymentMethod.funding.toUpperCase()}</Badge>
                  </div>
                </div>

                {paymentMethod.fraudFlags && paymentMethod.fraudFlags.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-medium text-red-600">Fraud Flags</span>
                    <div className="space-y-1">
                      {paymentMethod.fraudFlags.map((flag, index) => (
                        <Badge key={index} variant="destructive" className="mr-2">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethod.autoUpdateData && (
                  <div className="space-y-2">
                    <span className="font-medium">Auto-Update History</span>
                    <div className="space-y-2">
                      {paymentMethod.autoUpdateData.updateHistory.map((update, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="flex justify-between">
                            <span>{formatDate(update.date)}</span>
                            <Badge variant="outline">{update.source}</Badge>
                          </div>
                          {Object.keys(update.changes).length > 0 && (
                            <div className="mt-1 text-gray-600">
                              Changes: {Object.keys(update.changes).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restrictions Tab */}
          <TabsContent value="restrictions" className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Usage Restrictions
                </h3>
              </CardHeader>
              <CardContent>
                {paymentMethod.usageRestrictions ? (
                  <div className="space-y-4">
                    {paymentMethod.usageRestrictions.maxDailyAmount && (
                      <div className="flex items-center justify-between">
                        <span>Daily Limit</span>
                        <Badge variant="outline">
                          {formatCurrency(paymentMethod.usageRestrictions.maxDailyAmount)}
                        </Badge>
                      </div>
                    )}

                    {paymentMethod.usageRestrictions.maxMonthlyAmount && (
                      <div className="flex items-center justify-between">
                        <span>Monthly Limit</span>
                        <Badge variant="outline">
                          {formatCurrency(paymentMethod.usageRestrictions.maxMonthlyAmount)}
                        </Badge>
                      </div>
                    )}

                    {paymentMethod.usageRestrictions.allowedMerchants &&
                      paymentMethod.usageRestrictions.allowedMerchants.length > 0 && (
                        <div>
                          <span className="font-medium">Allowed Merchants</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {paymentMethod.usageRestrictions.allowedMerchants.map(
                              (merchant, index) => (
                                <Badge key={index} variant="outline">
                                  {merchant}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {paymentMethod.usageRestrictions.restrictedCountries &&
                      paymentMethod.usageRestrictions.restrictedCountries.length > 0 && (
                        <div>
                          <span className="font-medium">Restricted Countries</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {paymentMethod.usageRestrictions.restrictedCountries.map(
                              (country, index) => (
                                <Badge key={index} variant="destructive">
                                  {country}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Modify Restrictions
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">No usage restrictions configured</p>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Add Restrictions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance & Audit
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics?.complianceStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>GDPR Compliance</span>
                      <Badge
                        variant={
                          analytics.complianceStatus.gdprCompliant ? 'default' : 'destructive'
                        }
                      >
                        {analytics.complianceStatus.gdprCompliant ? 'Compliant' : 'Non-compliant'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Data Retention Status</span>
                      <Badge
                        variant={
                          analytics.complianceStatus.dataRetentionStatus === 'current'
                            ? 'default'
                            : analytics.complianceStatus.dataRetentionStatus === 'expiring_soon'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {analytics.complianceStatus.dataRetentionStatus
                          .replace('_', ' ')
                          .toUpperCase()}
                      </Badge>
                    </div>

                    {analytics.complianceStatus.lastConsentUpdate && (
                      <div className="text-sm text-gray-600">
                        Last consent update:{' '}
                        {formatDate(analytics.complianceStatus.lastConsentUpdate)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-600">Loading compliance information...</div>
                )}

                <div className="space-y-2">
                  <span className="font-medium">Audit Trail</span>
                  <div className="space-y-1 text-sm">
                    <div>Created: {formatDate(paymentMethod.createdAt)}</div>
                    <div>Last Updated: {formatDate(paymentMethod.updatedAt)}</div>
                    <div>Stripe ID: {paymentMethod.stripePaymentMethodId}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
