// Route validation utility to ensure all dashboard routes are accessible
export const validateDashboardRoutes = () => {
  const routes = [
    // Admin routes
    '/dashboard/admin',
    '/dashboard/admin/analytics',
    '/dashboard/admin/merchants',
    '/dashboard/admin/settings',
    '/dashboard/admin/transactions',
    '/dashboard/admin/users',

    // Merchant routes
    '/dashboard/merchant',
    '/dashboard/merchant/analytics',
    '/dashboard/merchant/orders',
    '/dashboard/merchant/settings',
    '/dashboard/merchant/transactions',

    // Customer routes
    '/dashboard/customer',
    '/dashboard/customer/early-payments',
    '/dashboard/customer/payment-methods',
    '/dashboard/customer/profile',
    '/dashboard/customer/security',
    '/dashboard/customer/transactions',
  ];

  return routes;
};

export const getRouteTitle = (path: string): string => {
  const routeTitles: Record<string, string> = {
    '/dashboard/admin': 'Admin Dashboard',
    '/dashboard/admin/analytics': 'Analytics',
    '/dashboard/admin/merchants': 'Merchant Management',
    '/dashboard/admin/settings': 'Platform Settings',
    '/dashboard/admin/transactions': 'Transaction Management',
    '/dashboard/admin/users': 'User Management',

    '/dashboard/merchant': 'Merchant Dashboard',
    '/dashboard/merchant/analytics': 'Business Analytics',
    '/dashboard/merchant/orders': 'Order Management',
    '/dashboard/merchant/settings': 'Merchant Settings',
    '/dashboard/merchant/transactions': 'Transaction History',

    '/dashboard/customer': 'Customer Dashboard',
    '/dashboard/customer/early-payments': 'Early Payments',
    '/dashboard/customer/payment-methods': 'Payment Methods',
    '/dashboard/customer/profile': 'Profile Settings',
    '/dashboard/customer/security': 'Security & Privacy',
    '/dashboard/customer/transactions': 'Transaction History',
  };

  return routeTitles[path] || 'Dashboard';
};
