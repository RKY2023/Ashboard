'use client';

import { cn } from '@/lib/utils';
import {
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Activity,
  Eye,
  DoorOpen,
  DoorClosed,
  AlertTriangle,
  Battery,
  Zap,
} from 'lucide-react';

interface SensorDisplayProps {
  deviceId: string;
  name: string;
  state: {
    temperature?: number;
    humidity?: number;
    illuminance?: number;
    pressure?: number;
    motion?: boolean;
    contact?: boolean;
    batteryLevel?: number;
    tamper?: boolean;
    occupancy?: boolean;
    co2?: number;
    tvoc?: number;
    power?: number;
    energy?: number;
  };
  capabilities: string[];
  isOnline: boolean;
  temperatureUnit?: 'celsius' | 'fahrenheit';
}

interface SensorCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  alert?: boolean;
}

function SensorCard({ icon, label, value, unit, color = 'text-primary', alert }: SensorCardProps) {
  return (
    <div
      className={cn(
        'p-4 bg-card rounded-lg border border-border',
        alert && 'border-red-500 bg-red-50 dark:bg-red-900/10'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export function SensorDisplay({
  deviceId: _deviceId,
  name,
  state,
  capabilities,
  isOnline,
  temperatureUnit = 'fahrenheit',
}: SensorDisplayProps) {
  // _deviceId available for future use (e.g., history charts)
  const {
    temperature,
    humidity,
    illuminance,
    pressure,
    motion,
    contact,
    batteryLevel,
    tamper,
    occupancy,
    co2,
    tvoc,
    power,
    energy,
  } = state;

  const hasEnvironmental = capabilities.some((c) =>
    ['temperature', 'humidity', 'illuminance', 'pressure', 'co2', 'tvoc'].includes(c)
  );
  const hasSecurity = capabilities.some((c) =>
    ['motion', 'contact', 'occupancy', 'tamper'].includes(c)
  );
  const hasEnergy = capabilities.some((c) => ['power', 'energy'].includes(c));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isOnline ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'
            )}
          >
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Battery indicator */}
        {batteryLevel !== undefined && (
          <div className="flex items-center gap-1">
            <Battery
              className={cn(
                'w-4 h-4',
                batteryLevel > 50
                  ? 'text-green-500'
                  : batteryLevel > 20
                  ? 'text-yellow-500'
                  : 'text-red-500'
              )}
            />
            <span className="text-sm text-muted-foreground">{batteryLevel}%</span>
          </div>
        )}
      </div>

      {/* Tamper alert */}
      {tamper && (
        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Tamper Detected</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              The sensor has detected a possible tamper event.
            </p>
          </div>
        </div>
      )}

      {/* Environmental sensors */}
      {hasEnvironmental && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Environment</label>
          <div className="grid grid-cols-2 gap-3">
            {temperature !== undefined && (
              <SensorCard
                icon={<Thermometer className="w-4 h-4" />}
                label="Temperature"
                value={temperature}
                unit={temperatureUnit === 'celsius' ? '°C' : '°F'}
                color="text-orange-500"
              />
            )}
            {humidity !== undefined && (
              <SensorCard
                icon={<Droplets className="w-4 h-4" />}
                label="Humidity"
                value={humidity}
                unit="%"
                color="text-blue-500"
                alert={humidity > 70 || humidity < 30}
              />
            )}
            {illuminance !== undefined && (
              <SensorCard
                icon={<Sun className="w-4 h-4" />}
                label="Illuminance"
                value={illuminance}
                unit="lux"
                color="text-yellow-500"
              />
            )}
            {pressure !== undefined && (
              <SensorCard
                icon={<Wind className="w-4 h-4" />}
                label="Pressure"
                value={pressure}
                unit="hPa"
                color="text-purple-500"
              />
            )}
            {co2 !== undefined && (
              <SensorCard
                icon={<Activity className="w-4 h-4" />}
                label="CO₂"
                value={co2}
                unit="ppm"
                color="text-gray-500"
                alert={co2 > 1000}
              />
            )}
            {tvoc !== undefined && (
              <SensorCard
                icon={<Activity className="w-4 h-4" />}
                label="TVOC"
                value={tvoc}
                unit="ppb"
                color="text-teal-500"
                alert={tvoc > 500}
              />
            )}
          </div>
        </div>
      )}

      {/* Security sensors */}
      {hasSecurity && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Security</label>
          <div className="grid grid-cols-2 gap-3">
            {motion !== undefined && (
              <div
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  motion
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity
                    className={cn('w-4 h-4', motion ? 'text-yellow-600' : 'text-muted-foreground')}
                  />
                  <span className="text-sm text-muted-foreground">Motion</span>
                </div>
                <p className="text-lg font-semibold">
                  {motion ? 'Detected' : 'Clear'}
                </p>
              </div>
            )}
            {contact !== undefined && (
              <div
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  !contact
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {contact ? (
                    <DoorClosed className="w-4 h-4 text-green-500" />
                  ) : (
                    <DoorOpen className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-muted-foreground">Contact</span>
                </div>
                <p className="text-lg font-semibold">
                  {contact ? 'Closed' : 'Open'}
                </p>
              </div>
            )}
            {occupancy !== undefined && (
              <div
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  occupancy
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                    : 'bg-card border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye
                    className={cn('w-4 h-4', occupancy ? 'text-blue-600' : 'text-muted-foreground')}
                  />
                  <span className="text-sm text-muted-foreground">Occupancy</span>
                </div>
                <p className="text-lg font-semibold">
                  {occupancy ? 'Occupied' : 'Vacant'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Energy sensors */}
      {hasEnergy && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Energy</label>
          <div className="grid grid-cols-2 gap-3">
            {power !== undefined && (
              <SensorCard
                icon={<Zap className="w-4 h-4" />}
                label="Power"
                value={power.toFixed(1)}
                unit="W"
                color="text-amber-500"
              />
            )}
            {energy !== undefined && (
              <SensorCard
                icon={<Activity className="w-4 h-4" />}
                label="Energy"
                value={(energy / 1000).toFixed(2)}
                unit="kWh"
                color="text-green-500"
              />
            )}
          </div>
        </div>
      )}

      {/* Sensor info */}
      <div className="p-4 bg-accent/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Sensor Capabilities</h4>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="px-2 py-1 text-xs rounded-full bg-background border border-border"
            >
              {cap.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
