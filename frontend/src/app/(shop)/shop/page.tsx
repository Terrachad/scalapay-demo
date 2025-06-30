"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Star, CreditCard, Filter, Search, Heart, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import Link from "next/link";

const products = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    price: 299.99,
    originalPrice: 349.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&crop=center",
    rating: 4.5,
    reviews: 128,
    category: "Electronics",
    isOnSale: true,
    colors: ["#000000", "#ffffff", "#ff0000"],
  },
  {
    id: "2",
    name: "Smart Watch Pro",
    price: 399.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop&crop=center",
    rating: 4.8,
    reviews: 256,
    category: "Electronics",
    isOnSale: false,
    colors: ["#000000", "#c0c0c0"],
  },
  {
    id: "3",
    name: "Designer Handbag",
    price: 899.99,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop&crop=center",
    rating: 4.7,
    reviews: 89,
    category: "Fashion",
    isOnSale: false,
    colors: ["#8B4513", "#000000", "#800080"],
  },
  {
    id: "4",
    name: "Running Shoes Ultra",
    price: 179.99,
    originalPrice: 229.99,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop&crop=center",
    rating: 4.6,
    reviews: 342,
    category: "Sports",
    isOnSale: true,
    colors: ["#000000", "#ffffff", "#0066cc"],
  },
  {
    id: "5",
    name: "Laptop Pro 15\"",
    price: 1299.99,
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop&crop=center",
    rating: 4.9,
    reviews: 445,
    category: "Electronics",
    isOnSale: false,
    colors: ["#c0c0c0", "#000000"],
  },
  {
    id: "6",
    name: "Vintage Denim Jacket",
    price: 89.99,
    originalPrice: 119.99,
    image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d8f?w=300&h=300&fit=crop&crop=center",
    rating: 4.4,
    reviews: 67,
    category: "Fashion",
    isOnSale: true,
    colors: ["#4169E1", "#000080", "#87CEEB"],
  },
];

const categories = ["All", "Electronics", "Fashion", "Sports"];

export default function ShopPage() {
  const router = useRouter();
  const { addItem, getTotalItems } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToCart = (product: typeof products[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      isOnSale: product.isOnSale,
      colors: product.colors,
    });
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">Scalapay Shop</h1>
              </div>
            </div>
            
            <Button 
              onClick={() => router.push("/cart")}
              className="button-gradient relative"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart {mounted && `(${getTotalItems()})`}
              {mounted && getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Shop & Pay <span className="gradient-text">Your Way</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Discover amazing products and pay later with flexible installments. No interest, no stress.
          </p>
        </motion.section>

        {/* Search and Filters */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white border-gray-200 focus:border-primary"
              />
            </div>
            
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "button-gradient" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="group card-hover shadow-elegant border-0 overflow-hidden">
                <CardHeader className="p-0 relative">
                  <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {/* Real product image */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/api/placeholder/300/300";
                      }}
                    />
                    
                    {/* Sale badge */}
                    {product.isOnSale && (
                      <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                        SALE
                      </Badge>
                    )}
                    
                    {/* Favorite button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-4 right-4 w-8 h-8 p-0 bg-white/80 hover:bg-white"
                      onClick={() => toggleFavorite(product.id)}
                    >
                      <Heart 
                        className={`w-4 h-4 ${
                          favorites.includes(product.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-gray-600'
                        }`} 
                      />
                    </Button>
                  </div>
                  
                  <div className="p-6 pb-4">
                    <Badge variant="secondary" className="mb-3">
                      {product.category}
                    </Badge>
                    <Link href={`/product/${product.id}`}>
                      <CardTitle className="text-lg mb-2 text-gray-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                        {product.name}
                      </CardTitle>
                    </Link>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                      <span className="text-sm ml-2 text-gray-600 dark:text-gray-300">
                        {product.rating} ({product.reviews})
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    {product.colors?.map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border-2 border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-gray-500 line-through">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        or 4x {formatCurrency(product.price / 4)}
                      </span>
                      <span className="text-xs text-gray-500">with Scalapay</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-6 pb-6">
                  <Button 
                    className="w-full button-gradient group"
                    onClick={() => addToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-xl text-gray-500 dark:text-gray-400">
              No products found matching your criteria.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
