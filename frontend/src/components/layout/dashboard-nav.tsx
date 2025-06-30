"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Users, 
  Settings,
  LogOut,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: Record<string, NavItem[]> = {
  customer: [
    {
      title: "Dashboard",
      href: "/dashboard/customer",
      icon: LayoutDashboard,
      roles: ["customer"],
    },
    {
      title: "Transactions",
      href: "/dashboard/customer/transactions",
      icon: CreditCard,
      roles: ["customer"],
    },
    {
      title: "Shop",
      href: "/shop",
      icon: ShoppingCart,
      roles: ["customer"],
    },
  ],
  merchant: [
    {
      title: "Dashboard",
      href: "/dashboard/merchant",
      icon: LayoutDashboard,
      roles: ["merchant"],
    },
    {
      title: "Transactions",
      href: "/dashboard/merchant/transactions",
      icon: CreditCard,
      roles: ["merchant"],
    },
    {
      title: "Analytics",
      href: "/dashboard/merchant/analytics",
      icon: BarChart3,
      roles: ["merchant"],
    },
    {
      title: "Store Settings",
      href: "/dashboard/merchant/settings",
      icon: Store,
      roles: ["merchant"],
    },
  ],
  admin: [
    {
      title: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
      roles: ["admin"],
    },
    {
      title: "Users",
      href: "/dashboard/admin/users",
      icon: Users,
      roles: ["admin"],
    },
    {
      title: "Merchants",
      href: "/dashboard/admin/merchants",
      icon: Store,
      roles: ["admin"],
    },
    {
      title: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      title: "Settings",
      href: "/dashboard/admin/settings",
      icon: Settings,
      roles: ["admin"],
    },
  ],
};

export function DashboardNav({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const userNavItems = navItems[user?.role || 'customer'] || [];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-purple-600">
              Scalapay
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {userNavItems.map((item: NavItem) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
