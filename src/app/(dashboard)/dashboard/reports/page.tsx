'use client';

import { trpc } from '@/src/app/providers';
import {
  Lightbulb,
  Zap,
  Shield,
  Wallet,
  ShoppingCart,
  UtensilsCrossed,
  Bot,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReportsPage() {
  const kpis = trpc.reports.kpis.useQuery();
  const utils = trpc.useUtils();

  const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h];
            const s = v === null || v === undefined ? '' : String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTransactions = async () => {
    try {
      const data = await utils.reports.exportTransactions.fetch({});
      downloadCsv(data, `transactions-${Date.now()}.csv`);
      toast.success(`Exported ${data.length} rows`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportEnergy = async () => {
    try {
      const data = await utils.reports.exportDeviceActivity.fetch({
        limit: 10000,
      });
      downloadCsv(data, `energy-readings-${Date.now()}.csv`);
      toast.success(`Exported ${data.length} rows`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Cross-domain KPIs and CSV exports
        </p>
      </div>

      {kpis.isLoading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Home Automation</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Lightbulb}
                label="Devices Online"
                value={`${kpis.data?.devices.online ?? 0} / ${kpis.data?.devices.total ?? 0}`}
              />
              <KpiCard
                icon={Bot}
                label="Active Automations"
                value={kpis.data?.automations.enabled ?? 0}
              />
              <KpiCard
                icon={Zap}
                label="Today Energy"
                value={`${(kpis.data?.energy.todayKwh ?? 0).toFixed(1)} kWh`}
              />
              <KpiCard
                icon={Zap}
                label="Today Cost"
                value={`$${(kpis.data?.energy.todayCost ?? 0).toFixed(2)}`}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Security</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Shield}
                label="Today Events"
                value={kpis.data?.security.todayEvents ?? 0}
              />
              <KpiCard
                icon={Shield}
                label="Critical Open"
                value={kpis.data?.security.criticalOpen ?? 0}
                tone={
                  (kpis.data?.security.criticalOpen ?? 0) > 0
                    ? 'critical'
                    : 'default'
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Finance</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Wallet}
                label="Income (month)"
                value={`$${(kpis.data?.finance.monthIncome ?? 0).toFixed(2)}`}
                tone="positive"
              />
              <KpiCard
                icon={Wallet}
                label="Expenses (month)"
                value={`$${(kpis.data?.finance.monthExpense ?? 0).toFixed(2)}`}
                tone="negative"
              />
              <KpiCard
                icon={Wallet}
                label="Net (month)"
                value={`$${(kpis.data?.finance.net ?? 0).toFixed(2)}`}
                tone={
                  (kpis.data?.finance.net ?? 0) >= 0 ? 'positive' : 'negative'
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Grocery & Recipes</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={ShoppingCart}
                label="Pantry Items"
                value={kpis.data?.grocery.total ?? 0}
              />
              <KpiCard
                icon={ShoppingCart}
                label="Expiring Soon"
                value={kpis.data?.grocery.expiringSoon ?? 0}
                tone={
                  (kpis.data?.grocery.expiringSoon ?? 0) > 0
                    ? 'warning'
                    : 'default'
                }
              />
              <KpiCard
                icon={ShoppingCart}
                label="Low Stock"
                value={kpis.data?.grocery.lowStock ?? 0}
                tone={
                  (kpis.data?.grocery.lowStock ?? 0) > 0
                    ? 'critical'
                    : 'default'
                }
              />
              <KpiCard
                icon={UtensilsCrossed}
                label="Recipes"
                value={kpis.data?.recipes.total ?? 0}
              />
            </div>
          </section>
        </>
      )}

      <section className="widget space-y-3">
        <h2 className="text-lg font-semibold">Exports</h2>
        <p className="text-sm text-muted-foreground">
          Download CSV snapshots for external analysis.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportTransactions}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent"
          >
            <Download className="w-4 h-4" />
            Transactions CSV
          </button>
          <button
            onClick={exportEnergy}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent"
          >
            <Download className="w-4 h-4" />
            Energy Readings CSV
          </button>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'critical';
}) {
  const toneClass =
    tone === 'positive'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
      : tone === 'negative' || tone === 'critical'
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
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
