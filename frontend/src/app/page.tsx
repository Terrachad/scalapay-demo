'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Shield,
  Star,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  DollarSign,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-bg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 container mx-auto px-4 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto text-white"
          >
            <div className="flex items-center justify-center space-x-3 mb-6">
              <CreditCard className="w-12 h-12" />
              <h1 className="text-6xl lg:text-7xl font-bold">Scalapay</h1>
            </div>
            <h2 className="text-2xl lg:text-3xl font-light mb-6 text-white/90">
              The Ultimate Buy Now, Pay Later Platform
            </h2>
            <p className="text-xl lg:text-2xl mb-8 text-white/80 max-w-3xl mx-auto">
              Split your purchases into flexible, interest-free installments. Shop smarter, live
              better.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-white/90 font-semibold px-8 py-4 text-lg h-auto shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-purple-600 hover:border-purple-600 font-semibold px-8 py-4 text-lg h-auto transition-all duration-200"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-white/90">4.8/5 Rating</span>
              </div>
              <div className="hidden sm:block text-white/60">•</div>
              <div className="text-white/90">Trusted by 6.5M+ users</div>
            </div>
          </motion.div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm animate-pulse" />
          <div className="absolute bottom-20 right-20 w-20 h-20 bg-white/5 rounded-full backdrop-blur-sm animate-pulse delay-700" />
          <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/5 rounded-full backdrop-blur-sm animate-pulse delay-1000" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Why Choose <span className="gradient-text">Scalapay</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of payments with our innovative BNPL platform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-8 h-full card-hover shadow-elegant border-0">
                  <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Trusted Worldwide</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Join millions of satisfied customers and thousands of merchant partners
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="glass-card p-8 rounded-2xl"
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</h3>
                <p className="text-white/80 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 gradient-bg rounded-full flex items-center justify-center mx-auto shadow-glow">
                    <step.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-white"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Start Shopping?</h2>
            <p className="text-xl mb-10 text-white/90">
              Join millions of users who shop smarter with Scalapay. No fees, no interest, just
              flexibility.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-white/90 font-semibold px-8 py-4 text-lg h-auto shadow-xl"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-purple-600 hover:border-purple-600 font-semibold px-8 py-4 text-lg h-auto transition-all duration-200"
                >
                  Browse Merchants
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: CreditCard,
    title: 'Flexible Payments',
    description:
      'Split your purchase into 2, 3, or 4 interest-free payments with complete transparency',
  },
  {
    icon: ShoppingBag,
    title: 'Shop Anywhere',
    description: 'Available at thousands of online and in-store merchants across all categories',
  },
  {
    icon: TrendingUp,
    title: 'Build Credit',
    description: 'Improve your credit score with responsible payment history and smart spending',
  },
  {
    icon: Shield,
    title: 'Secure & Safe',
    description: 'Bank-level security protects your personal information with advanced encryption',
  },
];

const stats = [
  { icon: Users, value: '6.5M+', label: 'Active Users' },
  { icon: ShoppingBag, value: '8,000+', label: 'Partner Merchants' },
  { icon: DollarSign, value: '$2.5B+', label: 'Transactions Processed' },
];

const howItWorks = [
  {
    icon: CheckCircle,
    title: 'Create Account',
    description:
      'Sign up in minutes with just your email and basic information. No credit check required to get started.',
  },
  {
    icon: Zap,
    title: 'Shop & Select',
    description:
      'Browse your favorite merchants and choose Scalapay at checkout. Get instant approval decisions.',
  },
  {
    icon: CreditCard,
    title: 'Pay Over Time',
    description:
      'Make your first payment today and the rest over time with automated, interest-free installments.',
  },
];
