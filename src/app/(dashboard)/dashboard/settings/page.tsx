'use client';

import { useAuth } from '@/src/lib/auth/AuthProvider';
import { User, Home, Bell, Shield, Palette, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  const settingSections = [
    {
      title: 'Profile',
      description: 'Manage your personal information',
      icon: User,
      href: '/dashboard/settings/profile',
    },
    {
      title: 'Household',
      description: 'Manage household settings and members',
      icon: Home,
      href: '/dashboard/settings/household',
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences',
      icon: Bell,
      href: '/dashboard/settings/notifications',
    },
    {
      title: 'Security',
      description: 'Password, sessions, and security options',
      icon: Shield,
      href: '/dashboard/settings/security',
    },
    {
      title: 'Appearance',
      description: 'Theme, display, and accessibility',
      icon: Palette,
      href: '/dashboard/settings/appearance',
    },
    {
      title: 'Integrations',
      description: 'Connect third-party services',
      icon: Globe,
      href: '/dashboard/settings/integrations',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Summary */}
      <div className="widget flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{user?.name}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <button className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
          Edit Profile
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingSections.map((section) => (
          <a
            key={section.title}
            href={section.href}
            className="widget card-hover flex items-start gap-4"
          >
            <div className="p-2 rounded-lg bg-accent">
              <section.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium">{section.title}</h3>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="widget border-destructive/50">
        <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Irreversible and destructive actions
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
