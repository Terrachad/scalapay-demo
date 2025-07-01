'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { transactionService } from '@/services/transaction-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  User,
  CreditCard,
  Bell,
  Shield,
  Save,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';

export default function CustomerProfilePage() {
  const { toast } = useToast();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { data: transactions } = useQuery({
    queryKey: ['customer-transactions'],
    queryFn: transactionService.getMyTransactions,
  });

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, Anytown, ST 12345',
    dateOfBirth: '1990-01-01',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    paymentReminders: true,
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    sms: false,
    email: true,
    push: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
    loginNotifications: true,
  });

  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  // Calculate stats
  const totalSpent = transactions ? 
    transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) : 0;
  
  const completedTransactions = transactions ? 
    transactions.filter(t => t.status === 'completed').length : 0;
  
  const creditUsage = user ? 
    ((parseFloat(user.creditLimit.toString()) - parseFloat(user.availableCredit.toString())) / 
     parseFloat(user.creditLimit.toString())) * 100 : 0;

  const upcomingPayments = transactions ? 
    transactions.flatMap(t => t.payments || [])
      .filter(p => p.status === 'scheduled')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3) : [];

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local user state
      if (user) {
        setUser({
          ...user,
          name: profileData.name,
          email: profileData.email,
        });
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

  const handleSaveSecurity = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Security settings saved",
        description: "Your security settings have been updated.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <User className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              My Profile
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Available Credit</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(parseFloat(user?.availableCredit?.toString() || '0'))}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Spent</p>
                      <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Orders Completed</p>
                      <p className="text-xl font-bold">{completedTransactions}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Credit Usage</p>
                      <p className="text-xl font-bold">{creditUsage.toFixed(0)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                  </TabsList>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                            placeholder="Enter your email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                            placeholder="Enter your phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={profileData.dateOfBirth}
                            onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                          placeholder="Enter your address"
                        />
                      </div>
                    </div>

                    {/* Credit Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Credit Information</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Credit Limit</span>
                          <span className="font-bold">{formatCurrency(parseFloat(user?.creditLimit?.toString() || '0'))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Available Credit</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(parseFloat(user?.availableCredit?.toString() || '0'))}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Credit Usage</span>
                            <span>{creditUsage.toFixed(1)}%</span>
                          </div>
                          <Progress value={creditUsage} className="h-3" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Notifications Tab */}
                  <TabsContent value="notifications" className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'paymentReminders', label: 'Payment Reminders', description: 'Get notified about upcoming payments' },
                          { key: 'orderUpdates', label: 'Order Updates', description: 'Receive updates about your orders' },
                          { key: 'promotions', label: 'Promotions & Offers', description: 'Get notified about special deals' },
                          { key: 'newsletter', label: 'Newsletter', description: 'Receive our monthly newsletter' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                [item.key]: e.target.checked
                              })}
                              className="w-4 h-4"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Delivery Methods</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          { key: 'email', label: 'Email', icon: Mail },
                          { key: 'sms', label: 'SMS', icon: Phone },
                          { key: 'push', label: 'Push Notifications', icon: Bell },
                        ].map((method) => (
                          <div key={method.key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <method.icon className="w-4 h-4" />
                              <span className="font-medium">{method.label}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={notificationSettings[method.key as keyof typeof notificationSettings] as boolean}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                [method.key]: e.target.checked
                              })}
                              className="w-4 h-4"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveNotifications} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security" className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Account Security</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-600">Add an extra layer of security</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={securitySettings.twoFactorEnabled ? "default" : "secondary"}>
                              {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <input
                              type="checkbox"
                              checked={securitySettings.twoFactorEnabled}
                              onChange={(e) => setSecuritySettings({...securitySettings, twoFactorEnabled: e.target.checked})}
                              className="w-4 h-4"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Login Notifications</p>
                            <p className="text-sm text-gray-600">Get notified of account access</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={securitySettings.loginNotifications}
                            onChange={(e) => setSecuritySettings({...securitySettings, loginNotifications: e.target.checked})}
                            className="w-4 h-4"
                          />
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
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Password</h3>
                      <div className="space-y-4">
                        <Button variant="outline" className="w-full">
                          <Edit className="w-4 h-4 mr-2" />
                          Change Password
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveSecurity} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Security Settings'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Account Type</span>
                    <Badge>Premium</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Member Since</span>
                    <span className="text-sm font-medium">{formatDate(user?.createdAt || new Date().toISOString())}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verification Status</span>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingPayments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatCurrency(parseFloat(payment.amount.toString()))}</p>
                          <p className="text-sm text-gray-600">Due {formatDate(payment.dueDate)}</p>
                        </div>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No upcoming payments</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View Orders
                </Button>
                <Button variant="outline" className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment Methods
                </Button>
                <Button variant="outline" className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}