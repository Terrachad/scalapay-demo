'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Plus, Shield, AlertTriangle, Activity, Calendar } from 'lucide-react';
import { usePaymentMethodStore } from '@/store/payment-method-store';
import { PaymentMethod, CardOrder } from '@/services/payment-method-service';
import { PaymentMethodItem } from './payment-method-item';
import { AddPaymentMethodModal } from './add-payment-method-modal';
import { PaymentMethodDetailsModal } from './payment-method-details-modal';

interface PaymentMethodListProps {
  userId: string;
  allowReordering?: boolean;
  maxCards?: number;
  showAnalytics?: boolean;
  showSecurityOverview?: boolean;
  className?: string;
}

/**
 * Enterprise Payment Method List Component
 * Features:
 * - Drag-and-drop card reordering
 * - 10-card limit management
 * - Real-time risk scoring display
 * - Usage analytics and insights
 * - Auto-update status indicators
 * - Comprehensive card management
 */
export const PaymentMethodList: React.FC<PaymentMethodListProps> = ({
  userId,
  allowReordering = true,
  maxCards = 10,
  showAnalytics = true,
  showSecurityOverview = false,
  className = '',
}) => {
  // Store state
  const {
    summary,
    isLoading,
    isReordering,
    error,
    fetchPaymentMethods,
    fetchSummary,
    reorderPaymentMethods,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    canAddMoreCardsSync,
    getTotalCardCount,
    getPaymentMethodsByPosition,
    setIsReordering,
    clearError,
  } = usePaymentMethodStore();

  // Local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PaymentMethod | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Initialize data
  useEffect(() => {
    fetchPaymentMethods(userId);
    fetchSummary(userId);
  }, [userId, fetchPaymentMethods, fetchSummary]);

  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    // No destination or same position
    if (!destination || destination.index === source.index) {
      return;
    }

    const orderedMethods = getPaymentMethodsByPosition();
    const reorderedMethods = Array.from(orderedMethods);
    const [reorderedItem] = reorderedMethods.splice(source.index, 1);
    reorderedMethods.splice(destination.index, 0, reorderedItem);

    // Create new order mapping
    const newOrder: CardOrder[] = reorderedMethods.map((method, index) => ({
      id: method.id,
      position: index + 1,
    }));

    try {
      setIsReordering(true);
      await reorderPaymentMethods(newOrder);
    } catch (error) {
      console.error('Failed to reorder cards:', error);
    } finally {
      setIsReordering(false);
    }
  };

  // Handle setting default card
  const handleSetDefault = async (cardId: string) => {
    try {
      await setDefaultPaymentMethod(cardId);
    } catch (error) {
      console.error('Failed to set default card:', error);
    }
  };

  // Handle card deletion
  const handleDeleteCard = async (cardId: string) => {
    try {
      await deletePaymentMethod(cardId);
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  // Handle card details view
  const handleViewDetails = (card: PaymentMethod) => {
    setSelectedCard(card);
    setShowDetailsModal(true);
  };

  // Calculate security score for display
  const getSecurityScore = () => {
    if (!summary) return 0;

    let score = 0;
    const totalMethods = summary.totalMethods;

    // Base score from having cards
    score += Math.min(totalMethods * 10, 40);

    // Risk distribution bonus - with null safety
    const { riskDistribution } = summary;
    if (riskDistribution) {
      score +=
        riskDistribution.low * 0.3 + riskDistribution.medium * 0.2 + riskDistribution.high * 0.1;
    }

    // Auto-update eligible bonus
    if (totalMethods > 0) {
      score += (summary.autoUpdateEligible / totalMethods) * 20;
    }

    return Math.round(Math.min(score, 100));
  };

  const orderedMethods = getPaymentMethodsByPosition();
  const canAddMore = canAddMoreCardsSync();
  const securityScore = getSecurityScore();

  if (isLoading && orderedMethods.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-sm text-gray-600">
            {getTotalCardCount()} of {maxCards} cards •{' '}
            {canAddMore ? 'Can add more' : 'Limit reached'}
          </p>
        </div>

        {canAddMore && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        )}
      </div>

      {/* Summary Analytics */}
      {(showAnalytics || showSecurityOverview) && summary && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment Security Overview</h3>
              <Badge
                variant={
                  securityScore >= 80
                    ? 'default'
                    : securityScore >= 60
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {securityScore}% Secure
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Security Score</span>
                </div>
                <Progress value={securityScore} className="h-2" />
                <p className="text-xs text-gray-600">{securityScore}/100 security rating</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Active Cards</span>
                </div>
                <div className="text-2xl font-bold">{summary.activeMethodsCount}</div>
                <p className="text-xs text-gray-600">Ready for payments</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Auto-Update</span>
                </div>
                <div className="text-2xl font-bold">{summary.autoUpdateEligible}</div>
                <p className="text-xs text-gray-600">Cards with auto-update</p>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Risk Distribution</span>
              <div className="flex gap-2">
                {summary?.riskDistribution ? (
                  <>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {summary.riskDistribution.low} Low Risk
                    </Badge>
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                      {summary.riskDistribution.medium} Medium Risk
                    </Badge>
                    <Badge variant="outline" className="text-red-700 border-red-300">
                      {summary.riskDistribution.high} High Risk
                    </Badge>
                  </>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                    No risk data available
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Methods List */}
      <div className="space-y-4">
        {orderedMethods.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
            <p className="text-gray-600 mb-4">
              Add your first payment method to start making purchases with flexible payment plans.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Card
            </Button>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable
              droppableId="payment-methods"
              isDropDisabled={!allowReordering || isReordering}
            >
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                >
                  {orderedMethods.map((method, index) => (
                    <Draggable
                      key={method.id}
                      draggableId={method.id}
                      index={index}
                      isDragDisabled={!allowReordering || isReordering}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <PaymentMethodItem
                            paymentMethod={method}
                            position={index + 1}
                            isDefault={method.isDefault}
                            isDragging={snapshot.isDragging}
                            dragHandleProps={provided.dragHandleProps}
                            allowReordering={allowReordering && !isReordering}
                            onSetDefault={() => handleSetDefault(method.id)}
                            onDelete={() => handleDeleteCard(method.id)}
                            onViewDetails={() => handleViewDetails(method)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Add Card Placeholder */}
        {canAddMore && orderedMethods.length > 0 && (
          <Card
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => setShowAddModal(true)}
          >
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Add another payment method</p>
                <p className="text-xs text-gray-500">
                  {maxCards - getTotalCardCount()} slots remaining
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddPaymentMethodModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        userId={userId}
        currentCount={getTotalCardCount()}
        maxCards={maxCards}
      />

      <PaymentMethodDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        paymentMethod={selectedCard}
      />
    </div>
  );
};
