'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/lib/auth/AuthProvider';
import {
  Bell,
  Search,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Check,
} from 'lucide-react';
import { MobileMenuButton } from './Sidebar';

interface HeaderProps {
  isCollapsed: boolean;
  onMobileMenuOpen: () => void;
}

export function Header({ isCollapsed, onMobileMenuOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const {
    user,
    households,
    currentHouseholdId,
    selectHousehold,
    logout,
  } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHouseholdMenu, setShowHouseholdMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentHousehold = households.find(h => h._id === currentHouseholdId);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-background/95 backdrop-blur border-b border-border z-30',
        'flex items-center justify-between px-4 md:px-6',
        'transition-all duration-300',
        isCollapsed ? 'md:left-20' : 'md:left-[280px]',
        'left-0'
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        <MobileMenuButton onClick={onMobileMenuOpen} />

        {/* Household selector */}
        {households.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowHouseholdMenu(!showHouseholdMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                {currentHousehold?.name || 'Select Household'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showHouseholdMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowHouseholdMenu(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {households.map((household) => (
                      <button
                        key={household._id}
                        onClick={() => {
                          selectHousehold(household._id);
                          setShowHouseholdMenu(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm',
                          'hover:bg-accent transition-colors',
                          household._id === currentHouseholdId && 'bg-accent'
                        )}
                      >
                        <span>{household.name}</span>
                        {household._id === currentHouseholdId && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-muted-foreground"
          />
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-accent transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No new notifications
                  </p>
                </div>
                <div className="p-2 border-t border-border">
                  <Link
                    href="/dashboard/notifications"
                    className="block w-full text-center text-sm text-primary hover:underline py-2"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="hidden md:inline text-sm font-medium">
              {user?.name}
            </span>
            <ChevronDown className="hidden md:inline w-4 h-4" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <p className="font-medium text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
