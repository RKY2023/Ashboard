'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/lib/auth/AuthProvider';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      <Header
        isCollapsed={isCollapsed}
        onMobileMenuOpen={() => setIsMobileOpen(true)}
      />
      <main
        className={cn(
          'pt-20 pb-8 px-4 md:px-6',
          'transition-all duration-300',
          isCollapsed ? 'md:ml-20' : 'md:ml-[280px]'
        )}
      >
        {children}
      </main>
    </div>
  );
}
