'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Tag,
  Heart,
  Package,
  MoreVertical,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } =
    useCartStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClearCart = () => {
    if (showClearConfirm) {
      clearCart();
      setShowClearConfirm(false);
      toast({
        title: "Cart cleared",
        description: `All ${totalItems} items have been removed from your cart.`,
      });
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000); // Auto-hide after 3 seconds
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const shipping = 0; // Free shipping
  const tax = totalPrice * 0.1; // 10% tax for demo
  const finalTotal = totalPrice + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="container mx-auto px-4 py-4">
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="flex items-center justify-between">
                <Link href="/shop">
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    <span className="text-sm">Shop</span>
                  </Button>
                </Link>
                
                <div className="flex items-center space-x-2 flex-1 justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h1 className="text-lg font-bold gradient-text">Cart</h1>
                </div>
                
                <div className="flex-shrink-0 w-16"></div> {/* Spacer for balance */}
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/shop">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Button>
                </Link>
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl font-bold gradient-text">Shopping Cart</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Empty Cart */}
        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingCart className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Your cart is empty
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Discover amazing products and start shopping with flexible payments
            </p>
            <Link href="/shop">
              <Button className="button-gradient">
                <Package className="w-4 h-4 mr-2" />
                Start Shopping
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <Link href="/shop">
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  <span className="text-sm">Shop</span>
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2 flex-1 justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold gradient-text">Cart</h1>
                <Badge variant="secondary" className="text-xs">
                  {totalItems}
                </Badge>
              </div>
              
              <Button
                variant={showClearConfirm ? "destructive" : "outline"}
                size="sm"
                onClick={handleClearCart}
                className={`${showClearConfirm ? "animate-pulse" : "text-red-600 hover:text-red-700 hover:bg-red-50"} transition-all duration-200 flex-shrink-0`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="ml-1 text-xs">{showClearConfirm ? "Confirm" : "Clear"}</span>
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/shop">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">Shopping Cart</h1>
                <Badge variant="secondary" className="ml-2">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </Badge>
              </div>
            </div>

            <Button
              variant={showClearConfirm ? "destructive" : "outline"}
              onClick={handleClearCart}
              className={`${showClearConfirm ? "animate-pulse" : "text-red-600 hover:text-red-700 hover:bg-red-50"} transition-all duration-200`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showClearConfirm ? "Click to Confirm" : "Clear Cart"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 sm:space-y-4"
            >
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="card-hover shadow-elegant border-0 overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex gap-4 sm:gap-6">
                        {/* Product Image */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl flex-shrink-0 relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/api/placeholder/300/300';
                            }}
                          />
                          {item.isOnSale && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                              SALE
                            </Badge>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <Badge variant="secondary" className="mb-1 sm:mb-2 text-xs">
                                {item.category}
                              </Badge>
                              <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                                {item.name}
                              </h3>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Colors */}
                          {item.colors && item.colors.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                Colors:
                              </span>
                              {item.colors.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full border-2 border-gray-200"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Price and Quantity */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(item.price)}
                                </span>
                                {item.originalPrice && (
                                  <span className="text-sm sm:text-lg text-gray-500 line-through">
                                    {formatCurrency(item.originalPrice)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-primary">
                                  or 4x {formatCurrency(item.price / 4)}
                                </span>
                                <span className="text-xs text-gray-500">with Scalapay</span>
                              </div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(item.id, parseInt(e.target.value) || 1)
                                }
                                className="w-12 sm:w-16 text-center text-sm"
                                min="1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                              Subtotal: {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:sticky lg:top-24"
            >
              <Card className="shadow-elegant border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        Subtotal ({totalItems} items)
                      </span>
                      <span className="font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Shipping</span>
                      <span className="font-medium text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Tax</span>
                      <span className="font-medium">{formatCurrency(tax)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(finalTotal)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      or 4x {formatCurrency(finalTotal / 4)} interest-free
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      className="w-full button-gradient h-12"
                      onClick={() => router.push('/checkout')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to Checkout
                    </Button>

                    <Link href="/shop" className="block">
                      <Button variant="outline" className="w-full h-12">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>

                  {/* Payment Options */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm sm:text-base text-gray-900 dark:text-white">
                      Payment Options
                    </h4>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span>Pay in 2 installments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span>Pay in 3 installments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                        <span>Pay in 4 installments</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
