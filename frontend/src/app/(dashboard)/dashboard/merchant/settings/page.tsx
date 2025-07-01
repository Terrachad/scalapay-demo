'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { merchantService } from '@/services/merchant-service';
import { 
  Settings,
  Store,
  CreditCard,
  Bell,
  Shield,
  Key,
  Save,
  Upload,
  Globe,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function MerchantSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: merchantService.getProfile,
  });

  const [storeSettings, setStoreSettings] = useState({
    businessName: '',
    email: '',
    phone: '+1 (555) 123-4567',
    address: '123 Commerce Street, Business District',
    website: 'https://demo-electronics.com',
    description: 'Premium electronics and gadgets for tech enthusiasts',
    feePercentage: '2.50',
    isActive: true
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      setStoreSettings(prev => ({
        ...prev,
        businessName: profile.businessName || '',
        email: profile.email || '',
        feePercentage: profile.feePercentage || '2.50',
        isActive: profile.isActive ?? true
      }));
    }
  }, [profile]);

  const [paymentSettings, setPaymentSettings] = useState({
    enablePayIn2: true,
    enablePayIn3: true,
    enablePayIn4: true,
    minimumAmount: '50.00',
    maximumAmount: '5000.00',
    autoApprove: true,
    requireManualReview: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newOrders: true,
    paymentReceived: true,
    paymentFailed: true,
    dailySummary: true,
    weeklyReport: true,
    monthlyReport: true,
    email: true,
    sms: false,
    inApp: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
    ipWhitelist: '',
    webhookUrl: 'https://api.demo-electronics.com/webhooks/scalapay',
    apiKey: 'sk_live_*********************'
  });

  const handleSaveStoreSettings = async () => {
    setLoading(true);
    try {
      await merchantService.updateProfile({
        businessName: storeSettings.businessName,
        email: storeSettings.email,
        name: storeSettings.businessName, // Use businessName as name
      });
      
      await refetchProfile(); // Refresh the profile data
      
      toast({
        title: "Settings saved",
        description: "Your store settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setLoading(true);
    try {
      await merchantService.updatePaymentSettings(paymentSettings);
      toast({
        title: "Payment settings saved",
        description: "Your payment configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save payment settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setLoading(true);
    try {
      await merchantService.updateNotificationSettings(notificationSettings);
      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setLoading(true);
    try {
      await merchantService.updateSecuritySettings(securitySettings);
      toast({
        title: "Security settings saved",
        description: "Your security configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save security settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setLoading(true);
    try {
      const { apiKey } = await merchantService.regenerateApiKey();
      setSecuritySettings(prev => ({ ...prev, apiKey }));
      toast({
        title: "API key regenerated",
        description: "Your new API key has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate API key.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Store Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your store configuration and preferences
          </p>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="store" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="store">Store Info</TabsTrigger>
                  <TabsTrigger value="payment">Payment Plans</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* Store Information */}
                <TabsContent value="store" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        Store Information
                      </CardTitle>
                      <CardDescription>
                        Update your store details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            value={storeSettings.businessName}
                            onChange={(e) => setStoreSettings({...storeSettings, businessName: e.target.value})}
                            placeholder="Your business name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={storeSettings.email}
                            onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                            placeholder="contact@yourbusiness.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={storeSettings.phone}
                            onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={storeSettings.website}
                            onChange={(e) => setStoreSettings({...storeSettings, website: e.target.value})}
                            placeholder="https://yourbusiness.com"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Business Address</Label>
                        <Input
                          id="address"
                          value={storeSettings.address}
                          onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                          placeholder="123 Business Street, City, State, ZIP"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Business Description</Label>
                        <textarea
                          id="description"
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={storeSettings.description}
                          onChange={(e) => setStoreSettings({...storeSettings, description: e.target.value})}
                          placeholder="Describe your business..."
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="feePercentage">Commission Rate (%)</Label>
                          <Input
                            id="feePercentage"
                            value={storeSettings.feePercentage}
                            onChange={(e) => setStoreSettings({...storeSettings, feePercentage: e.target.value})}
                            placeholder="2.50"
                            disabled
                          />
                          <p className="text-sm text-gray-500">Contact support to modify commission rates</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Store Status</Label>
                          <div className="flex items-center gap-2">
                            <Badge variant={storeSettings.isActive ? "default" : "secondary"}>
                              {storeSettings.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSaveStoreSettings} disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payment Settings */}
                <TabsContent value="payment" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payment Plan Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure available payment options for your customers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Available Payment Plans</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={paymentSettings.enablePayIn2}
                                onChange={(e) => setPaymentSettings({...paymentSettings, enablePayIn2: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Pay in 2</p>
                                <p className="text-sm text-gray-600">Split payment into 2 installments</p>
                              </div>
                            </div>
                            <Badge variant={paymentSettings.enablePayIn2 ? "default" : "secondary"}>
                              {paymentSettings.enablePayIn2 ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={paymentSettings.enablePayIn3}
                                onChange={(e) => setPaymentSettings({...paymentSettings, enablePayIn3: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Pay in 3</p>
                                <p className="text-sm text-gray-600">Split payment into 3 installments</p>
                              </div>
                            </div>
                            <Badge variant={paymentSettings.enablePayIn3 ? "default" : "secondary"}>
                              {paymentSettings.enablePayIn3 ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={paymentSettings.enablePayIn4}
                                onChange={(e) => setPaymentSettings({...paymentSettings, enablePayIn4: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Pay in 4</p>
                                <p className="text-sm text-gray-600">Split payment into 4 installments</p>
                              </div>
                            </div>
                            <Badge variant={paymentSettings.enablePayIn4 ? "default" : "secondary"}>
                              {paymentSettings.enablePayIn4 ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="minimumAmount">Minimum Order Amount</Label>
                          <Input
                            id="minimumAmount"
                            value={paymentSettings.minimumAmount}
                            onChange={(e) => setPaymentSettings({...paymentSettings, minimumAmount: e.target.value})}
                            placeholder="50.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maximumAmount">Maximum Order Amount</Label>
                          <Input
                            id="maximumAmount"
                            value={paymentSettings.maximumAmount}
                            onChange={(e) => setPaymentSettings({...paymentSettings, maximumAmount: e.target.value})}
                            placeholder="5000.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Order Processing</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={paymentSettings.autoApprove}
                                onChange={(e) => setPaymentSettings({...paymentSettings, autoApprove: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Auto-approve orders</p>
                                <p className="text-sm text-gray-600">Automatically approve eligible orders</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={paymentSettings.requireManualReview}
                                onChange={(e) => setPaymentSettings({...paymentSettings, requireManualReview: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Require manual review</p>
                                <p className="text-sm text-gray-600">Flag high-value orders for manual review</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSavePaymentSettings} disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save Payment Settings'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notification Preferences
                      </CardTitle>
                      <CardDescription>
                        Choose how you want to be notified about store activities
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Transaction Notifications</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'newOrders', label: 'New Orders', description: 'Get notified when customers place new orders' },
                            { key: 'paymentReceived', label: 'Payment Received', description: 'Get notified when payments are processed' },
                            { key: 'paymentFailed', label: 'Payment Failed', description: 'Get notified when payments fail' }
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                                  onChange={(e) => setNotificationSettings({
                                    ...notificationSettings,
                                    [item.key]: e.target.checked
                                  })}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <p className="font-medium">{item.label}</p>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Report Notifications</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'dailySummary', label: 'Daily Summary', description: 'Daily overview of transactions and revenue' },
                            { key: 'weeklyReport', label: 'Weekly Report', description: 'Weekly performance and analytics report' },
                            { key: 'monthlyReport', label: 'Monthly Report', description: 'Comprehensive monthly business report' }
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                                  onChange={(e) => setNotificationSettings({
                                    ...notificationSettings,
                                    [item.key]: e.target.checked
                                  })}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <p className="font-medium">{item.label}</p>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Delivery Methods</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          {[
                            { key: 'email', label: 'Email', icon: Mail },
                            { key: 'sms', label: 'SMS', icon: Phone },
                            { key: 'inApp', label: 'In-App', icon: Bell }
                          ].map((method) => (
                            <div key={method.key} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings[method.key as keyof typeof notificationSettings] as boolean}
                                  onChange={(e) => setNotificationSettings({
                                    ...notificationSettings,
                                    [method.key]: e.target.checked
                                  })}
                                  className="w-4 h-4"
                                />
                                <method.icon className="w-4 h-4" />
                                <span className="font-medium">{method.label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save Notification Settings'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Security & API Configuration
                      </CardTitle>
                      <CardDescription>
                        Manage your account security and API settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Account Security</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={securitySettings.twoFactorEnabled}
                                onChange={(e) => setSecuritySettings({...securitySettings, twoFactorEnabled: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium">Two-Factor Authentication</p>
                                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                              </div>
                            </div>
                            <Badge variant={securitySettings.twoFactorEnabled ? "default" : "secondary"}>
                              {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                            <Input
                              id="sessionTimeout"
                              value={securitySettings.sessionTimeout}
                              onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                              placeholder="30"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ipWhitelist">IP Whitelist (optional)</Label>
                            <Input
                              id="ipWhitelist"
                              value={securitySettings.ipWhitelist}
                              onChange={(e) => setSecuritySettings({...securitySettings, ipWhitelist: e.target.value})}
                              placeholder="192.168.1.1, 10.0.0.1"
                            />
                            <p className="text-sm text-gray-500">Comma-separated list of allowed IP addresses</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">API Configuration</h3>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="webhookUrl">Webhook URL</Label>
                            <Input
                              id="webhookUrl"
                              value={securitySettings.webhookUrl}
                              onChange={(e) => setSecuritySettings({...securitySettings, webhookUrl: e.target.value})}
                              placeholder="https://your-domain.com/webhooks/scalapay"
                            />
                            <p className="text-sm text-gray-500">URL to receive real-time notifications</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <div className="flex gap-2">
                              <Input
                                id="apiKey"
                                value={securitySettings.apiKey}
                                onChange={(e) => setSecuritySettings({...securitySettings, apiKey: e.target.value})}
                                placeholder="sk_live_*********************"
                                type="password"
                              />
                              <Button variant="outline" onClick={handleRegenerateApiKey} disabled={loading}>
                                <Key className="w-4 h-4 mr-2" />
                                Regenerate
                              </Button>
                            </div>
                            <p className="text-sm text-gray-500">Keep your API key secure and don't share it publicly</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800 dark:text-yellow-300">Security Notice</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Always use HTTPS for webhook URLs and keep your API keys secure. 
                          Contact support if you suspect any unauthorized access.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSaveSecuritySettings} disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save Security Settings'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}