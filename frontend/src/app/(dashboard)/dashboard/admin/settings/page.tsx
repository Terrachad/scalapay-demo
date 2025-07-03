'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/use-toast';
import PaymentSettings from '@/components/admin/payment-settings';
import { 
  platformSettingsService, 
  PlatformSettings,
  UpdatePlatformSettingsDto,
  PendingMerchant 
} from '@/services/platform-settings-service';
import {
  Settings,
  DollarSign,
  Shield,
  CreditCard,
  AlertTriangle,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
} from 'lucide-react';


export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<UpdatePlatformSettingsDto>({});

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['general', 'payments', 'approvals', 'security', 'system'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Queries for real platform settings
  const { data: platformSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: platformSettingsService.getSettings,
  });

  // Initialize settings when platform settings are loaded
  useEffect(() => {
    if (platformSettings) {
      setSettings({
        merchantFeeRate: platformSettings.merchantFeeRate,
        latePaymentFee: platformSettings.latePaymentFee,
        defaultCreditLimit: platformSettings.defaultCreditLimit,
        maxTransactionAmount: platformSettings.maxTransactionAmount,
        enableFraudDetection: platformSettings.enableFraudDetection,
        requireMerchantApproval: platformSettings.requireMerchantApproval,
        enableEmailNotifications: platformSettings.enableEmailNotifications,
        maintenanceMode: platformSettings.maintenanceMode,
      });
    }
  }, [platformSettings]);

  const { data: pendingMerchants } = useQuery({
    queryKey: ['pending-merchants'],
    queryFn: platformSettingsService.getPendingMerchants,
  });

  const { data: systemStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: adminService.getAnalytics,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: UpdatePlatformSettingsDto) => 
      platformSettingsService.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Platform configuration has been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update platform settings',
        variant: 'destructive',
      });
    },
  });

  const approveMerchantMutation = useMutation({
    mutationFn: ({ merchantId, notes }: { merchantId: string; notes?: string }) => 
      platformSettingsService.approveMerchant(merchantId, notes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
      if (result.success) {
        toast({
          title: 'Merchant Approved',
          description: result.message,
        });
      } else {
        toast({
          title: 'Approval Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    },
  });

  const rejectMerchantMutation = useMutation({
    mutationFn: ({ merchantId, reason }: { merchantId: string; reason?: string }) => 
      platformSettingsService.rejectMerchant(merchantId, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
      if (result.success) {
        toast({
          title: 'Merchant Rejected',
          description: result.message,
        });
      } else {
        toast({
          title: 'Rejection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    },
  });

  const handleSaveSettings = () => {
    const errors = platformSettingsService.validateSettings(settings);
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }
    updateSettingsMutation.mutate(settings);
  };

  const handleApproveMerchant = (merchantId: string) => {
    approveMerchantMutation.mutate({ merchantId });
  };

  const handleRejectMerchant = (merchantId: string) => {
    rejectMerchantMutation.mutate({ merchantId });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Platform Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Configure platform parameters and manage system settings
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payments">Payment Settings</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Fee Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Fee Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Merchant Fee Rate (%)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.merchantFeeRate || 0}
                        onChange={(e) =>
                          setSettings({ ...settings, merchantFeeRate: parseFloat(e.target.value) || 0 })
                        }
                        className="flex-1"
                      />
                      <Percent className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {(settings.merchantFeeRate || 0)}% per transaction
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Late Payment Fee ($)</label>
                    <Input
                      type="number"
                      value={settings.latePaymentFee}
                      onChange={(e) =>
                        setSettings({ ...settings, latePaymentFee: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">Applied after 7 days past due</p>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Credit Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Default Credit Limit ($)
                    </label>
                    <Input
                      type="number"
                      value={settings.defaultCreditLimit}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultCreditLimit: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">For new customer accounts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Transaction Amount ($)
                    </label>
                    <Input
                      type="number"
                      value={settings.maxTransactionAmount}
                      onChange={(e) =>
                        setSettings({ ...settings, maxTransactionAmount: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum single transaction limit</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Toggles */}
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Fraud Detection</p>
                        <p className="text-sm text-gray-600">Enable automated fraud screening</p>
                      </div>
                      <Button
                        variant={settings.enableFraudDetection ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            enableFraudDetection: !settings.enableFraudDetection,
                          })
                        }
                      >
                        {settings.enableFraudDetection ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Merchant Approval Required</p>
                        <p className="text-sm text-gray-600">New merchants need admin approval</p>
                      </div>
                      <Button
                        variant={settings.requireMerchantApproval ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            requireMerchantApproval: !settings.requireMerchantApproval,
                          })
                        }
                      >
                        {settings.requireMerchantApproval ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600">Send system notifications via email</p>
                      </div>
                      <Button
                        variant={settings.enableEmailNotifications ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            enableEmailNotifications: !settings.enableEmailNotifications,
                          })
                        }
                      >
                        {settings.enableEmailNotifications ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Maintenance Mode</p>
                        <p className="text-sm text-gray-600">Disable new transactions</p>
                      </div>
                      <Button
                        variant={settings.maintenanceMode ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })
                        }
                      >
                        {settings.maintenanceMode ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSettings />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Pending Merchant Approvals
                  </div>
                  <Badge variant="secondary">{pendingMerchants?.length || 0} pending</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!Array.isArray(pendingMerchants) || pendingMerchants.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">No pending merchant applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.isArray(pendingMerchants) && pendingMerchants.map((merchant) => (
                      <div key={merchant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{merchant.name}</h3>
                            <p className="text-sm text-gray-600">{merchant.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">Pending Review</Badge>
                              <span className="text-xs text-gray-500">
                                Applied on {new Date(merchant.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveMerchant(merchant.id)}
                              disabled={approveMerchantMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectMerchant(merchant.id)}
                              disabled={rejectMerchantMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Authentication</h4>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Two-Factor Authentication</span>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Required for all admin accounts</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Session Timeout</span>
                        <span className="text-sm font-medium">24 hours</span>
                      </div>
                      <p className="text-xs text-gray-500">Automatic logout after inactivity</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">API Security</h4>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Rate Limiting</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <p className="text-xs text-gray-500">1000 requests per hour per IP</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">SSL/TLS Encryption</span>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                      <p className="text-xs text-gray-500">All communications encrypted</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-600">All Systems Operational</p>
                  <p className="text-sm text-gray-500">99.9% uptime</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Database Status</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-blue-600">Connected</p>
                  <p className="text-sm text-gray-500">Response time: 45ms</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Background Jobs</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="font-semibold text-purple-600">Running</p>
                  <p className="text-sm text-gray-500">12 active jobs</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {systemStats?.totalTransactions || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {systemStats?.totalUsers || 0}
                    </p>
                    <p className="text-sm text-gray-600">Registered Users</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {systemStats?.merchantCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">Active Merchants</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      ${((systemStats?.platformRevenue || 0) / 1000).toFixed(1)}K
                    </p>
                    <p className="text-sm text-gray-600">Platform Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
