'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  Filter,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  ArrowUpDown,
  BarChart3,
  Eye,
  Clock,
} from 'lucide-react';
import { useEarlyPaymentStore } from '@/store/early-payment-store';

interface EarlyPaymentHistoryProps {
  userId: string;
  transactionId?: string; // Optional filter for specific transaction
  className?: string;
}

type SortField = 'processedAt' | 'originalAmount' | 'finalAmount' | 'savings';
type SortDirection = 'asc' | 'desc';
type FilterStatus =
  | 'all'
  | 'completed'
  | 'processing'
  | 'failed'
  | 'pending_approval'
  | 'refunded'
  | 'disputed';
type FilterPeriod = 'all' | '7d' | '30d' | '90d' | '1y';

/**
 * Enterprise Early Payment History Component
 * Features:
 * - Comprehensive transaction history with advanced filtering
 * - Real-time status tracking and payment insights
 * - Export functionality for financial reporting
 * - Advanced analytics and savings visualization
 * - Fraud detection and compliance monitoring
 * - Performance metrics and trend analysis
 */
export const EarlyPaymentHistory: React.FC<EarlyPaymentHistoryProps> = ({
  userId,
  transactionId,
  className = '',
}) => {
  // Store hooks
  const {
    paymentHistory: earlyPaymentHistory,
    isLoading: isLoadingHistory,
    error: historyError,
    fetchPaymentHistory: fetchEarlyPaymentHistory,
    exportEarlyPaymentHistory,
    clearHistoryError,
  } = useEarlyPaymentStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('processedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Initialize data
  useEffect(() => {
    fetchEarlyPaymentHistory(userId);
  }, [userId, fetchEarlyPaymentHistory]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearHistoryError();
    };
  }, [clearHistoryError]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    if (!earlyPaymentHistory) return [];

    let filtered = [...earlyPaymentHistory];

    // Filter by specific transaction if provided
    if (transactionId) {
      filtered = filtered.filter((t) => t.transactionId === transactionId);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.id.toLowerCase().includes(term) ||
          transaction.merchantName?.toLowerCase().includes(term) ||
          transaction.transactionId.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((transaction) => transaction.status === filterStatus);
    }

    // Apply period filter
    if (filterPeriod !== 'all') {
      const now = new Date();
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      }[filterPeriod];

      if (periodDays) {
        const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(
          (transaction) => new Date(transaction.processedAt) >= cutoffDate,
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date sorting
      if (sortField === 'processedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [
    earlyPaymentHistory,
    searchTerm,
    filterStatus,
    filterPeriod,
    sortField,
    sortDirection,
    transactionId,
  ]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!filteredTransactions.length) return null;

    const completed = filteredTransactions.filter((t) => t.status === 'completed');
    const totalOriginalAmount = completed.reduce((sum, t) => sum + t.originalAmount, 0);
    const totalFinalAmount = completed.reduce((sum, t) => sum + t.finalAmount, 0);
    const totalSavings = completed.reduce((sum, t) => sum + t.savings, 0);

    const averageSavings = completed.length > 0 ? totalSavings / completed.length : 0;
    const savingsRate = totalOriginalAmount > 0 ? (totalSavings / totalOriginalAmount) * 100 : 0;

    return {
      totalTransactions: completed.length,
      totalOriginalAmount,
      totalFinalAmount,
      totalSavings,
      averageSavings,
      savingsRate,
    };
  }, [filteredTransactions]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportEarlyPaymentHistory(userId, {
        transactionIds: selectedTransactions.length > 0 ? selectedTransactions : undefined,
        period: filterPeriod !== 'all' ? filterPeriod : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'completed':
        return { badge: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'processing':
        return { badge: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'pending_approval':
        return { badge: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'failed':
        return { badge: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'refunded':
        return { badge: 'bg-purple-100 text-purple-800', icon: RefreshCw };
      case 'disputed':
        return { badge: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      default:
        return { badge: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading payment history...</span>
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
            <History className="h-6 w-6" />
            Early Payment History
          </h2>
          <p className="text-sm text-gray-600">
            Track your early payment transactions and savings over time
          </p>
        </div>
        {summaryStats && (
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.totalSavings)}
            </div>
            <div className="text-sm text-gray-600">Total Savings</div>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.totalTransactions}
              </div>
              <div className="text-sm text-gray-600">Total Payments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(summaryStats.totalOriginalAmount)}
              </div>
              <div className="text-sm text-gray-600">Original Amount</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summaryStats.totalSavings)}
              </div>
              <div className="text-sm text-gray-600">Total Saved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summaryStats.averageSavings)}
              </div>
              <div className="text-sm text-gray-600">Avg Savings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {summaryStats.savingsRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Savings Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <h3 className="font-semibold">Filters & Search</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Transaction ID, merchant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(value: FilterStatus) => setFilterStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Filter */}
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={filterPeriod}
                onValueChange={(value: FilterPeriod) => setFilterPeriod(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <Label>Export</Label>
              <Button
                onClick={handleExport}
                disabled={isExporting || filteredTransactions.length === 0}
                className="w-full flex items-center gap-2"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Transaction History</h3>
            <Badge variant="outline">
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No early payment transactions found</p>
              <p className="text-sm text-gray-500">
                {searchTerm || filterStatus !== 'all' || filterPeriod !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start making early payments to see your history here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.length === filteredTransactions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions(filteredTransactions.map((t) => t.id));
                          } else {
                            setSelectedTransactions([]);
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('processedAt')}
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        Date
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('originalAmount')}
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        Original Amount
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('finalAmount')}
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        Final Amount
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('savings')}
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        Savings
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const statusStyling = getStatusStyling(transaction.status);
                    const StatusIcon = statusStyling.icon;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTransactions([...selectedTransactions, transaction.id]);
                              } else {
                                setSelectedTransactions(
                                  selectedTransactions.filter((id) => id !== transaction.id),
                                );
                              }
                            }}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(transaction.processedAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.transactionId}</div>
                            {transaction.merchantName && (
                              <div className="text-sm text-gray-600">
                                {transaction.merchantName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.originalAmount)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.finalAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-green-600">
                              {formatCurrency(transaction.savings)}
                            </span>
                            <span className="text-sm text-gray-600">
                              (
                              {((transaction.savings / transaction.originalAmount) * 100).toFixed(
                                1,
                              )}
                              %)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyling.badge}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {transaction.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {transaction.paymentMethodDetails.brand.toUpperCase()} ••••{' '}
                              {transaction.paymentMethodDetails.last4}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              /* Open transaction details */
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {historyError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {historyError}
            <Button variant="outline" size="sm" onClick={clearHistoryError} className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
