"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const products = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    price: 299.99,
    image: "/api/placeholder/300/300",
    rating: 4.5,
    reviews: 128,
    category: "Electronics",
  },
  {
    id: "2",
    name: "Smart Watch Pro",
    price: 399.99,
    image: "/api/placeholder/300/300",
    rating: 4.8,
    reviews: 256,
    category: "Electronics",
  },
  {
    id: "3",
    name: "Designer Handbag",
    price: 899.99,
    image: "/api/placeholder/300/300",
    rating: 4.7,
    reviews: 89,
    category: "Fashion",
  },
  {
    id: "4",
    name: "Running Shoes Ultra",
    price: 179.99,
    image: "/api/placeholder/300/300",
    rating: 4.6,
    reviews: 342,
    category: "Sports",
  },
];

export default function ShopPage() {
  const router = useRouter();
  const [cart, setCart] = useState<typeof products>([]);

  const addToCart = (product: typeof products[0]) => {
    setCart([...cart, product]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scalapay Shop</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push("/checkout")}
            className="relative"
          >
            <ShoppingCart className="mr-2" />
            Cart ({cart.length})
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="aspect-square bg-gray-100 rounded-md mb-4">
                    {/* Image placeholder */}
                  </div>
                  <Badge className="mb-2">{product.category}</Badge>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm ml-1">{product.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({product.reviews} reviews)
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    Or 4x {formatCurrency(product.price / 4)} with Scalapay
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
