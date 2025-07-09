'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Star,
  ArrowLeft,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

// Mock product data - in real app this would come from API
const products = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    originalPrice: 349.99,
    images: [
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&h=500&fit=crop&crop=center',
    ],
    rating: 4.5,
    reviews: 128,
    category: 'Electronics',
    isOnSale: true,
    colors: ['#000000', '#ffffff', '#ff0000'],
    description:
      'Experience premium sound quality with these wireless headphones featuring active noise cancellation, 30-hour battery life, and comfortable over-ear design.',
    features: [
      'Active Noise Cancellation',
      '30-hour battery life',
      'Premium drivers',
      'Wireless & Bluetooth 5.0',
      'Fast charging support',
      'Comfortable over-ear design',
    ],
    specifications: {
      'Driver Size': '40mm',
      'Frequency Response': '20Hz - 20kHz',
      'Battery Life': '30 hours',
      'Charging Time': '2 hours',
      Weight: '250g',
      Connectivity: 'Bluetooth 5.0, 3.5mm',
    },
    merchantId: '123e4567-e89b-12d3-a456-426614174000',
  },
  {
    id: '2',
    name: 'Smart Watch Pro',
    price: 399.99,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1579586337278-3f436f5f7669?w=500&h=500&fit=crop&crop=center',
    ],
    rating: 4.8,
    reviews: 256,
    category: 'Electronics',
    isOnSale: false,
    colors: ['#000000', '#c0c0c0'],
    description:
      'Advanced smartwatch with health monitoring, GPS tracking, and seamless smartphone integration.',
    features: [
      'Heart rate monitoring',
      'GPS tracking',
      'Water resistant',
      '7-day battery life',
      'App ecosystem',
      'Always-on display',
    ],
    specifications: {
      Display: '1.4" AMOLED',
      'Battery Life': '7 days',
      'Water Resistance': '50m',
      Sensors: 'Heart rate, GPS, Accelerometer',
      Connectivity: 'Bluetooth, WiFi',
      Compatibility: 'iOS & Android',
    },
    merchantId: '123e4567-e89b-12d3-a456-426614174000',
  },
  {
    id: '3',
    name: 'Designer Handbag',
    price: 899.99,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop&crop=center',
    ],
    rating: 4.7,
    reviews: 89,
    category: 'Fashion',
    isOnSale: false,
    colors: ['#8B4513', '#000000', '#800080'],
    description:
      'Elegant designer handbag crafted from premium materials. Perfect for any occasion with spacious interior and sophisticated design.',
    features: [
      'Premium leather construction',
      'Spacious interior compartments',
      'Adjustable shoulder strap',
      'Gold-plated hardware',
      'Dust bag included',
      'Authentic designer piece',
    ],
    specifications: {
      Material: 'Genuine Leather',
      Dimensions: '12" x 8" x 4"',
      'Strap Drop': '22 inches',
      Interior: 'Fabric lined',
      Closure: 'Magnetic snap',
      Origin: 'Made in Italy',
    },
    merchantId: '123e4567-e89b-12d3-a456-426614174000',
  },
  {
    id: '4',
    name: 'Running Shoes Ultra',
    price: 179.99,
    originalPrice: 229.99,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500&h=500&fit=crop&crop=center',
    ],
    rating: 4.6,
    reviews: 342,
    category: 'Sports',
    isOnSale: true,
    colors: ['#000000', '#ffffff', '#0066cc'],
    description:
      'High-performance running shoes designed for comfort and speed. Advanced cushioning technology and breathable materials.',
    features: [
      'Advanced cushioning system',
      'Breathable mesh upper',
      'Lightweight construction',
      'Durable rubber outsole',
      'Reflective details',
      'Arch support technology',
    ],
    specifications: {
      'Upper Material': 'Breathable mesh',
      'Sole Material': 'Rubber',
      'Heel Drop': '10mm',
      Weight: '280g (size 9)',
      'Arch Support': 'Medium',
      'Recommended Use': 'Road running',
    },
    merchantId: '123e4567-e89b-12d3-a456-426614174000',
  },
  {
    id: '5',
    name: 'Laptop Pro 15"',
    price: 1299.99,
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop&crop=center',
    ],
    rating: 4.9,
    reviews: 445,
    category: 'Electronics',
    isOnSale: false,
    colors: ['#c0c0c0', '#000000'],
    description:
      'Professional laptop with powerful performance, stunning display, and all-day battery life. Perfect for work and creative tasks.',
    features: [
      'High-resolution display',
      'Fast processor',
      'Long battery life',
      'Lightweight design',
      'Fast SSD storage',
      'Multiple connectivity ports',
    ],
    specifications: {
      Processor: 'Intel Core i7',
      RAM: '16GB DDR4',
      Storage: '512GB SSD',
      Display: '15.6" Full HD',
      'Battery Life': '10 hours',
      Weight: '1.8kg',
    },
    merchantId: '123e4567-e89b-12d3-a456-426614174000',
  },
];

export default function ProductPage() {
  const params = useParams();
  const { addItem, getItemQuantity } = useCartStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentCartQuantity = mounted ? getItemQuantity(product.id) : 0;

  const addToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      category: product.category,
      isOnSale: product.isOnSale,
      colors: product.colors,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/shop">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {product.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <Card className="overflow-hidden shadow-elegant border-0">
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                <Image
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {product.isOnSale && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white">SALE</Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-4 right-4 w-8 h-8 p-0 bg-white/80 hover:bg-white"
                >
                  <Heart className="w-4 h-4 text-gray-600" />
                </Button>
              </div>
            </Card>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 relative ${
                      selectedImageIndex === index
                        ? 'border-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Price and Rating */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        i < Math.floor(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs sm:text-sm ml-2 text-gray-600 dark:text-gray-300">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg sm:text-xl text-gray-500 line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                  {product.isOnSale && (
                    <Badge className="bg-red-500 text-white text-xs sm:text-sm">
                      Save {formatCurrency(product.originalPrice! - product.price)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-medium text-primary">
                    or 4x {formatCurrency(product.price / 4)}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">with Scalapay</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Colors</h3>
                <div className="flex gap-3">
                  {product.colors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(index)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor === index
                          ? 'border-primary scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <Card className="p-6 shadow-elegant border-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Quantity</span>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => setQuantity(quantity + 1)}>
                      +
                    </Button>
                  </div>
                </div>

                {currentCartQuantity > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {currentCartQuantity} item(s) already in cart
                  </p>
                )}

                <Button className="w-full button-gradient h-12" onClick={addToCart}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    Wishlist
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>

            {/* Features */}
            <Card className="p-6 shadow-elegant border-0">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Key Features
              </h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Shipping & Returns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-green-700 dark:text-green-300">
                    Free Shipping
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">On orders over $50</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-blue-700 dark:text-blue-300">
                    Warranty
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">2 year coverage</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300">
                    Returns
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">30 day policy</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Specifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12"
        >
          <Card className="shadow-elegant border-0">
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{key}</span>
                    <span className="text-gray-600 dark:text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
