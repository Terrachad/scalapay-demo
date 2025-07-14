'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  GripVertical,
  Star,
  MoreVertical,
  Shield,
  AlertTriangle,
  Calendar,
  Activity,
  Settings,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { PaymentMethod } from '@/services/payment-method-service';
import { usePaymentMethodStore } from '@/store/payment-method-store';

interface PaymentMethodItemProps {
  paymentMethod: PaymentMethod;
  position: number;
  isDefault: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  allowReordering?: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

/**
 * Enterprise Payment Method Item Component
 * Features:
 * - Card brand visualization with proper styling
 * - Risk score indicators with color coding
 * - Usage statistics and last used information
 * - Auto-update status and controls
 * - Security and compliance badges
 * - Comprehensive action menu
 */
export const PaymentMethodItem: React.FC<PaymentMethodItemProps> = ({
  paymentMethod,
  position,
  isDefault,
  isDragging = false,
  dragHandleProps,
  allowReordering = true,
  onSetDefault,
  onDelete,
  onViewDetails,
}) => {
  const { triggerAutoUpdate } = usePaymentMethodStore();
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle auto-update trigger
  const handleAutoUpdate = async () => {
    setIsUpdating(true);
    try {
      await triggerAutoUpdate(paymentMethod.id);
    } catch (error) {
      console.error('Auto-update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get card brand icon and colors
  const getCardBrandInfo = (brand: string) => {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return {
          color: 'bg-blue-600 text-white',
          textColor: 'text-blue-600',
          icon: '💳',
        };
      case 'mastercard':
        return {
          color: 'bg-red-600 text-white',
          textColor: 'text-red-600',
          icon: '💳',
        };
      case 'amex':
      case 'american express':
        return {
          color: 'bg-green-700 text-white',
          textColor: 'text-green-700',
          icon: '💳',
        };
      case 'discover':
        return {
          color: 'bg-orange-600 text-white',
          textColor: 'text-orange-600',
          icon: '💳',
        };
      default:
        return {
          color: 'bg-gray-600 text-white',
          textColor: 'text-gray-600',
          icon: '💳',
        };
    }
  };

  // Get risk level styling
  const getRiskStyling = (riskScore: number) => {
    if (riskScore <= 0.3) {
      return {
        badge: 'bg-green-100 text-green-800 border-green-200',
        text: 'Low Risk',
        color: 'text-green-600',
      };
    } else if (riskScore <= 0.6) {
      return {
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        text: 'Medium Risk',
        color: 'text-yellow-600',
      };
    } else {
      return {
        badge: 'bg-red-100 text-red-800 border-red-200',
        text: 'High Risk',
        color: 'text-red-600',
      };
    }
  };

  // Get status styling
  const getStatusStyling = (status: PaymentMethod['status']) => {
    switch (status) {
      case 'active':
        return { badge: 'bg-green-100 text-green-800', text: 'Active' };
      case 'inactive':
        return { badge: 'bg-gray-100 text-gray-800', text: 'Inactive' };
      case 'expired':
        return { badge: 'bg-red-100 text-red-800', text: 'Expired' };
      case 'pending_verification':
        return { badge: 'bg-yellow-100 text-yellow-800', text: 'Pending' };
      case 'blocked':
        return { badge: 'bg-red-100 text-red-800', text: 'Blocked' };
      default:
        return { badge: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  };

  // Format last used date
  const formatLastUsed = (date?: Date) => {
    if (!date) return 'Never used';

    const now = new Date();
    const lastUsed = new Date(date);
    const diffInDays = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return lastUsed.toLocaleDateString();
  };

  // Check if card is expiring soon
  const isExpiringSoon = () => {
    const now = new Date();
    const expiry = new Date(paymentMethod.expYear, paymentMethod.expMonth - 1);
    const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsUntilExpiry <= 3 && monthsUntilExpiry > 0;
  };

  const brandInfo = getCardBrandInfo(paymentMethod.brand);
  const riskStyling = getRiskStyling(paymentMethod.riskScore);
  const statusStyling = getStatusStyling(paymentMethod.status);
  const expiringSoon = isExpiringSoon();

  return (
    <Card
      className={`transition-all duration-200 ${
        isDragging ? 'shadow-xl ring-2 ring-blue-500 rotate-2' : 'hover:shadow-md'
      } ${isDefault ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          {allowReordering && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}

          {/* Position Badge */}
          <div className="flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              #{position}
            </Badge>
          </div>

          {/* Card Visual */}
          <div className="flex-shrink-0">
            <div
              className={`w-12 h-8 rounded-md flex items-center justify-center ${brandInfo.color}`}
            >
              <CreditCard className="h-4 w-4" />
            </div>
          </div>

          {/* Card Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">
                {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
              </h3>
              {isDefault && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                {expiringSoon && <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />}
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {formatLastUsed(paymentMethod.lastUsed)}
              </span>
              <span>Used {paymentMethod.usageCount} times</span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge className={statusStyling.badge}>{statusStyling.text}</Badge>
              <Badge className={riskStyling.badge}>
                <Shield className="h-3 w-3 mr-1" />
                {riskStyling.text}
              </Badge>
            </div>

            {/* Auto-update indicator */}
            {paymentMethod.autoUpdateData && (
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Auto-update
              </Badge>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>

              {!isDefault && (
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  /* Open restrictions modal */
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Usage Restrictions
              </DropdownMenuItem>

              {paymentMethod.autoUpdateData && (
                <DropdownMenuItem onClick={handleAutoUpdate} disabled={isUpdating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Check for Updates'}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Additional Information */}
        {(paymentMethod.fraudFlags?.length > 0 ||
          expiringSoon ||
          paymentMethod.failureCount > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs">
              {paymentMethod.fraudFlags?.length > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {paymentMethod.fraudFlags.length} fraud flag
                  {paymentMethod.fraudFlags.length !== 1 ? 's' : ''}
                </div>
              )}

              {expiringSoon && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Calendar className="h-3 w-3" />
                  Expires soon
                </div>
              )}

              {paymentMethod.failureCount > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  {paymentMethod.failureCount} recent failure
                  {paymentMethod.failureCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Usage Restrictions Indicator */}
        {paymentMethod.usageRestrictions && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <Badge variant="outline" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Usage restrictions applied
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
