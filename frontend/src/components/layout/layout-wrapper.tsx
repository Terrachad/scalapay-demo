'use client';

import { usePathname } from 'next/navigation';
import { MainNav } from './main-nav';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // Don't show MainNav on dashboard pages since they have their own DashboardNav
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <>
      {!isDashboard && <MainNav />}
      {children}
    </>
  );
}
