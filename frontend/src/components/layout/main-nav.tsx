'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import {
  Home,
  ShoppingCart,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Menu,
  LogOut,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

const publicNavItems: NavItem[] = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Shop',
    href: '/shop',
    icon: ShoppingCart,
  },
];

const authNavItems: NavItem[] = [
  {
    title: 'Login',
    href: '/login',
    icon: LogIn,
  },
  {
    title: 'Register',
    href: '/register',
    icon: UserPlus,
  },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartItemCount = getTotalItems();

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    return `/dashboard/${user.role}`;
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isActivePath = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              Scalapay
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isActivePath(item.href)
                    ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Cart Button */}
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  {/* Dashboard Link */}
                  <Link href={getDashboardLink()}>
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          <Badge variant="secondary" className="w-fit mt-1">
                            {user.role}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={getDashboardLink()}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      {user?.role === 'customer' && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/customer/profile">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  {authNavItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={item.title === 'Register' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          item.title === 'Register'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                            : ''
                        }
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.title}
                      </Button>
                    </Link>
                  ))}
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Scalapay
                      </span>
                    </SheetTitle>
                    <SheetDescription className="text-left">
                      Navigate through our platform
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex flex-col gap-4 mt-6">
                    {/* User Info */}
                    {user && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <Badge variant="secondary" className="w-fit mt-1">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <div className="space-y-2">
                      {publicNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors w-full',
                            isActivePath(item.href)
                              ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.title}
                        </Link>
                      ))}

                      {user ? (
                        <Link
                          href={getDashboardLink()}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors w-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          Dashboard
                        </Link>
                      ) : (
                        authNavItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors w-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <item.icon className="w-5 h-5" />
                            {item.title}
                          </Link>
                        ))
                      )}
                    </div>

                    {/* Mobile Actions */}
                    {user && (
                      <div className="pt-4 border-t">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          Log out
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
