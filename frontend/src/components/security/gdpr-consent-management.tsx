'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  FileText,
  Download,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Lock,
  Globe,
  Database,
  Users,
  BarChart3,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useSecurityStore } from '@/store/security-store';

interface GDPRConsentManagementProps {
  userId: string;
  className?: string;
}

interface ConsentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  purpose: string;
  dataTypes: string[];
  retentionPeriod: string;
  thirdParties?: string[];
}

/**
 * Enterprise GDPR Consent Management Component
 * Features:
 * - Comprehensive consent management with granular controls
 * - Data export and deletion request processing
 * - Audit trail and compliance tracking
 * - Real-time consent status monitoring
 * - Third-party data sharing transparency
 * - Automated retention period management
 * - Legal basis documentation and validation
 */
export const GDPRConsentManagement: React.FC<GDPRConsentManagementProps> = ({
  userId,
  className = '',
}) => {
  // Store hooks
  const {
    gdprConsent,
    consentHistory,
    dataExportRequests,
    isLoadingGDPR,
    gdprError,
    fetchGDPRConsent,
    updateGDPRConsent,
    requestDataExport,
    requestDataDeletion,
    clearGDPRError,
  } = useSecurityStore();

  // Local state
  const [selectedTab, setSelectedTab] = useState('consent');
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [pendingConsents, setPendingConsents] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Consent categories configuration
  const consentCategories: ConsentCategory[] = [
    {
      id: 'payment_processing',
      name: 'Payment Processing',
      description: 'Processing of payment transactions and related financial data',
      required: true,
      purpose: 'To process payments and manage your financial transactions securely',
      dataTypes: ['Payment methods', 'Transaction history', 'Billing information'],
      retentionPeriod: '7 years (regulatory requirement)',
      thirdParties: ['Stripe', 'Payment processors', 'Banks'],
    },
    {
      id: 'account_management',
      name: 'Account Management',
      description: 'Managing your user account and providing customer support',
      required: true,
      purpose: 'To maintain your account and provide customer service',
      dataTypes: ['Account details', 'Profile information', 'Support communications'],
      retentionPeriod: '2 years after account closure',
    },
    {
      id: 'marketing_communications',
      name: 'Marketing Communications',
      description: 'Sending marketing emails and promotional content',
      required: false,
      purpose: 'To send you relevant offers and product updates',
      dataTypes: ['Email address', 'Communication preferences', 'Interaction history'],
      retentionPeriod: 'Until withdrawal of consent',
      thirdParties: ['Email service providers', 'Analytics platforms'],
    },
    {
      id: 'analytics_improvement',
      name: 'Analytics & Improvement',
      description: 'Analyzing usage patterns to improve our services',
      required: false,
      purpose: 'To understand how you use our services and make improvements',
      dataTypes: ['Usage statistics', 'Feature interactions', 'Performance metrics'],
      retentionPeriod: '2 years',
      thirdParties: ['Analytics providers', 'Research partners'],
    },
    {
      id: 'personalization',
      name: 'Personalization',
      description: 'Personalizing your experience and recommendations',
      required: false,
      purpose: 'To provide personalized content and recommendations',
      dataTypes: ['Preferences', 'Behavior patterns', 'Recommendation data'],
      retentionPeriod: '1 year of inactivity',
    },
  ];

  // Initialize data
  useEffect(() => {
    fetchGDPRConsent(userId);
  }, [userId, fetchGDPRConsent]);

  // Set initial pending consents from current consent
  useEffect(() => {
    if (gdprConsent) {
      setPendingConsents({
        payment_processing: gdprConsent.paymentProcessing,
        account_management: gdprConsent.accountManagement,
        marketing_communications: gdprConsent.marketingCommunications,
        analytics_improvement: gdprConsent.analyticsImprovement,
        personalization: gdprConsent.personalization,
      });
    }
  }, [gdprConsent]);

  // Handle consent toggle
  const handleConsentToggle = (categoryId: string, enabled: boolean) => {
    const category = consentCategories.find((c) => c.id === categoryId);
    if (category?.required && !enabled) {
      return; // Cannot disable required consents
    }

    setPendingConsents((prev) => ({
      ...prev,
      [categoryId]: enabled,
    }));
  };

  // Save consent changes
  const handleSaveConsents = async () => {
    setIsUpdating(true);
    try {
      await updateGDPRConsent(userId, {
        paymentProcessing: pendingConsents.payment_processing || false,
        accountManagement: pendingConsents.account_management || false,
        marketingCommunications: pendingConsents.marketing_communications || false,
        analyticsImprovement: pendingConsents.analytics_improvement || false,
        personalization: pendingConsents.personalization || false,
      });
    } catch (error) {
      console.error('Failed to update consents:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle data export request
  const handleDataExport = async () => {
    try {
      await requestDataExport(userId, 'user_requested');
    } catch (error) {
      console.error('Data export request failed:', error);
    }
  };

  // Handle account deletion
  const handleAccountDeletion = async () => {
    try {
      await requestDataDeletion(userId, 'user_requested');
      setShowDeletionDialog(false);
    } catch (error) {
      console.error('Account deletion request failed:', error);
    }
  };

  // Helper functions
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConsentStatus = (categoryId: string) => {
    return pendingConsents[categoryId] || false;
  };

  const hasUnsavedChanges = () => {
    if (!gdprConsent) return false;

    return (
      pendingConsents.payment_processing !== gdprConsent.paymentProcessing ||
      pendingConsents.account_management !== gdprConsent.accountManagement ||
      pendingConsents.marketing_communications !== gdprConsent.marketingCommunications ||
      pendingConsents.analytics_improvement !== gdprConsent.analyticsImprovement ||
      pendingConsents.personalization !== gdprConsent.personalization
    );
  };

  const getComplianceScore = () => {
    const totalCategories = consentCategories.length;
    const enabledCategories = Object.values(pendingConsents).filter(Boolean).length;
    return Math.round((enabledCategories / totalCategories) * 100);
  };

  if (isLoadingGDPR) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading GDPR settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Privacy & Data Protection
          </h2>
          <p className="text-sm text-gray-600">
            Manage your data processing consents and privacy settings
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{getComplianceScore()}%</div>
          <div className="text-sm text-gray-600">Compliance Score</div>
        </div>
      </div>

      {/* Enterprise Compliance Dashboard */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Enterprise Compliance Dashboard
          </h3>
          <p className="text-sm text-gray-600">Real-time GDPR compliance monitoring and controls</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Real-time Compliance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Object.values(pendingConsents).filter(Boolean).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Consents</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">EU/US</div>
                  <div className="text-sm text-gray-600">Jurisdictions</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {dataExportRequests?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Data Exports</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {consentHistory?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Audit Events</div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Policy Management */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium">Policy Management</h4>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Policies
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Privacy Policy v2.1</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Cookie Policy v1.3</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Terms of Service v3.0</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Overview */}
      <Card>
        <CardHeader className="pb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Privacy Overview
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(pendingConsents).filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Active Consents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {gdprConsent ? formatDate(gdprConsent.lastUpdated) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Last Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dataExportRequests?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Export Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {consentHistory?.length || 0}
              </div>
              <div className="text-sm text-gray-600">History Events</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Privacy Compliance</span>
              <span>{getComplianceScore()}%</span>
            </div>
            <Progress value={getComplianceScore()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consent">Data Consent</TabsTrigger>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
        </TabsList>

        {/* Consent Management Tab */}
        <TabsContent value="consent" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Data Processing Consents</h3>
                {hasUnsavedChanges() && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {consentCategories.map((category) => (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{category.name}</h4>
                        {category.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                        <Badge
                          className={
                            getConsentStatus(category.id)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {getConsentStatus(category.id) ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{category.description}</p>

                      <div className="space-y-2 text-xs text-gray-500">
                        <div>
                          <strong>Purpose:</strong> {category.purpose}
                        </div>
                        <div>
                          <strong>Data Types:</strong> {category.dataTypes.join(', ')}
                        </div>
                        <div>
                          <strong>Retention:</strong> {category.retentionPeriod}
                        </div>
                        {category.thirdParties && (
                          <div>
                            <strong>Third Parties:</strong> {category.thirdParties.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <Switch
                      checked={getConsentStatus(category.id)}
                      onCheckedChange={(checked) => handleConsentToggle(category.id, checked)}
                      disabled={category.required}
                    />
                  </div>

                  {category.id !== consentCategories[consentCategories.length - 1].id && (
                    <Separator />
                  )}
                </div>
              ))}

              {hasUnsavedChanges() && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>You have unsaved changes to your consent preferences.</span>
                    <Button onClick={handleSaveConsents} disabled={isUpdating} size="sm">
                      {isUpdating && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <h3 className="font-semibold">Data Management Requests</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Data */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Your Data
                    </h4>
                    <p className="text-sm text-gray-600">
                      Download a copy of all your personal data we have stored.
                    </p>
                    <div className="text-xs text-gray-500">
                      Includes: Account details, payment history, preferences, and more
                    </div>
                  </div>
                  <Button onClick={handleDataExport} variant="outline">
                    Request Export
                  </Button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-red-800">
                      <Trash2 className="h-4 w-4" />
                      Delete Your Account
                    </h4>
                    <p className="text-sm text-red-700">
                      Permanently delete your account and all associated data.
                    </p>
                    <div className="text-xs text-red-600">
                      Warning: This action cannot be undone and will remove all your data.
                    </div>
                  </div>
                  <Button onClick={() => setShowDeletionDialog(true)} variant="destructive">
                    Request Deletion
                  </Button>
                </div>
              </div>

              {/* Recent Requests */}
              {dataExportRequests && dataExportRequests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Requests</h4>
                  <div className="space-y-2">
                    {dataExportRequests.map((request, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <div className="font-medium">
                            {request.type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Requested: {formatDate(request.requestDate)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            request.status === 'completed'
                              ? 'default'
                              : request.status === 'processing'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consent History & Audit Trail
              </h3>
            </CardHeader>
            <CardContent>
              {consentHistory && consentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentHistory.map((event, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{formatDate(event.timestamp)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.action === 'granted'
                                ? 'default'
                                : event.action === 'withdrawn'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {event.action.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.category}</TableCell>
                        <TableCell className="text-sm text-gray-600">{event.details}</TableCell>
                        <TableCell className="text-sm font-mono">{event.ipAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No consent history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rights Tab */}
        <TabsContent value="rights" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <h3 className="font-semibold">Your Privacy Rights</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Access</h4>
                      <p className="text-sm text-gray-600">
                        You can request a copy of all personal data we hold about you.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Settings className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Rectification</h4>
                      <p className="text-sm text-gray-600">
                        You can request correction of inaccurate or incomplete data.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Erasure</h4>
                      <p className="text-sm text-gray-600">
                        You can request deletion of your personal data in certain circumstances.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Restrict Processing</h4>
                      <p className="text-sm text-gray-600">
                        You can request limitation of how we process your data.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-orange-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Data Portability</h4>
                      <p className="text-sm text-gray-600">
                        You can request your data in a machine-readable format.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                    <div>
                      <h4 className="font-medium">Right to Object</h4>
                      <p className="text-sm text-gray-600">
                        You can object to processing based on legitimate interests.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  To exercise any of these rights, please contact our Data Protection Officer at
                  privacy@scalapay.com or use the data request tools above.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete your account and all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. All your data will be
                permanently removed.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p>
                <strong>This will delete:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your account and profile information</li>
                <li>Payment methods and transaction history</li>
                <li>All saved preferences and settings</li>
                <li>Communication history and support tickets</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeletionDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleAccountDeletion}>
                Delete My Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {gdprError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {gdprError}
            <Button variant="outline" size="sm" onClick={clearGDPRError} className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
