'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Plus,
  Search,
  ShoppingCart,
  Package,
  AlertTriangle,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Location = 'pantry' | 'fridge' | 'freezer' | 'other';

interface NewItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: Location;
  expiryDate: string;
  reorderThreshold: string;
}

const emptyItem: NewItem = {
  name: '',
  category: 'general',
  quantity: 1,
  unit: 'unit',
  location: 'pantry',
  expiryDate: '',
  reorderThreshold: '',
};

export default function GroceryPage() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<Location | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState<NewItem>(emptyItem);

  const stats = trpc.groceries.stats.useQuery();
  const list = trpc.groceries.list.useQuery({
    search: search || undefined,
    location: location === 'all' ? undefined : location,
    page: 1,
    pageSize: 100,
  });
  const expiring = trpc.groceries.expiring.useQuery({ days: 7 });

  const utils = trpc.useUtils();
  const create = trpc.groceries.create.useMutation({
    onSuccess: () => {
      toast.success('Item added');
      utils.groceries.list.invalidate();
      utils.groceries.stats.invalidate();
      utils.groceries.expiring.invalidate();
      setShowCreate(false);
      setNewItem(emptyItem);
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.groceries.delete.useMutation({
    onSuccess: () => {
      utils.groceries.list.invalidate();
      utils.groceries.stats.invalidate();
      utils.groceries.expiring.invalidate();
    },
  });

  const handleCreate = () => {
    if (!newItem.name.trim()) return;
    create.mutate({
      name: newItem.name,
      category: newItem.category,
      quantity: newItem.quantity,
      unit: newItem.unit,
      location: newItem.location,
      expiryDate: newItem.expiryDate
        ? new Date(newItem.expiryDate).toISOString()
        : undefined,
      reorderThreshold: newItem.reorderThreshold
        ? Number(newItem.reorderThreshold)
        : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Grocery & Pantry</h1>
          <p className="text-muted-foreground">
            Track food inventory, expiry, and shopping
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.data?.total ?? 0}
          tone="default"
          loading={stats.isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Expiring (7 days)"
          value={stats.data?.expiringSoon ?? 0}
          tone={(stats.data?.expiringSoon ?? 0) > 0 ? 'warning' : 'default'}
          loading={stats.isLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Low Stock"
          value={stats.data?.lowStock ?? 0}
          tone={(stats.data?.lowStock ?? 0) > 0 ? 'critical' : 'default'}
          loading={stats.isLoading}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 p-1 bg-accent rounded-lg">
          {(['all', 'pantry', 'fridge', 'freezer', 'other'] as const).map(
            (loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',
                  location === loc
                    ? 'bg-background shadow'
                    : 'hover:bg-background/50'
                )}
              >
                {loc}
              </button>
            )
          )}
        </div>
      </div>

      {(expiring.data?.length ?? 0) > 0 && (
        <div className="widget border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <h3 className="widget-title mb-3 text-yellow-900 dark:text-yellow-100">
            Expiring Soon
          </h3>
          <ul className="space-y-2">
            {expiring.data!.map((e) => (
              <li
                key={e._id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{e.name}</span>
                <span className="text-yellow-700 dark:text-yellow-300">
                  {e.daysLeft === 0
                    ? 'Today'
                    : `${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="widget">
        <h3 className="widget-title mb-4">Inventory</h3>
        {list.isLoading ? (
          <div className="py-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <p className="py-12 text-center text-muted-foreground text-sm">
            No items yet. Click &ldquo;Add Item&rdquo; to start tracking.
          </p>
        ) : (
          <div className="grid gap-2">
            {list.data!.items.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize">
                      {item.location}
                    </span>
                    {item.isLow && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Low
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit} · {item.category}
                    {item.expiryDate &&
                      ` · expires ${new Date(item.expiryDate).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => remove.mutate({ itemId: item._id })}
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">Add Grocery Item</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Input
                label="Name"
                value={newItem.name}
                onChange={(v) => setNewItem({ ...newItem, name: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Category"
                  value={newItem.category}
                  onChange={(v) => setNewItem({ ...newItem, category: v })}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location</label>
                  <select
                    value={newItem.location}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        location: e.target.value as Location,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    <option value="pantry">Pantry</option>
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  value={String(newItem.quantity)}
                  onChange={(v) =>
                    setNewItem({ ...newItem, quantity: Number(v) || 0 })
                  }
                />
                <Input
                  label="Unit"
                  value={newItem.unit}
                  onChange={(v) => setNewItem({ ...newItem, unit: v })}
                />
              </div>
              <Input
                label="Expiry Date"
                type="date"
                value={newItem.expiryDate}
                onChange={(v) => setNewItem({ ...newItem, expiryDate: v })}
              />
              <Input
                label="Reorder threshold (optional)"
                type="number"
                value={newItem.reorderThreshold}
                onChange={(v) =>
                  setNewItem({ ...newItem, reorderThreshold: v })
                }
              />
            </div>
            <div className="flex gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={create.isPending || !newItem.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {create.isPending ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'default' | 'warning' | 'critical';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'critical'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
      : tone === 'warning'
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
      : 'bg-primary/10 text-primary';
  return (
    <div className="widget">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', toneClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : value}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
