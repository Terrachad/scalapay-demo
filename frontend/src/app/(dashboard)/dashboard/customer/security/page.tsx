'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MFASetupWizard } from '@/components/security/mfa-setup-wizard';
import { GDPRConsentManagement } from '@/components/security/gdpr-consent-management';
import { useAuthStore } from '@/store/auth-store';
import {
  Shield,
  ArrowLeft,
  Key,
  Smartphone,
  Mail,
  Globe,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  UserCheck,
  FileText,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface SecurityActivity {
  id: string;
  type: 'login' | 'password_change' | 'mfa_enable' | 'payment_method_add';
  description: string;
  timestamp: string;
  location: string;
  device: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'suspicious';
}

export default function SecurityPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showGDPRManager, setShowGDPRManager] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Mock security activity data - in production this would come from your API
  const securityActivity: SecurityActivity[] = [
    {
      id: '1',
      type: 'login',
      description: 'Successful login',
      timestamp: '2024-07-10T14:30:00Z',
      location: 'San Francisco, CA',
      device: 'Chrome on Windows',
      ipAddress: '192.168.1.100',
      status: 'success',
    },
    {
      id: '2',
      type: 'payment_method_add',
      description: 'Payment method added',
      timestamp: '2024-07-09T10:15:00Z',
      location: 'San Francisco, CA',
      device: 'Chrome on Windows',
      ipAddress: '192.168.1.100',
      status: 'success',
    },
    {
      id: '3',
      type: 'login',
      description: 'Failed login attempt',
      timestamp: '2024-07-08T22:45:00Z',
      location: 'Unknown Location',
      device: 'Unknown Browser',
      ipAddress: '203.0.113.1',
      status: 'failed',
    },
  ];

  // Mock security settings - in production this would come from your API
  const [securitySettings, setSecuritySettings] = useState({
    mfaEnabled: false,
    emailNotifications: true,
    loginAlerts: true,
    paymentAlerts: true,
    marketingEmails: false,
    dataRetention: '2-years',
    profileVisibility: 'private',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // In production, call your API to change password
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Password updated',
        description: 'Your password has been successfully changed.',
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSecuritySettingChange = (setting: string, value: any) => {
    setSecuritySettings((prev) => ({ ...prev, [setting]: value }));

    toast({
      title: 'Setting updated',
      description: 'Your security preference has been saved.',
    });
  };

  const getActivityIcon = (type: SecurityActivity['type']) => {
    switch (type) {
      case 'login':
        return <UserCheck className="w-4 h-4" />;
      case 'password_change':
        return <Key className="w-4 h-4" />;
      case 'mfa_enable':
        return <Smartphone className="w-4 h-4" />;
      case 'payment_method_add':
        return <Shield className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: SecurityActivity['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'suspicious':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Suspicious
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Security & Privacy
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account security and privacy settings
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <Card
            className={`${securitySettings.mfaEnabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 ${securitySettings.mfaEnabled ? 'bg-green-100 dark:bg-green-800' : 'bg-yellow-100 dark:bg-yellow-800'} rounded-full`}
                >
                  <Smartphone
                    className={`w-6 h-6 ${securitySettings.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${securitySettings.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                  >
                    Two-Factor Authentication
                  </p>
                  <p
                    className={`text-lg font-bold ${securitySettings.mfaEnabled ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}
                  >
                    {securitySettings.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Email Notifications
                  </p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {securitySettings.emailNotifications ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                  <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Profile Visibility
                  </p>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-200 capitalize">
                    {securitySettings.profileVisibility}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              {/* Password & Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Password & Authentication
                  </CardTitle>
                  <CardDescription>
                    Manage your password and two-factor authentication settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Password</h4>
                      <p className="text-sm text-gray-600">Last changed 30 days ago</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600">
                        {securitySettings.mfaEnabled
                          ? 'Add an extra layer of security to your account'
                          : 'Secure your account with 2FA'}
                      </p>
                    </div>
                    <Button
                      variant={securitySettings.mfaEnabled ? 'outline' : 'default'}
                      onClick={() => setShowMFASetup(true)}
                    >
                      {securitySettings.mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Security Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose when to receive security-related notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Login alerts</h4>
                      <p className="text-sm text-gray-600">
                        Get notified when someone logs into your account
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={securitySettings.loginAlerts}
                      onChange={(e) => handleSecuritySettingChange('loginAlerts', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Payment alerts</h4>
                      <p className="text-sm text-gray-600">
                        Get notified about payment-related activities
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={securitySettings.paymentAlerts}
                      onChange={(e) =>
                        handleSecuritySettingChange('paymentAlerts', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Marketing emails</h4>
                      <p className="text-sm text-gray-600">
                        Receive promotional offers and product updates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={securitySettings.marketingEmails}
                      onChange={(e) =>
                        handleSecuritySettingChange('marketingEmails', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Activity */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Monitor your account activity and security events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {securityActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{activity.description}</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>{new Date(activity.timestamp).toLocaleString()}</p>
                              <p>
                                {activity.location} • {activity.device}
                              </p>
                              <p className="font-mono text-xs">{activity.ipAddress}</p>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(activity.status)}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Privacy Controls
                  </CardTitle>
                  <CardDescription>Manage your data and privacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Profile visibility</h4>
                      <p className="text-sm text-gray-600">
                        Control who can see your profile information
                      </p>
                    </div>
                    <select
                      value={securitySettings.profileVisibility}
                      onChange={(e) =>
                        handleSecuritySettingChange('profileVisibility', e.target.value)
                      }
                      className="border rounded px-3 py-1"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data retention</h4>
                      <p className="text-sm text-gray-600">How long we keep your data</p>
                    </div>
                    <select
                      value={securitySettings.dataRetention}
                      onChange={(e) => handleSecuritySettingChange('dataRetention', e.target.value)}
                      className="border rounded px-3 py-1"
                    >
                      <option value="1-year">1 Year</option>
                      <option value="2-years">2 Years</option>
                      <option value="indefinite">Indefinite</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">GDPR Compliance</h4>
                      <p className="text-sm text-gray-600">
                        Manage your data rights and consent preferences
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowGDPRManager(true)}>
                      Manage Consent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordForm} onOpenChange={setShowPasswordForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Password</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MFA Setup Modal */}
      <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>
          <MFASetupWizard
            isOpen={showMFASetup}
            onClose={() => setShowMFASetup(false)}
            userId={user?.id || ''}
            onComplete={() => {
              setShowMFASetup(false);
              setSecuritySettings((prev) => ({ ...prev, mfaEnabled: true }));
            }}
            onCancel={() => setShowMFASetup(false)}
          />
        </DialogContent>
      </Dialog>

      {/* GDPR Manager Modal */}
      <Dialog open={showGDPRManager} onOpenChange={setShowGDPRManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Privacy & Data Management
            </DialogTitle>
          </DialogHeader>
          <GDPRConsentManagement userId={user?.id || ''} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
