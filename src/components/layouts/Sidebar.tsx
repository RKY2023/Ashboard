'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Lightbulb,
  LayoutGrid,
  Zap,
  Shield,
  Snowflake,
  Bell,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  Users,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { AshboardLogo } from '@/src/components/brand/AshboardLogo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Devices',
    href: '/dashboard/devices',
    icon: Lightbulb,
  },
  {
    label: 'Rooms',
    href: '/dashboard/rooms',
    icon: LayoutGrid,
  },
  {
    label: 'Automation',
    href: '/dashboard/automation',
    icon: Zap,
  },
  {
    label: 'Security',
    href: '/dashboard/security',
    icon: Shield,
  },
  {
    label: 'Energy',
    href: '/dashboard/energy',
    icon: Zap,
  },
  {
    label: 'Climate',
    href: '/dashboard/climate',
    icon: Snowflake,
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    label: 'Grocery',
    href: '/dashboard/grocery',
    icon: ShoppingCart,
  },
  {
    label: 'Recipes',
    href: '/dashboard/recipes',
    icon: UtensilsCrossed,
  },
  {
    label: 'Finance',
    href: '/dashboard/finance',
    icon: Wallet,
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r border-border z-40',
          'flex flex-col transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-[280px]',
          // Mobile styles
          'md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <AshboardLogo size={32} className="text-primary" />
              <span className="font-bold text-lg">Ashboard</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/dashboard" className="mx-auto">
              <AshboardLogo size={36} className="text-primary" />
            </Link>
          )}
          <button
            onClick={onToggle}
            className="hidden md:flex p-2 rounded-lg hover:bg-accent transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg',
                      'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      'transition-colors',
                      isActive && 'bg-primary/10 text-primary font-medium',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <div className="px-4 py-3 rounded-lg bg-accent/50">
              <p className="text-xs text-muted-foreground">
                Home Automation & ERP
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                v0.2.0 - Phase 1
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export function MobileMenuButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
      aria-label="Toggle menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
