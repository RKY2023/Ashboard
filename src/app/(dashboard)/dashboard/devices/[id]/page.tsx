'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/src/app/providers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Loader2,
  Power,
  Trash2,
  Pencil,
  Save,
  X,
  Activity,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { DeviceHistoryChart } from '@/src/components/devices/DeviceHistoryChart';

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const deviceId = params?.id ?? '';

  const device = trpc.devices.get.useQuery({ deviceId }, { enabled: !!deviceId });
  const rooms = trpc.rooms.list.useQuery();
  const recentCommands = trpc.devices.recentCommands.useQuery(
    { deviceId, limit: 15 },
    { enabled: !!deviceId }
  );
  const automationsUsing = trpc.devices.automationsUsing.useQuery(
    { deviceId },
    { enabled: !!deviceId }
  );

  const utils = trpc.useUtils();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  useEffect(() => {
    if (device.data && !editingName) setDraftName(device.data.name);
  }, [device.data, editingName]);

  const update = trpc.devices.update.useMutation({
    onSuccess: () => {
      toast.success('Device updated');
      setEditingName(false);
      utils.devices.get.invalidate({ deviceId });
      utils.devices.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const control = trpc.devices.control.useMutation({
    onSuccess: () => {
      utils.devices.get.invalidate({ deviceId });
      utils.devices.recentCommands.invalidate({ deviceId, limit: 15 });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.devices.delete.useMutation({
    onSuccess: () => {
      toast.success('Device unpaired');
      router.push('/dashboard/devices');
    },
    onError: (e) => toast.error(e.message),
  });

  if (device.isLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!device.data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Device not found.</p>
        <Link href="/dashboard/devices" className="text-primary hover:underline mt-2 inline-block">
          Back to devices
        </Link>
      </div>
    );
  }

  const d = device.data;
  const isOn = d.state.on === true || d.state.power === true;
  const stateEntries = Object.entries(d.state ?? {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/dashboard/devices"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to devices
        </Link>
        <div className="flex items-center gap-2">
          {d.capabilities.includes('on_off') && d.isOnline && (
            <button
              onClick={() => control.mutate({ deviceId, command: 'on', value: !isOn })}
              disabled={control.isPending}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2',
                isOn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80'
              )}
            >
              <Power className="w-4 h-4" />
              {isOn ? 'Turn Off' : 'Turn On'}
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Unpair "${d.name}"? This removes it from the household.`)) {
                remove.mutate({ deviceId });
              }
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            Unpair
          </button>
        </div>
      </div>

      <div className="widget">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="text-2xl font-bold flex-1 px-2 py-1 rounded border border-input bg-background"
                />
                <button
                  onClick={() => update.mutate({ deviceId, name: draftName.trim() || d.name })}
                  disabled={update.isPending}
                  className="p-1.5 rounded-lg hover:bg-accent text-primary"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setDraftName(d.name);
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{d.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                  title="Rename"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              <span className="capitalize">{d.type}</span>
              {d.manufacturer && <span>· {d.manufacturer}{d.model ? ` ${d.model}` : ''}</span>}
              <span className="inline-flex items-center gap-1">
                {d.isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                {d.isOnline ? 'Online' : 'Offline'}
              </span>
              {d.lastSeenAt && (
                <span className="text-xs">last seen {new Date(d.lastSeenAt).toLocaleString()}</span>
              )}
            </div>
          </div>

          <label className="text-sm">
            <span className="text-muted-foreground">Room</span>
            <select
              value={d.roomId ?? ''}
              onChange={(e) => {
                const newRoomId = e.target.value || null;
                update.mutate({ deviceId, roomId: newRoomId });
              }}
              className="ml-2 px-3 py-1.5 rounded-lg border border-input bg-background"
            >
              <option value="">— Unassigned —</option>
              {rooms.data?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="widget lg:col-span-2">
          <h3 className="widget-title mb-3">Live state</h3>
          {stateEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No state reported yet.</p>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              {stateEntries.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{key}</dt>
                  <dd className="mt-1 font-medium break-all">{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="widget">
          <h3 className="widget-title mb-3">Connection</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Protocol</dt>
              <dd className="font-medium uppercase">{d.protocol}</dd>
            </div>
            {d.mqttTopic && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">MQTT topic</dt>
                <dd className="font-mono text-xs break-all">{d.mqttTopic}</dd>
              </div>
            )}
            {d.firmwareVersion && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Firmware</dt>
                <dd className="font-mono text-xs">{d.firmwareVersion}</dd>
              </div>
            )}
            {d.capabilities.length > 0 && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Capabilities</dt>
                <dd className="flex flex-wrap gap-1">
                  {d.capabilities.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize"
                    >
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="widget">
        <DeviceHistoryChart
          deviceId={deviceId}
          deviceType={d.type}
          capabilities={d.capabilities}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="widget">
          <h3 className="widget-title mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent commands
          </h3>
          {recentCommands.isLoading ? (
            <div className="py-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (recentCommands.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No control events recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentCommands.data!.map((c) => {
                const details = c.details as Record<string, unknown> | undefined;
                const action = (details?.action as string | undefined) ?? c.action;
                const newState = details?.newState as Record<string, unknown> | undefined;
                return (
                  <li key={c._id} className="flex items-start gap-2 border-l-2 border-primary/30 pl-3">
                    <div className="flex-1">
                      <div className="font-medium capitalize">{action}</div>
                      {newState && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {Object.entries(newState).map(([k, v]) => `${k}=${formatValue(v)}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.at).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="widget">
          <h3 className="widget-title mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Used by automations
          </h3>
          {automationsUsing.isLoading ? (
            <div className="py-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (automationsUsing.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No automations reference this device.</p>
          ) : (
            <ul className="space-y-2">
              {automationsUsing.data!.map((a) => (
                <li key={a._id} className="flex items-center justify-between text-sm">
                  <Link
                    href="/dashboard/automation"
                    className="font-medium hover:underline"
                  >
                    {a.name}
                  </Link>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      a.isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted'
                    )}
                  >
                    {a.isEnabled ? 'enabled' : 'disabled'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
