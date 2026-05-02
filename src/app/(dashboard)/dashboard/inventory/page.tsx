'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Package,
  Wrench,
  Plus,
  Trash2,
  Loader2,
  Check,
  Search,
  AlertCircle,
} from 'lucide-react';

type Tab = 'assets' | 'tasks';
type Cadence = 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

interface NewItem {
  name: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  location: string;
  purchasedAt: string;
  warrantyExpiresAt: string;
  quantity: number;
  purchasedPrice: string;
}

const emptyItem: NewItem = {
  name: '',
  category: '',
  manufacturer: '',
  modelNumber: '',
  serialNumber: '',
  location: '',
  purchasedAt: '',
  warrantyExpiresAt: '',
  quantity: 1,
  purchasedPrice: '',
};

interface NewTask {
  inventoryItemId: string;
  name: string;
  description: string;
  cadence: Cadence;
  intervalDays: number;
  nextDueAt: string;
}

const emptyTask: NewTask = {
  inventoryItemId: '',
  name: '',
  description: '',
  cadence: 'annual',
  intervalDays: 30,
  nextDueAt: '',
};

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('assets');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory & Maintenance</h1>
        <p className="text-muted-foreground">
          Track household assets and recurring upkeep tasks.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {([
          { id: 'assets', label: 'Assets', icon: Package },
          { id: 'tasks', label: 'Maintenance', icon: Wrench },
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

      {tab === 'assets' && <AssetsPanel search={search} onSearch={setSearch} />}
      {tab === 'tasks' && <TasksPanel />}
    </div>
  );
}

function AssetsPanel({ search, onSearch }: { search: string; onSearch: (v: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<NewItem>(emptyItem);

  const list = trpc.inventory.items.list.useQuery({
    search: search || undefined,
    page: 1,
    pageSize: 100,
  });
  const utils = trpc.useUtils();

  const create = trpc.inventory.items.create.useMutation({
    onSuccess: () => {
      toast.success('Item added');
      setShowAdd(false);
      setDraft(emptyItem);
      utils.inventory.items.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.inventory.items.delete.useMutation({
    onSuccess: () => {
      toast.success('Item removed');
      utils.inventory.items.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    create.mutate({
      name: draft.name.trim(),
      category: draft.category.trim() || undefined,
      manufacturer: draft.manufacturer.trim() || undefined,
      modelNumber: draft.modelNumber.trim() || undefined,
      serialNumber: draft.serialNumber.trim() || undefined,
      location: draft.location.trim() || undefined,
      quantity: draft.quantity,
      purchasedPrice: draft.purchasedPrice ? Number(draft.purchasedPrice) : undefined,
      purchasedAt: draft.purchasedAt ? new Date(draft.purchasedAt).toISOString() : undefined,
      warrantyExpiresAt: draft.warrantyExpiresAt
        ? new Date(draft.warrantyExpiresAt).toISOString()
        : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search assets…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Cancel' : 'Add Asset'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="widget grid gap-3 sm:grid-cols-2">
          <Field label="Name" required>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              className="input"
            />
          </Field>
          <Field label="Category">
            <input
              type="text"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              placeholder="e.g. appliance"
              className="input"
            />
          </Field>
          <Field label="Manufacturer">
            <input
              type="text"
              value={draft.manufacturer}
              onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Model #">
            <input
              type="text"
              value={draft.modelNumber}
              onChange={(e) => setDraft({ ...draft, modelNumber: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Serial #">
            <input
              type="text"
              value={draft.serialNumber}
              onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Location">
            <input
              type="text"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="e.g. Kitchen — under sink"
              className="input"
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) || 1 })}
              className="input"
            />
          </Field>
          <Field label="Purchased Price">
            <input
              type="number"
              step="0.01"
              min={0}
              value={draft.purchasedPrice}
              onChange={(e) => setDraft({ ...draft, purchasedPrice: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Purchased On">
            <input
              type="date"
              value={draft.purchasedAt}
              onChange={(e) => setDraft({ ...draft, purchasedAt: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Warranty Expires">
            <input
              type="date"
              value={draft.warrantyExpiresAt}
              onChange={(e) => setDraft({ ...draft, warrantyExpiresAt: e.target.value })}
              className="input"
            />
          </Field>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {create.isPending ? 'Saving…' : 'Save Asset'}
            </button>
          </div>
        </form>
      )}

      {list.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No assets yet — add one to start tracking.</p>
        </div>
      ) : (
        <div className="widget overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Warranty</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.data!.items.map((item) => {
                const warrantyExpires = item.warrantyExpiresAt
                  ? new Date(item.warrantyExpiresAt)
                  : null;
                const warrantyClass =
                  warrantyExpires && warrantyExpires.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-muted-foreground';
                return (
                  <tr key={item._id} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{item.name}</div>
                      {item.manufacturer && (
                        <div className="text-xs text-muted-foreground">
                          {item.manufacturer}
                          {item.modelNumber ? ` · ${item.modelNumber}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {item.category ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {item.location ?? '—'}
                    </td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className={cn('py-2 pr-4', warrantyClass)}>
                      {warrantyExpires ? warrantyExpires.toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove "${item.name}"?`)) {
                            remove.mutate({ itemId: item._id });
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TasksPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<NewTask>(emptyTask);

  const tasks = trpc.inventory.tasks.list.useQuery({ includeComplete: false });
  const items = trpc.inventory.items.list.useQuery({ page: 1, pageSize: 200 });
  const dueSoon = trpc.inventory.dueSoon.useQuery({ days: 14 });
  const utils = trpc.useUtils();

  const upsert = trpc.inventory.tasks.upsert.useMutation({
    onSuccess: () => {
      toast.success('Task saved');
      setShowAdd(false);
      setDraft(emptyTask);
      utils.inventory.tasks.list.invalidate();
      utils.inventory.dueSoon.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const complete = trpc.inventory.tasks.complete.useMutation({
    onSuccess: (data) => {
      toast.success(data.msg);
      utils.inventory.tasks.list.invalidate();
      utils.inventory.dueSoon.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.inventory.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success('Task removed');
      utils.inventory.tasks.list.invalidate();
      utils.inventory.dueSoon.invalidate();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.nextDueAt) return;
    upsert.mutate({
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      cadence: draft.cadence,
      intervalDays: draft.cadence === 'custom' ? draft.intervalDays : undefined,
      nextDueAt: new Date(draft.nextDueAt).toISOString(),
      inventoryItemId: draft.inventoryItemId || undefined,
    });
  };

  const dueSoonCount = dueSoon.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="widget">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="w-4 h-4" />
            <span>Open tasks</span>
          </div>
          <div className="widget-value">{tasks.data?.length ?? 0}</div>
        </div>
        <div className="widget">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Due in 14 days</span>
          </div>
          <div className={cn('widget-value', dueSoonCount > 0 && 'text-yellow-600 dark:text-yellow-400')}>
            {dueSoonCount}
          </div>
        </div>
        <div className="widget">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>Tracked assets</span>
          </div>
          <div className="widget-value">{items.data?.total ?? 0}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="widget grid gap-3 sm:grid-cols-2">
          <Field label="Task Name" required>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              className="input"
              placeholder="Replace HVAC filter"
            />
          </Field>
          <Field label="Asset (optional)">
            <select
              value={draft.inventoryItemId}
              onChange={(e) => setDraft({ ...draft, inventoryItemId: e.target.value })}
              className="input"
            >
              <option value="">— None —</option>
              {items.data?.items.map((it) => (
                <option key={it._id} value={it._id}>
                  {it.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cadence">
            <select
              value={draft.cadence}
              onChange={(e) => setDraft({ ...draft, cadence: e.target.value as Cadence })}
              className="input"
            >
              <option value="once">Once</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semiannual">Every 6 months</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom (days)</option>
            </select>
          </Field>
          {draft.cadence === 'custom' && (
            <Field label="Interval (days)">
              <input
                type="number"
                min={1}
                value={draft.intervalDays}
                onChange={(e) => setDraft({ ...draft, intervalDays: Number(e.target.value) || 30 })}
                className="input"
              />
            </Field>
          )}
          <Field label="Next Due" required>
            <input
              type="date"
              value={draft.nextDueAt}
              onChange={(e) => setDraft({ ...draft, nextDueAt: e.target.value })}
              required
              className="input"
            />
          </Field>
          <Field label="Description" wide>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="input resize-none"
            />
          </Field>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={upsert.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {upsert.isPending ? 'Saving…' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {tasks.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (tasks.data?.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No open tasks. Add one to schedule maintenance.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.data!.map((task) => {
            const due = new Date(task.nextDueAt);
            const daysUntil = Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            const overdue = daysUntil < 0;
            const soon = daysUntil >= 0 && daysUntil <= 14;
            return (
              <li
                key={task._id}
                className={cn(
                  'widget flex items-center justify-between gap-3',
                  overdue && 'border-l-4 border-l-destructive',
                  !overdue && soon && 'border-l-4 border-l-yellow-500'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{task.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize">
                      {task.cadence}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <p
                    className={cn(
                      'text-xs mt-1',
                      overdue
                        ? 'text-destructive'
                        : soon
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    Due {due.toLocaleDateString()}
                    {overdue
                      ? ` (overdue by ${Math.abs(daysUntil)}d)`
                      : ` (in ${daysUntil}d)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => complete.mutate({ taskId: task._id })}
                    disabled={complete.isPending}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-green-600 transition-colors"
                    title="Mark complete"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove task "${task.name}"?`)) {
                        remove.mutate({ taskId: task._id });
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
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

function Field({
  label,
  required,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('text-sm', wide && 'sm:col-span-2')}>
      <span className="text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-size: 0.875rem;
        }
      `}</style>
    </label>
  );
}
