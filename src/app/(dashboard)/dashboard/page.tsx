'use client';

import { useAuth } from '@/src/lib/auth/AuthProvider';
import { trpc } from '@/src/app/providers';
import {
  Lightbulb,
  Shield,
  Zap,
  Wallet,
  ShoppingCart,
  Bell,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const kpis = trpc.reports.kpis.useQuery();
  const securityCurrent = trpc.security.currentMode.useQuery();
  const energySummary = trpc.energy.summary.useQuery({ range: 'week' });
  const expiringGroceries = trpc.groceries.expiring.useQuery({ days: 7 });
  const notifications = trpc.notifications.list.useQuery({
    isRead: false,
    page: 1,
    pageSize: 5,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isArmed =
    securityCurrent.data?.mode && securityCurrent.data.mode !== 'disarmed';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening in your home
          </p>
        </div>
        {(notifications.data?.unread ?? 0) > 0 && (
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
          >
            <Bell className="w-4 h-4" />
            {notifications.data!.unread} unread
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Lightbulb}
          title="Active Devices"
          value={`${kpis.data?.devices.online ?? 0} / ${kpis.data?.devices.total ?? 0}`}
          subtitle="online"
          loading={kpis.isLoading}
          href="/dashboard/devices"
        />
        <Stat
          icon={Zap}
          title="Energy Today"
          value={`${(kpis.data?.energy.todayKwh ?? 0).toFixed(1)} kWh`}
          subtitle={`$${(kpis.data?.energy.todayCost ?? 0).toFixed(2)}`}
          loading={kpis.isLoading}
          href="/dashboard/energy"
        />
        <Stat
          icon={Shield}
          title="Security"
          value={isArmed ? securityCurrent.data?.name ?? 'Armed' : 'Disarmed'}
          subtitle={
            (kpis.data?.security.criticalOpen ?? 0) > 0
              ? `${kpis.data!.security.criticalOpen} critical`
              : `${kpis.data?.security.todayEvents ?? 0} events today`
          }
          loading={securityCurrent.isLoading}
          tone={
            (kpis.data?.security.criticalOpen ?? 0) > 0 ? 'critical' : 'default'
          }
          href="/dashboard/security"
        />
        <Stat
          icon={Wallet}
          title="Net (month)"
          value={`$${(kpis.data?.finance.net ?? 0).toFixed(2)}`}
          subtitle={`Income $${(kpis.data?.finance.monthIncome ?? 0).toFixed(0)} · Expense $${(kpis.data?.finance.monthExpense ?? 0).toFixed(0)}`}
          loading={kpis.isLoading}
          tone={(kpis.data?.finance.net ?? 0) >= 0 ? 'positive' : 'negative'}
          href="/dashboard/finance"
        />
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="widget lg:col-span-2">
          <h3 className="widget-title mb-4">Energy Usage (last 7 days)</h3>
          <div className="h-64">
            {energySummary.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (energySummary.data?.points.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No readings yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={energySummary.data?.points.map((p) => ({
                    bucket: p.bucket,
                    energy: Number(p.energy.toFixed(2)),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="kWh"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="widget">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="widget-title">Pantry Status</h3>
          </div>
          <div className="space-y-3">
            <Row
              label="Total items"
              value={kpis.data?.grocery.total ?? 0}
            />
            <Row
              label="Expiring (7 days)"
              value={kpis.data?.grocery.expiringSoon ?? 0}
              warning={(kpis.data?.grocery.expiringSoon ?? 0) > 0}
            />
            <Row
              label="Low stock"
              value={kpis.data?.grocery.lowStock ?? 0}
              critical={(kpis.data?.grocery.lowStock ?? 0) > 0}
            />
          </div>
          {(expiringGroceries.data?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Expiring soonest
              </p>
              <ul className="space-y-1">
                {expiringGroceries.data!.slice(0, 3).map((e) => (
                  <li
                    key={e._id}
                    className="flex justify-between text-sm"
                  >
                    <span>{e.name}</span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {e.daysLeft}d
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  warning,
  critical,
}: {
  label: string;
  value: number;
  warning?: boolean;
  critical?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-bold',
          critical && 'text-red-600',
          warning && !critical && 'text-yellow-600'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  icon: Icon,
  title,
  value,
  subtitle,
  loading,
  tone,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle?: string;
  loading?: boolean;
  tone?: 'default' | 'positive' | 'negative' | 'critical';
  href?: string;
}) {
  const toneClass =
    tone === 'positive'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
      : tone === 'negative' || tone === 'critical'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
      : 'bg-primary/10 text-primary';

  const content = (
    <div
      className={cn(
        'widget transition-colors',
        href && 'hover:bg-accent/50 cursor-pointer'
      )}
    >
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', toneClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="widget-value">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
