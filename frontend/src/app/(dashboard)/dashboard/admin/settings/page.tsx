'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings,
  CreditCard,
  Shield,
  Database,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  Mail,
  Lock,
  Unlock,
} from 'lucide-react';

interface PlatformSettings {
  // General Settings
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  timeZone: string;

  // Financial Settings
  defaultCreditLimit: number;
  maxCreditLimit: number;
  maxTransactionAmount: number;
  merchantFeeRate: number;
  lateFeeAmount: number;

  // Payment Settings
  paymentInterval: string;
  gracePeriodDays: number;
  maxRetries: number;
  interestRate: number;

  // Feature Toggles
  enableAutoApproval: boolean;
  enableEarlyPayment: boolean;
  enableFraudDetection: boolean;
  requireMerchantApproval: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableWebhookNotifications: boolean;
  maintenanceMode: boolean;

  // Security Settings
  requireTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
}

const defaultSettings: PlatformSettings = {
  platformName: 'ScalaPay',
  supportEmail: 'support@scalapay.com',
  defaultCurrency: 'USD',
  timeZone: 'UTC',
  defaultCreditLimit: 1000,
  maxCreditLimit: 10000,
  maxTransactionAmount: 5000,
  merchantFeeRate: 2.9,
  lateFeeAmount: 25,
  paymentInterval: 'biweekly',
  gracePeriodDays: 7,
  maxRetries: 3,
  interestRate: 0.0,
  enableAutoApproval: true,
  enableEarlyPayment: true,
  enableFraudDetection: true,
  requireMerchantApproval: true,
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  enableWebhookNotifications: true,
  maintenanceMode: false,
  requireTwoFactor: true,
  sessionTimeoutMinutes: 30,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Try to load from API, fallback to defaults
      const response = await fetch('/api/admin/platform-settings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        toast({
          title: 'Settings Saved',
          description: 'Platform settings have been updated successfully.',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast({
      title: 'Settings Reset',
      description: 'All settings have been reset to default values.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading admin settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Admin Settings</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure platform settings, payment processing, and security options
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={resetToDefaults} variant="outline" disabled={saving}>
                Reset to Defaults
              </Button>
              <Button
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
          {hasChanges && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  You have unsaved changes
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Features
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Platform Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="platformName">Platform Name</Label>
                      <Input
                        id="platformName"
                        value={settings.platformName}
                        onChange={(e) => updateSetting('platformName', e.target.value)}
                        placeholder="Enter platform name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => updateSetting('supportEmail', e.target.value)}
                        placeholder="support@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultCurrency">Default Currency</Label>
                      <Select
                        value={settings.defaultCurrency}
                        onValueChange={(value) => updateSetting('defaultCurrency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Select
                        value={settings.timeZone}
                        onValueChange={(value) => updateSetting('timeZone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Notification Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Send notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableEmailNotifications}
                        onCheckedChange={(checked) =>
                          updateSetting('enableEmailNotifications', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Send notifications via SMS
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableSMSNotifications}
                        onCheckedChange={(checked) =>
                          updateSetting('enableSMSNotifications', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Webhook Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Send notifications via webhooks
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableWebhookNotifications}
                        onCheckedChange={(checked) =>
                          updateSetting('enableWebhookNotifications', checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Settings Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Credit & Transaction Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="defaultCreditLimit">Default Credit Limit ($)</Label>
                      <Input
                        id="defaultCreditLimit"
                        type="number"
                        value={settings.defaultCreditLimit}
                        onChange={(e) =>
                          updateSetting('defaultCreditLimit', parseInt(e.target.value) || 0)
                        }
                        placeholder="1000"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        For new customer accounts
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="maxCreditLimit">Maximum Credit Limit ($)</Label>
                      <Input
                        id="maxCreditLimit"
                        type="number"
                        value={settings.maxCreditLimit}
                        onChange={(e) =>
                          updateSetting('maxCreditLimit', parseInt(e.target.value) || 0)
                        }
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxTransactionAmount">Max Transaction Amount ($)</Label>
                      <Input
                        id="maxTransactionAmount"
                        type="number"
                        value={settings.maxTransactionAmount}
                        onChange={(e) =>
                          updateSetting('maxTransactionAmount', parseInt(e.target.value) || 0)
                        }
                        placeholder="5000"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Maximum single transaction limit
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="w-5 h-5" />
                      Fees & Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="merchantFeeRate">Merchant Fee Rate (%)</Label>
                      <Input
                        id="merchantFeeRate"
                        type="number"
                        step="0.1"
                        value={settings.merchantFeeRate}
                        onChange={(e) =>
                          updateSetting('merchantFeeRate', parseFloat(e.target.value) || 0)
                        }
                        placeholder="2.9"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Percentage per transaction
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="lateFeeAmount">Late Payment Fee ($)</Label>
                      <Input
                        id="lateFeeAmount"
                        type="number"
                        value={settings.lateFeeAmount}
                        onChange={(e) =>
                          updateSetting('lateFeeAmount', parseInt(e.target.value) || 0)
                        }
                        placeholder="25"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Applied after grace period
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={settings.interestRate}
                        onChange={(e) =>
                          updateSetting('interestRate', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.0"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Annual interest rate
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Payment Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="paymentInterval">Payment Interval</Label>
                      <Select
                        value={settings.paymentInterval}
                        onValueChange={(value) => updateSetting('paymentInterval', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriodDays"
                        type="number"
                        value={settings.gracePeriodDays}
                        onChange={(e) =>
                          updateSetting('gracePeriodDays', parseInt(e.target.value) || 0)
                        }
                        placeholder="7"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxRetries">Max Payment Retries</Label>
                      <Input
                        id="maxRetries"
                        type="number"
                        value={settings.maxRetries}
                        onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value) || 0)}
                        placeholder="3"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Settings Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Authentication & Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Require 2FA for all admin accounts
                        </p>
                      </div>
                      <Switch
                        checked={settings.requireTwoFactor}
                        onCheckedChange={(checked) => updateSetting('requireTwoFactor', checked)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.sessionTimeoutMinutes}
                        onChange={(e) =>
                          updateSetting('sessionTimeoutMinutes', parseInt(e.target.value) || 0)
                        }
                        placeholder="30"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Automatic logout after inactivity
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="passwordExpiry">Password Expiry (Days)</Label>
                      <Input
                        id="passwordExpiry"
                        type="number"
                        value={settings.passwordExpiryDays}
                        onChange={(e) =>
                          updateSetting('passwordExpiryDays', parseInt(e.target.value) || 0)
                        }
                        placeholder="90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        value={settings.maxLoginAttempts}
                        onChange={(e) =>
                          updateSetting('maxLoginAttempts', parseInt(e.target.value) || 0)
                        }
                        placeholder="5"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Before account lockout
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Fraud Detection</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Enable automated fraud screening
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableFraudDetection}
                        onCheckedChange={(checked) =>
                          updateSetting('enableFraudDetection', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Merchant Approval Required</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          New merchants need admin approval
                        </p>
                      </div>
                      <Switch
                        checked={settings.requireMerchantApproval}
                        onCheckedChange={(checked) =>
                          updateSetting('requireMerchantApproval', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Disable new transactions
                        </p>
                      </div>
                      <Switch
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Platform Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Approval</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Automatically approve qualifying transactions
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableAutoApproval}
                        onCheckedChange={(checked) => updateSetting('enableAutoApproval', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Early Payment</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Allow customers to pay early
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableEarlyPayment}
                        onCheckedChange={(checked) => updateSetting('enableEarlyPayment', checked)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium mb-2">Feature Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto Approval</span>
                          <Badge variant={settings.enableAutoApproval ? 'default' : 'secondary'}>
                            {settings.enableAutoApproval ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Early Payment</span>
                          <Badge variant={settings.enableEarlyPayment ? 'default' : 'secondary'}>
                            {settings.enableEarlyPayment ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Fraud Detection</span>
                          <Badge variant={settings.enableFraudDetection ? 'default' : 'secondary'}>
                            {settings.enableFraudDetection ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Maintenance Mode</span>
                          <Badge variant={settings.maintenanceMode ? 'destructive' : 'default'}>
                            {settings.maintenanceMode ? 'Active' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Status Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Platform Status</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={settings.maintenanceMode ? 'destructive' : 'default'}>
                    {settings.maintenanceMode ? 'Maintenance Mode' : 'Operational'}
                  </Badge>
                  {hasChanges && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Last updated: {new Date().toLocaleString()} •
                {
                  Object.entries(settings).filter(
                    ([_, value]) => typeof value === 'boolean' && value,
                  ).length
                }{' '}
                features enabled
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
