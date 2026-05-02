'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bell,
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Camera,
  DoorOpen,
  Activity,
  Flame,
  Droplet,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CamerasTab } from '@/src/components/security/CamerasTab';
import { AccessLogTab } from '@/src/components/security/AccessLogTab';

type Tab = 'events' | 'cameras' | 'access';

type Severity = 'info' | 'warning' | 'alert' | 'critical';

const severityStyles: Record<Severity, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  info: { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: Info },
  warning: {
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    icon: AlertTriangle,
  },
  alert: {
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    icon: AlertCircle,
  },
  critical: {
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    icon: ShieldAlert,
  },
};

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  motion: Activity,
  door: DoorOpen,
  window: DoorOpen,
  alarm: Bell,
  tamper: AlertCircle,
  smoke: Flame,
  co: Flame,
  water: Droplet,
};

export default function SecurityPage() {
  const [filterAck, setFilterAck] = useState<'all' | 'unack'>('all');
  const [tab, setTab] = useState<Tab>('events');

  const currentMode = trpc.security.currentMode.useQuery();
  const modes = trpc.security.listModes.useQuery();
  const stats = trpc.security.stats.useQuery();
  const events = trpc.security.listEvents.useQuery({
    page: 1,
    pageSize: 25,
    isAcknowledged: filterAck === 'unack' ? false : undefined,
  });

  const utils = trpc.useUtils();
  const activate = trpc.security.activateMode.useMutation({
    onSuccess: (data) => {
      toast.success(data.msg);
      utils.security.currentMode.invalidate();
      utils.security.listModes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const disarm = trpc.security.disarm.useMutation({
    onSuccess: (data) => {
      toast.success(data.msg);
      utils.security.currentMode.invalidate();
      utils.security.listModes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const acknowledge = trpc.security.acknowledge.useMutation({
    onSuccess: () => {
      utils.security.listEvents.invalidate();
      utils.security.stats.invalidate();
    },
  });

  const isArmed = currentMode.data?.mode && currentMode.data.mode !== 'disarmed';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-muted-foreground">
          Monitor and manage your home&apos;s security system
        </p>
      </div>

      <div className="widget">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-4 rounded-full',
                isArmed
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              {isArmed ? (
                <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : (
                <Shield className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Mode</p>
              <h2 className="text-2xl font-bold capitalize">
                {currentMode.isLoading ? '…' : currentMode.data?.name ?? 'Disarmed'}
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                {currentMode.data?.mode ?? 'disarmed'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {modes.data?.map((m) => (
              <button
                key={m._id}
                onClick={() => activate.mutate({ modeId: m._id })}
                disabled={activate.isPending}
                className={cn(
                  'px-4 py-2 rounded-lg border border-border text-sm font-medium transition-colors',
                  m.isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-accent'
                )}
              >
                {m.name}
              </button>
            ))}
            {isArmed && (
              <button
                onClick={() => disarm.mutate()}
                disabled={disarm.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Disarm
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
        <StatCard
          icon={Bell}
          title="Events Today"
          value={stats.data?.todayCount ?? 0}
          tone="default"
          loading={stats.isLoading}
        />
        <StatCard
          icon={AlertCircle}
          title="Unacknowledged"
          value={stats.data?.unacknowledged ?? 0}
          tone={
            (stats.data?.unacknowledged ?? 0) > 0 ? 'warning' : 'default'
          }
          loading={stats.isLoading}
        />
        <StatCard
          icon={ShieldAlert}
          title="Critical Open"
          value={stats.data?.criticalUnacknowledged ?? 0}
          tone={
            (stats.data?.criticalUnacknowledged ?? 0) > 0 ? 'critical' : 'default'
          }
          loading={stats.isLoading}
        />
      </div>

      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {([
          { id: 'events', label: 'Events', icon: Bell },
          { id: 'cameras', label: 'Cameras', icon: Camera },
          { id: 'access', label: 'Access Log', icon: KeyRound },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors',
              tab === id ? 'bg-background shadow' : 'hover:bg-background/50'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="widget">
          <div className="flex items-center justify-between mb-4">
            <h3 className="widget-title">Event Timeline</h3>
            <div className="flex gap-1 p-1 bg-accent rounded-lg">
              {(['all', 'unack'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterAck(f)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md capitalize',
                    filterAck === f ? 'bg-background shadow' : 'hover:bg-background/50'
                  )}
                >
                  {f === 'unack' ? 'Unacknowledged' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {events.isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (events.data?.items.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No security events recorded.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.data!.items.map((e) => {
                const styles = severityStyles[e.severity as Severity];
                const EventIcon = eventIcons[e.type] ?? Camera;
                return (
                  <li
                    key={e._id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className={cn('p-2 rounded-lg', styles.color)}>
                      <EventIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium capitalize">{e.type}</span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                            styles.color
                          )}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{e.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(e.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!e.isAcknowledged && (
                      <button
                        onClick={() => acknowledge.mutate({ eventId: e._id })}
                        disabled={acknowledge.isPending}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title="Acknowledge"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'cameras' && <CamerasTab />}
      {tab === 'access' && <AccessLogTab />}
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number | string;
  tone: 'default' | 'warning' | 'critical';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'critical'
      ? 'text-red-600 bg-red-100 dark:bg-red-900/30'
      : tone === 'warning'
      ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      : 'text-primary bg-primary/10';
  return (
    <div className="widget">
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
    </div>
  );
}
