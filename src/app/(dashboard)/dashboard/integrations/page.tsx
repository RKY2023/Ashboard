'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Webhook,
  Mic,
  Plus,
  Trash2,
  Loader2,
  Copy,
  RotateCw,
} from 'lucide-react';

type Tab = 'webhooks' | 'voice';
type TargetType = 'automation' | 'scene';
type Provider = 'alexa' | 'google' | 'generic';

const PROVIDER_LABELS: Record<Provider, string> = {
  alexa: 'Amazon Alexa',
  google: 'Google Assistant',
  generic: 'Generic',
};

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('webhooks');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Wire external services into your household via webhooks and voice intents.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {([
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          { id: 'voice', label: 'Voice', icon: Mic },
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

      {tab === 'webhooks' && <WebhooksPanel />}
      {tab === 'voice' && <VoicePanel />}
    </div>
  );
}

function useTargetOptions() {
  const automations = trpc.automation.list.useQuery();
  const scenes = trpc.scenes.list.useQuery();
  return {
    automations: automations.data ?? [],
    scenes: scenes.data ?? [],
    isLoading: automations.isLoading || scenes.isLoading,
  };
}

function targetLabel(
  targetType: TargetType,
  targetId: string,
  automations: { _id: string; name: string }[],
  scenes: { _id: string; name: string }[]
): string {
  const list = targetType === 'automation' ? automations : scenes;
  const match = list.find((x) => x._id === targetId);
  return match ? `${match.name} (${targetType})` : `${targetType}:${targetId}`;
}

function WebhooksPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('automation');
  const [targetId, setTargetId] = useState('');

  const list = trpc.integrations.webhooks.list.useQuery();
  const targets = useTargetOptions();
  const utils = trpc.useUtils();

  const create = trpc.integrations.webhooks.create.useMutation({
    onSuccess: () => {
      toast.success('Webhook created');
      setShowAdd(false);
      setName('');
      setDescription('');
      setTargetId('');
      utils.integrations.webhooks.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rotate = trpc.integrations.webhooks.rotateSecret.useMutation({
    onSuccess: () => {
      toast.success('Secret rotated');
      utils.integrations.webhooks.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.integrations.webhooks.delete.useMutation({
    onSuccess: () => {
      toast.success('Webhook removed');
      utils.integrations.webhooks.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetId) return;
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      targetType,
      targetId,
    });
  };

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-host';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Webhooks are signed with HMAC-SHA256. Send <code className="text-xs">X-Ashboard-Signature: sha256=&lt;hex&gt;</code> with the request body.
        </p>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Cancel' : 'New Webhook'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="widget grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="GitHub deploy notifier"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Target type</span>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as TargetType);
                setTargetId('');
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="automation">Automation</option>
              <option value="scene">Scene</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Target</span>
            <select
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">— Select —</option>
              {(targetType === 'automation' ? targets.automations : targets.scenes).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {create.isPending ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </form>
      )}

      {list.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (list.data?.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <Webhook className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No webhooks yet — create one to wire an external service in.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.data!.map((w) => {
            const url = `${baseUrl}/api/webhooks/${w._id}`;
            return (
              <div key={w._id} className="widget space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{w.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize">
                        {targetLabel(w.targetType, w.targetId, targets.automations, targets.scenes)}
                      </span>
                      {!w.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">disabled</span>
                      )}
                    </div>
                    {w.description && (
                      <p className="text-sm text-muted-foreground">{w.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Triggered {w.triggerCount} time{w.triggerCount === 1 ? '' : 's'}
                      {w.lastTriggeredAt ? ` · last ${new Date(w.lastTriggeredAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => rotate.mutate({ webhookId: w._id })}
                      disabled={rotate.isPending}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                      title="Rotate secret"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete webhook "${w.name}"?`)) {
                          remove.mutate({ webhookId: w._id });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <CopyableField label="POST URL" value={url} />
                <CopyableField label="Secret" value={w.secret} mono />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VoicePanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<Provider>('alexa');
  const [intent, setIntent] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('automation');
  const [targetId, setTargetId] = useState('');

  const list = trpc.integrations.voice.list.useQuery();
  const targets = useTargetOptions();
  const utils = trpc.useUtils();

  const upsert = trpc.integrations.voice.upsert.useMutation({
    onSuccess: () => {
      toast.success('Voice intent saved');
      setShowAdd(false);
      setIntent('');
      setTargetId('');
      utils.integrations.voice.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.integrations.voice.delete.useMutation({
    onSuccess: () => {
      toast.success('Voice intent removed');
      utils.integrations.voice.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent.trim() || !targetId) return;
    upsert.mutate({
      provider,
      intent: intent.trim(),
      targetType,
      targetId,
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map voice-assistant intents to automations or scenes. The provider POSTs to <code className="text-xs">/api/voice/&lt;provider&gt;</code>.
        </p>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Cancel' : 'New Intent'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="widget grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Intent name</span>
            <input
              type="text"
              required
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="GoodNight"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Target type</span>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as TargetType);
                setTargetId('');
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="automation">Automation</option>
              <option value="scene">Scene</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Target</span>
            <select
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">— Select —</option>
              {(targetType === 'automation' ? targets.automations : targets.scenes).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={upsert.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {upsert.isPending ? 'Saving…' : 'Save Intent'}
            </button>
          </div>
        </form>
      )}

      {list.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (list.data?.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <Mic className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No voice intents yet.</p>
        </div>
      ) : (
        <div className="widget overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Intent</th>
                <th className="py-2 pr-4">Target</th>
                <th className="py-2 pr-4">Triggered</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.data!.map((v) => (
                <tr key={v._id} className="border-t border-border">
                  <td className="py-2 pr-4">{PROVIDER_LABELS[v.provider as Provider] ?? v.provider}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{v.intent}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {targetLabel(v.targetType, v.targetId, targets.automations, targets.scenes)}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {v.triggerCount} {v.lastTriggeredAt ? `· ${new Date(v.lastTriggeredAt).toLocaleDateString()}` : ''}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove intent "${v.intent}"?`)) {
                          remove.mutate({ intentId: v._id });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CopyableField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground w-20 shrink-0">
        {label}
      </span>
      <code
        className={cn(
          'flex-1 px-2 py-1 rounded bg-muted text-xs overflow-x-auto whitespace-nowrap',
          mono && 'font-mono'
        )}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
