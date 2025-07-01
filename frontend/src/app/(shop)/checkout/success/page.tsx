'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transaction-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle, Calendar, CreditCard, Home, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('id');

  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionService.getById(transactionId!),
    enabled: !!transactionId,
  });

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  if (!transactionId) {
    router.push('/shop');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4"
              >
                <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-600" />
              </motion.div>
              <CardTitle className="text-2xl sm:text-3xl">Order Confirmed!</CardTitle>
              <CardDescription className="text-base sm:text-lg">
                Thank you for your purchase. Your order has been successfully placed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {transaction && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Order Number
                    </p>
                    <p className="font-mono font-bold text-base sm:text-lg">
                      #{transaction.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm sm:text-base">Order Details</h3>
                    <div className="space-y-2">
                      {transaction.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs sm:text-sm">
                          <span className="flex-1 min-w-0 pr-2">
                            {item.name} x{item.quantity}
                          </span>
                          <span className="flex-shrink-0">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-sm sm:text-base">
                          <span>Total</span>
                          <span>{formatCurrency(transaction.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Calendar className="w-4 h-4" />
                      Payment Schedule
                    </h3>
                    <div className="space-y-2">
                      {transaction.payments.map((payment, index) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <CreditCard className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm">Payment {index + 1}</p>
                              <p className="text-xs text-gray-600">
                                Due {formatDate(payment.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-xs sm:text-sm">
                              {formatCurrency(payment.amount)}
                            </p>
                            <Badge
                              variant={index === 0 ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {index === 0 ? 'Due Today' : payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                      💡 Your first payment of{' '}
                      <strong>{formatCurrency(transaction.payments[0].amount)}</strong> will be
                      charged today. The remaining payments will be automatically charged on their
                      due dates.
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
                <Link href="/dashboard/customer/transactions" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto text-sm">
                    View Order Details
                  </Button>
                </Link>
                <Link href="/shop" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto text-sm">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
