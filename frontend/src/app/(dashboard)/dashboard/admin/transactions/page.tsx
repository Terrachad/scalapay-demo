'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  Building2,
  Eye,
  MoreHorizontal
} from 'lucide-react';

export default function AdminTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: adminService.getAllTransactions,
  });

  const approveTransactionMutation = useMutation({
    mutationFn: (transactionId: string) => adminService.approveTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      toast({
        title: "Transaction Approved",
        description: "Transaction has been approved and will be processed.",
      });
    },
  });

  const rejectTransactionMutation = useMutation({
    mutationFn: (transactionId: string) => adminService.rejectTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      toast({
        title: "Transaction Rejected",
        description: "Transaction has been rejected and cancelled.",
      });
    },
  });

  const filteredTransactions = transactions?.filter(transaction => {
    const customerName = transaction.user?.name || 'Unknown';
    const merchantName = transaction.merchant?.businessName || transaction.merchant?.name || 'Unknown';
    
    const matchesSearch = 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter && statusFilter !== '') {
      return matchesSearch && transaction.status === statusFilter;
    }
    
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'processing': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const canApprove = (transaction: any) => {
    return transaction.status === 'pending' || transaction.status === 'processing';
  };

  const canReject = (transaction: any) => {
    return transaction.status === 'pending' || transaction.status === 'processing';
  };

  const handleApprove = (transactionId: string) => {
    approveTransactionMutation.mutate(transactionId);
  };

  const handleReject = (transactionId: string) => {
    rejectTransactionMutation.mutate(transactionId);
  };

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

  const pendingCount = transactions?.filter(t => t.status === 'pending').length || 0;
  const processingCount = transactions?.filter(t => t.status === 'processing').length || 0;
  const totalVolume = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">Transaction Management</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Scalapay transaction approval and risk management system</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions?.length || 0}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-orange-600">{processingCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Volume</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalVolume)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('pending')}
                  size="sm"
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'processing' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('processing')}
                  size="sm"
                >
                  Processing
                </Button>
                <Button
                  variant={statusFilter === 'completed' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('completed')}
                  size="sm"
                >
                  Completed
                </Button>
                <Button
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('failed')}
                  size="sm"
                >
                  Failed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">#{transaction.id.slice(-8)}</h3>
                            <Badge className={getStatusColor(transaction.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(transaction.status)}
                                {transaction.status}
                              </div>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{transaction.user?.name || 'Unknown Customer'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{transaction.merchant?.businessName || transaction.merchant?.name || 'Unknown Merchant'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(transaction.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <Badge variant="outline">
                          {transaction.paymentPlan}
                        </Badge>
                        {transaction.riskScore && (
                          <Badge variant={transaction.riskScore > 70 ? 'destructive' : 'secondary'}>
                            Risk: {transaction.riskScore}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      
                      {canApprove(transaction) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(transaction.id)}
                          disabled={approveTransactionMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      
                      {canReject(transaction) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(transaction.id)}
                          disabled={rejectTransactionMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction Details</CardTitle>
                  <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Transaction Info</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                        <p className="font-mono">{selectedTransaction.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Amount</label>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(selectedTransaction.amount)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge className={getStatusColor(selectedTransaction.status)}>
                          {selectedTransaction.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Plan</label>
                        <p>{selectedTransaction.paymentPlan}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created</label>
                        <p>{formatDate(selectedTransaction.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Risk Assessment</h3>
                    <div className="space-y-3">
                      {selectedTransaction.riskScore && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Risk Score</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${selectedTransaction.riskScore > 70 ? 'bg-red-500' : selectedTransaction.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${selectedTransaction.riskScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{selectedTransaction.riskScore}%</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Customer</label>
                        <div className="space-y-1">
                          <p className="font-medium">{selectedTransaction.user?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{selectedTransaction.user?.email || 'No email'}</p>
                          {selectedTransaction.user?.creditLimit && (
                            <p className="text-sm text-gray-500">
                              Credit: {formatCurrency(parseFloat(selectedTransaction.user.availableCredit || '0'))} / 
                              {formatCurrency(parseFloat(selectedTransaction.user.creditLimit || '0'))}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Merchant</label>
                        <div className="space-y-1">
                          <p className="font-medium">{selectedTransaction.merchant?.businessName || selectedTransaction.merchant?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{selectedTransaction.merchant?.email || 'No email'}</p>
                          {selectedTransaction.merchant?.feePercentage && (
                            <p className="text-sm text-gray-500">Fee: {selectedTransaction.merchant.feePercentage}%</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items/Products Section */}
                {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Items Purchased</h3>
                    <div className="space-y-3">
                      {selectedTransaction.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.price)}</p>
                            <p className="text-sm text-gray-600">
                              Total: {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Amount:</span>
                          <span className="text-lg text-green-600">{formatCurrency(selectedTransaction.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Schedule Section */}
                {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Payment Schedule</h3>
                    <div className="space-y-3">
                      {selectedTransaction.payments.map((payment: any, index: number) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">Payment #{payment.installmentNumber || index + 1}</p>
                            <p className="text-sm text-gray-600">
                              Due: {formatDate(payment.dueDate)}
                            </p>
                            {payment.paymentDate && (
                              <p className="text-sm text-green-600">
                                Paid: {formatDate(payment.paymentDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <Badge 
                              variant={
                                payment.status === 'completed' ? 'default' : 
                                payment.status === 'failed' ? 'destructive' : 
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(canApprove(selectedTransaction) || canReject(selectedTransaction)) && (
                  <div className="flex gap-4 pt-4 border-t">
                    {canApprove(selectedTransaction) && (
                      <Button
                        onClick={() => {
                          handleApprove(selectedTransaction.id);
                          setSelectedTransaction(null);
                        }}
                        disabled={approveTransactionMutation.isPending}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Transaction
                      </Button>
                    )}
                    {canReject(selectedTransaction) && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleReject(selectedTransaction.id);
                          setSelectedTransaction(null);
                        }}
                        disabled={rejectTransactionMutation.isPending}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Transaction
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}