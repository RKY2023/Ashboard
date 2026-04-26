'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'info' | 'warning' | 'alert' | 'success';

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  alert: AlertCircle,
  success: CheckCircle,
};

const typeStyles: Record<NotificationType, string> = {
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
  alert: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-600',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const list = trpc.notifications.list.useQuery({
    isRead: filter === 'unread' ? false : undefined,
    page: 1,
    pageSize: 100,
  });
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const remove = trpc.notifications.delete.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {list.data?.unread ?? 0} unread
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-accent rounded-lg">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md capitalize',
                  filter === f ? 'bg-background shadow' : 'hover:bg-background/50'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {(list.data?.unread ?? 0) > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {list.isLoading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <div className="widget py-16 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.data!.items.map((n) => {
            const Icon = typeIcons[n.type as NotificationType];
            return (
              <li
                key={n._id}
                className={cn(
                  'widget flex items-start gap-3 transition-colors',
                  !n.isRead && 'border-l-4 border-l-primary'
                )}
              >
                <div className={cn('p-2 rounded-lg', typeStyles[n.type as NotificationType])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{n.title}</h3>
                    {!n.isRead && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        new
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                    {n.resourceType && ` · ${n.resourceType}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate({ notificationId: n._id })}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
                      title="Mark read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate({ notificationId: n._id })}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
