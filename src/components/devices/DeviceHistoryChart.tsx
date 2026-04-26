'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { trpc } from '@/src/app/providers';
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface DeviceHistoryChartProps {
  deviceId: string;
  deviceType?: string;
  capabilities?: string[];
}

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
type ChartType = 'line' | 'area';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const propertyColors: Record<string, string> = {
  temperature: '#ef4444',
  humidity: '#3b82f6',
  brightness: '#eab308',
  power: '#22c55e',
  energy: '#8b5cf6',
  motion: '#f97316',
  on: '#14b8a6',
  targetTemp: '#f59e0b',
  currentTemp: '#ef4444',
};

const propertyLabels: Record<string, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  brightness: 'Brightness',
  power: 'Power',
  energy: 'Energy',
  motion: 'Motion',
  on: 'On/Off',
  targetTemp: 'Target Temperature',
  currentTemp: 'Current Temperature',
};

export function DeviceHistoryChart({
  deviceId,
}: DeviceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    switch (timeRange) {
      case '1h':
        start.setHours(now.getHours() - 1);
        break;
      case '6h':
        start.setHours(now.getHours() - 6);
        break;
      case '24h':
        start.setDate(now.getDate() - 1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeRange]);

  // Determine aggregation based on time range
  const aggregation = useMemo(() => {
    if (timeRange === '1h' || timeRange === '6h') return 'none' as const;
    if (timeRange === '24h' || timeRange === '7d') return 'hourly' as const;
    return 'daily' as const;
  }, [timeRange]);

  // Fetch history data
  const { data: historyData, isLoading } = trpc.devices.history.list.useQuery({
    deviceId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    aggregation,
    limit: 500,
  });

  // Fetch stats
  const { data: stats } = trpc.devices.history.stats.useQuery({
    deviceId,
    period: timeRange === '1h' || timeRange === '6h' || timeRange === '24h' ? 'day' : timeRange === '7d' ? 'week' : 'month',
  });

  // Get available properties from data
  const availableProperties = useMemo(() => {
    if (!historyData?.items) return [];
    const props = new Set<string>();
    historyData.items.forEach((item: { property?: string }) => {
      if (item.property) props.add(item.property);
    });
    return Array.from(props);
  }, [historyData]);

  // Initialize selected properties
  useMemo(() => {
    if (selectedProperties.length === 0 && availableProperties.length > 0) {
      setSelectedProperties(availableProperties.slice(0, 3));
    }
  }, [availableProperties, selectedProperties.length]);

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!historyData?.items) return [];

    // Group by timestamp
    const groupedByTime: Record<string, Record<string, number | string>> = {};

    historyData.items.forEach((item: {
      timestamp: string;
      property?: string;
      value?: unknown;
      avgValue?: number;
    }) => {
      const time = new Date(item.timestamp).getTime();
      if (!groupedByTime[time]) {
        groupedByTime[time] = { timestamp: time };
      }
      const value = aggregation === 'none'
        ? item.value
        : item.avgValue;

      if (item.property && value !== undefined) {
        groupedByTime[time][item.property] = typeof value === 'number' ? value : Number(value) || 0;
      }
    });

    return Object.values(groupedByTime).sort((a, b) =>
      (a.timestamp as number) - (b.timestamp as number)
    );
  }, [historyData, aggregation]);

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === '1h' || timeRange === '6h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (timeRange === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const toggleProperty = (prop: string) => {
    setSelectedProperties((prev) =>
      prev.includes(prop)
        ? prev.filter((p) => p !== prop)
        : [...prev, prop]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!historyData?.items || historyData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No history data available</p>
        <p className="text-sm text-muted-foreground">
          Device activity will appear here once it starts recording.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="State Changes"
            value={stats.changeCount}
            icon={<Activity className="w-4 h-4" />}
          />
          {stats.numericStats.slice(0, 3).map((stat: { property: string; avg?: number; min?: number; max?: number }) => (
            <StatCard
              key={stat.property}
              label={propertyLabels[stat.property] || stat.property}
              value={stat.avg?.toFixed(1) || '-'}
              subValue={stat.min !== undefined && stat.max !== undefined ? `${stat.min.toFixed(1)} - ${stat.max.toFixed(1)}` : undefined}
              icon={
                stat.avg !== undefined && stat.min !== undefined && stat.avg > (stat.min + (stat.max! - stat.min) / 2) ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )
              }
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Time range selector */}
        <div className="flex gap-1 p-1 bg-accent rounded-lg">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                timeRange === option.value
                  ? 'bg-background shadow'
                  : 'hover:bg-background/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Chart type selector */}
        <div className="flex gap-1 p-1 bg-accent rounded-lg">
          <button
            onClick={() => setChartType('line')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              chartType === 'line'
                ? 'bg-background shadow'
                : 'hover:bg-background/50'
            )}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              chartType === 'area'
                ? 'bg-background shadow'
                : 'hover:bg-background/50'
            )}
          >
            Area
          </button>
        </div>
      </div>

      {/* Property toggles */}
      {availableProperties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableProperties.map((prop) => (
            <button
              key={prop}
              onClick={() => toggleProperty(prop)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-colors',
                selectedProperties.includes(prop)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent'
              )}
              style={{
                borderColor: selectedProperties.includes(prop)
                  ? propertyColors[prop] || '#6b7280'
                  : undefined,
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: propertyColors[prop] || '#6b7280' }}
              />
              {propertyLabels[prop] || prop}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs text-muted-foreground" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number, name: string) => [
                  value.toFixed(2),
                  propertyLabels[name] || name,
                ]}
              />
              <Legend />
              {selectedProperties.map((prop) => (
                <Area
                  key={prop}
                  type="monotone"
                  dataKey={prop}
                  name={propertyLabels[prop] || prop}
                  stroke={propertyColors[prop] || '#6b7280'}
                  fill={propertyColors[prop] || '#6b7280'}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs text-muted-foreground" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number, name: string) => [
                  value.toFixed(2),
                  propertyLabels[name] || name,
                ]}
              />
              <Legend />
              {selectedProperties.map((prop) => (
                <Line
                  key={prop}
                  type="monotone"
                  dataKey={prop}
                  name={propertyLabels[prop] || prop}
                  stroke={propertyColors[prop] || '#6b7280'}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}
