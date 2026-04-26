'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Plus,
  Snowflake,
  Flame,
  Wind,
  Power,
  Loader2,
  X,
  Trash2,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Mode = 'off' | 'heat' | 'cool' | 'auto' | 'fan';
type Unit = 'celsius' | 'fahrenheit';

const modeIcons: Record<Mode, React.ComponentType<{ className?: string }>> = {
  off: Power,
  heat: Flame,
  cool: Snowflake,
  auto: Wind,
  fan: Wind,
};

const modeColors: Record<Mode, string> = {
  off: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
  heat: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  cool: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  auto: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  fan: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
};

export default function ClimatePage() {
  const [showCreate, setShowCreate] = useState(false);
  const zones = trpc.climate.listZones.useQuery();
  const utils = trpc.useUtils();

  const setTemp = trpc.climate.setTemperature.useMutation({
    onSuccess: () => utils.climate.listZones.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const updateZone = trpc.climate.updateZone.useMutation({
    onSuccess: () => utils.climate.listZones.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const deleteZone = trpc.climate.deleteZone.useMutation({
    onSuccess: () => {
      toast.success('Zone removed');
      utils.climate.listZones.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Climate</h1>
          <p className="text-muted-foreground">
            Manage HVAC zones, temperatures, and schedules
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Zone
        </button>
      </div>

      {zones.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (zones.data?.length ?? 0) === 0 ? (
        <div className="widget py-16 text-center">
          <Snowflake className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            No climate zones yet. Create one to start managing HVAC.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.data!.map((z) => {
            const Icon = modeIcons[z.mode];
            return (
              <div key={z._id} className="widget space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{z.name}</h3>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                        modeColors[z.mode]
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {z.mode}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteZone.mutate({ zoneId: z._id })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center py-4">
                  <div className="text-5xl font-bold tabular-nums">
                    {z.targetTemperature.toFixed(0)}°
                    <span className="text-2xl text-muted-foreground">
                      {z.unit === 'celsius' ? 'C' : 'F'}
                    </span>
                  </div>
                  {z.humidity !== undefined && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Humidity: {z.humidity.toFixed(0)}%
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() =>
                      setTemp.mutate({
                        zoneId: z._id,
                        targetTemperature: z.targetTemperature - 1,
                      })
                    }
                    className="p-3 rounded-full border border-border hover:bg-accent"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setTemp.mutate({
                        zoneId: z._id,
                        targetTemperature: z.targetTemperature + 1,
                      })
                    }
                    className="p-3 rounded-full border border-border hover:bg-accent"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {(['off', 'heat', 'cool', 'auto', 'fan'] as Mode[]).map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() =>
                          updateZone.mutate({ zoneId: z._id, mode: m })
                        }
                        className={cn(
                          'px-2 py-1.5 text-xs rounded-md capitalize transition-colors',
                          z.mode === m
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent hover:bg-accent/80'
                        )}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateZoneModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateZoneModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    targetTemperature: '72',
    unit: 'fahrenheit' as Unit,
    mode: 'off' as Mode,
  });
  const utils = trpc.useUtils();
  const createZone = trpc.climate.createZone.useMutation({
    onSuccess: () => {
      toast.success('Zone created');
      utils.climate.listZones.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.name.trim()) return;
    createZone.mutate({
      name: form.name,
      targetTemperature: Number(form.targetTemperature),
      unit: form.unit,
      mode: form.mode,
      thermostatDeviceIds: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">New Climate Zone</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Zone name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Living Room"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target temp">
              <input
                type="number"
                value={form.targetTemperature}
                onChange={(e) =>
                  setForm({ ...form, targetTemperature: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </Field>
            <Field label="Unit">
              <select
                value={form.unit}
                onChange={(e) =>
                  setForm({ ...form, unit: e.target.value as Unit })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="fahrenheit">Fahrenheit</option>
                <option value="celsius">Celsius</option>
              </select>
            </Field>
          </div>
          <Field label="Initial mode">
            <select
              value={form.mode}
              onChange={(e) =>
                setForm({ ...form, mode: e.target.value as Mode })
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="off">Off</option>
              <option value="heat">Heat</option>
              <option value="cool">Cool</option>
              <option value="auto">Auto</option>
              <option value="fan">Fan</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={createZone.isPending || !form.name.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createZone.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
