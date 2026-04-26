'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Zap,
  TrendingUp,
  DollarSign,
  Gauge,
  AlertTriangle,
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
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';

type Range = 'day' | 'week' | 'month' | 'year';

export default function EnergyPage() {
  const [range, setRange] = useState<Range>('day');

  const summary = trpc.energy.summary.useQuery({ range });
  const current = trpc.energy.current.useQuery();
  const budgets = trpc.energy.listBudgets.useQuery();

  const points = useMemo(
    () =>
      summary.data?.points.map((p) => ({
        bucket: p.bucket,
        energy: Number(p.energy.toFixed(2)),
        cost: Number((p.cost ?? 0).toFixed(2)),
        avgPower: Number(p.avgPower.toFixed(0)),
      })) ?? [],
    [summary.data]
  );

  const totalEnergy = summary.data?.totals.energy ?? 0;
  const totalCost = summary.data?.totals.cost ?? 0;
  const realtimePower = current.data?.totalPower ?? 0;

  const monthBudget = useMemo(() => {
    if (!budgets.data) return null;
    const now = new Date();
    return (
      budgets.data.find(
        (b) => b.month === now.getMonth() + 1 && b.year === now.getFullYear()
      ) ?? null
    );
  }, [budgets.data]);

  const monthUsage = monthBudget
    ? Math.min(100, (totalEnergy / monthBudget.limitKwh) * 100)
    : 0;
  const overThreshold =
    monthBudget && monthUsage >= monthBudget.alertThreshold;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Energy</h1>
          <p className="text-muted-foreground">
            Real-time consumption, cost, and budget tracking
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-accent rounded-lg">
          {(['day', 'week', 'month', 'year'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors',
                range === r ? 'bg-background shadow' : 'hover:bg-background/50'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {overThreshold && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Budget alert
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You&apos;ve used {monthUsage.toFixed(0)}% of your{' '}
              {monthBudget?.name} budget this month.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Gauge}
          title="Realtime Power"
          value={`${realtimePower.toFixed(0)} W`}
          loading={current.isLoading}
        />
        <StatCard
          icon={Zap}
          title={`Energy (${range})`}
          value={`${totalEnergy.toFixed(2)} kWh`}
          loading={summary.isLoading}
        />
        <StatCard
          icon={DollarSign}
          title={`Cost (${range})`}
          value={`$${totalCost.toFixed(2)}`}
          loading={summary.isLoading}
        />
        <StatCard
          icon={TrendingUp}
          title="Month Budget"
          value={
            monthBudget
              ? `${monthUsage.toFixed(0)}% of ${monthBudget.limitKwh} kWh`
              : 'No budget set'
          }
          loading={budgets.isLoading}
        />
      </div>

      <div className="widget">
        <h3 className="widget-title mb-4">Consumption</h3>
        <div className="h-72">
          {summary.isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : points.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No readings in this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="energy"
                  name="Energy (kWh)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgPower"
                  name="Avg Power (W)"
                  stroke="#f59e0b"
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
          <h3 className="widget-title mb-4">Realtime by Device</h3>
          <div className="h-64">
            {current.isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (current.data?.perDevice.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No live readings yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(current.data?.perDevice ?? []).map((d) => ({
                    name: d.deviceName,
                    power: d.power,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="power" name="Power (W)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="widget">
          <h3 className="widget-title mb-4">Budgets</h3>
          {budgets.isLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (budgets.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budgets configured. Use the API to add one.
            </p>
          ) : (
            <ul className="space-y-3">
              {budgets.data!.map((b) => (
                <li
                  key={b._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.year}-{String(b.month).padStart(2, '0')} ·{' '}
                      {b.limitKwh} kWh · ${b.limitCost}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Alert at {b.alertThreshold}%
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

function StatCard({
  icon: Icon,
  title,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="widget">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
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
