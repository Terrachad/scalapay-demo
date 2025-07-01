'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Store,
  Search,
  Building2,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Globe,
  Phone,
  MapPin,
} from 'lucide-react';

export default function AdminMerchantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['admin-merchants'],
    queryFn: adminService.getAllMerchants,
  });

  const { data: transactions } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: adminService.getAllTransactions,
  });

  const filteredMerchants =
    merchants?.filter(
      (merchant) =>
        merchant.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  // Calculate merchant stats
  const getMerchantStats = (merchantId: string) => {
    const merchantTransactions = transactions?.filter((t) => t.merchantId === merchantId) || [];
    const totalRevenue = merchantTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );
    const completedTransactions = merchantTransactions.filter((t) => t.status === 'completed');
    const completedRevenue = completedTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    );

    return {
      totalTransactions: merchantTransactions.length,
      totalRevenue,
      completedTransactions: completedTransactions.length,
      completedRevenue,
      avgTransactionValue:
        merchantTransactions.length > 0 ? totalRevenue / merchantTransactions.length : 0,
    };
  };

  const activeMerchants = merchants?.filter((m) => m.isActive).length || 0;
  const totalRevenue =
    merchants?.reduce((sum, m) => {
      const stats = getMerchantStats(m.id);
      return sum + stats.completedRevenue;
    }, 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
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
            <Store className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Merchant Management</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage merchant accounts and monitor their performance
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Merchants</p>
                  <p className="text-2xl font-bold">{merchants?.length || 0}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Merchants</p>
                  <p className="text-2xl font-bold">{activeMerchants}</p>
                </div>
                <Store className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Platform Fee</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue * 0.025)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search merchants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Merchants Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMerchants.map((merchant) => {
            const stats = getMerchantStats(merchant.id);
            return (
              <motion.div
                key={merchant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="h-full hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedMerchant(merchant)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{merchant.businessName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={merchant.isActive ? 'default' : 'secondary'}>
                            {merchant.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-gray-500">#{merchant.id.slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{merchant.email}</span>
                    </div>

                    {merchant.website && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{merchant.website}</span>
                      </div>
                    )}

                    {merchant.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{merchant.phone}</span>
                      </div>
                    )}

                    {merchant.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{merchant.address}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(stats.completedRevenue)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Transactions</p>
                        <p className="font-bold text-blue-600">{stats.totalTransactions}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Joined {formatDate(merchant.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Merchant Detail Modal */}
        {selectedMerchant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{selectedMerchant.businessName}</CardTitle>
                  <Button variant="outline" onClick={() => setSelectedMerchant(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Business Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Business Name</label>
                        <p className="font-medium">{selectedMerchant.businessName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p>{selectedMerchant.email}</p>
                      </div>
                      {selectedMerchant.website && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Website</label>
                          <p>{selectedMerchant.website}</p>
                        </div>
                      )}
                      {selectedMerchant.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p>{selectedMerchant.phone}</p>
                        </div>
                      )}
                      {selectedMerchant.address && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          <p>{selectedMerchant.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Performance Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        const stats = getMerchantStats(selectedMerchant.id);
                        return (
                          <>
                            <div className="text-center p-4 border rounded-lg">
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(stats.completedRevenue)}
                              </p>
                              <p className="text-sm text-gray-600">Total Revenue</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">
                                {stats.totalTransactions}
                              </p>
                              <p className="text-sm text-gray-600">Total Transactions</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <p className="text-2xl font-bold text-purple-600">
                                {stats.completedTransactions}
                              </p>
                              <p className="text-sm text-gray-600">Completed</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(stats.avgTransactionValue)}
                              </p>
                              <p className="text-sm text-gray-600">Avg Transaction</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">Account Status</h3>
                  <div className="flex items-center gap-4">
                    <Badge variant={selectedMerchant.isActive ? 'default' : 'secondary'}>
                      {selectedMerchant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Member since {formatDate(selectedMerchant.createdAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
