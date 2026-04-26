'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Loader2,
  X,
  ShoppingCart,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function FinancePage() {
  const [showCreateTx, setShowCreateTx] = useState(false);

  const summary = trpc.finance.reports.summary.useQuery({});
  const byCategory = trpc.finance.reports.byCategory.useQuery({
    type: 'expense',
  });
  const daily = trpc.finance.reports.daily.useQuery({ days: 30 });
  const grocerySpend = trpc.finance.reports.grocerySpending.useQuery({});
  const monthlyBudget = trpc.finance.budgets.forCurrentMonth.useQuery();
  const accounts = trpc.finance.accounts.list.useQuery();
  const transactions = trpc.finance.transactions.list.useQuery({
    page: 1,
    pageSize: 10,
  });

  const totalBalance = useMemo(
    () => accounts.data?.reduce((sum, a) => sum + a.balance, 0) ?? 0,
    [accounts.data]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground">
            Track income, expenses, budgets, and grocery spending
          </p>
        </div>
        <button
          onClick={() => setShowCreateTx(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label="Total Balance"
          value={`$${totalBalance.toFixed(2)}`}
          loading={accounts.isLoading}
        />
        <Stat
          icon={TrendingUp}
          label="Income (month)"
          value={`$${(summary.data?.income ?? 0).toFixed(2)}`}
          tone="positive"
          loading={summary.isLoading}
        />
        <Stat
          icon={TrendingDown}
          label="Expenses (month)"
          value={`$${(summary.data?.expense ?? 0).toFixed(2)}`}
          tone="negative"
          loading={summary.isLoading}
        />
        <Stat
          icon={DollarSign}
          label="Net (month)"
          value={`$${(summary.data?.net ?? 0).toFixed(2)}`}
          tone={(summary.data?.net ?? 0) >= 0 ? 'positive' : 'negative'}
          loading={summary.isLoading}
        />
      </div>

      <div className="widget">
        <h3 className="widget-title mb-4">Cash Flow (last 30 days)</h3>
        <div className="h-72">
          {daily.isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (daily.data?.length ?? 0) === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="widget">
          <h3 className="widget-title mb-4">Spending by Category</h3>
          <div className="h-64">
            {byCategory.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (byCategory.data?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expense data this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory.data}
                    dataKey="total"
                    nameKey="name"
                    outerRadius={90}
                    label={(entry: { name?: string }) => entry.name ?? ''}
                  >
                    {byCategory.data!.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="widget">
          <h3 className="widget-title mb-4">Monthly Budget</h3>
          {monthlyBudget.isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !monthlyBudget.data?.budget ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No budget configured for this month.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Total spent</span>
                  <span className="font-medium">
                    ${monthlyBudget.data.spent.toFixed(2)} / $
                    {monthlyBudget.data.budget.totalLimit.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      monthlyBudget.data.spent >
                        monthlyBudget.data.budget.totalLimit
                        ? 'bg-red-500'
                        : 'bg-primary'
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        (monthlyBudget.data.spent /
                          monthlyBudget.data.budget.totalLimit) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                {monthlyBudget.data.categories.map((c) => {
                  const pct = (c.spent / c.limit) * 100;
                  const over = pct >= c.alertThreshold;
                  return (
                    <div key={c.categoryId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{c.name}</span>
                        <span
                          className={cn(over && 'text-red-600 font-medium')}
                        >
                          ${c.spent.toFixed(0)} / ${c.limit.toFixed(0)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full',
                            over ? 'bg-red-500' : 'bg-primary'
                          )}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="widget">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="widget-title">Grocery Spending</h3>
          </div>
          <p className="text-3xl font-bold">
            ${(grocerySpend.data?.total ?? 0).toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {grocerySpend.data?.transactionCount ?? 0} transactions this month
          </p>
        </div>

        <div className="widget lg:col-span-2">
          <h3 className="widget-title mb-3">Recent Transactions</h3>
          {transactions.isLoading ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (transactions.data?.items.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              No transactions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {transactions.data!.items.map((t) => (
                <li
                  key={t._id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.categoryName} ·{' '}
                      {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-medium text-sm',
                      t.type === 'income' ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showCreateTx && (
        <CreateTransactionModal onClose={() => setShowCreateTx(false)} />
      )}
    </div>
  );
}

function CreateTransactionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const categories = trpc.finance.categories.list.useQuery();
  const accounts = trpc.finance.accounts.list.useQuery();
  const utils = trpc.useUtils();
  const createTx = trpc.finance.transactions.create.useMutation({
    onSuccess: () => {
      toast.success('Transaction created');
      utils.finance.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredCats =
    categories.data?.filter((c) => c.type === form.type) ?? [];

  const handleSubmit = () => {
    if (!form.amount || !form.description || !form.categoryId) {
      toast.error('Fill required fields');
      return;
    }
    createTx.mutate({
      type: form.type,
      amount: Number(form.amount),
      currency: 'USD',
      categoryId: form.categoryId,
      accountId: form.accountId || undefined,
      description: form.description,
      date: new Date(form.date).toISOString(),
      tags: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">New Transaction</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-1 p-1 bg-accent rounded-lg">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm rounded-md capitalize',
                  form.type === t ? 'bg-background shadow' : ''
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Field label="Amount">
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="">Select…</option>
              {filteredCats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {filteredCats.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No {form.type} categories yet — create one via API.
              </p>
            )}
          </Field>
          <Field label="Account (optional)">
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="">Select…</option>
              {accounts.data?.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
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
            onClick={handleSubmit}
            disabled={createTx.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createTx.isPending ? 'Saving…' : 'Save'}
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

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'default';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'positive'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
      : tone === 'negative'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
      : 'bg-primary/10 text-primary';
  return (
    <div className="widget">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', toneClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
      <div className="widget-value">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
    </div>
  );
}
