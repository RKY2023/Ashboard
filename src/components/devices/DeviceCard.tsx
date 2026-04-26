'use client';

import { cn } from '@/lib/utils';
import {
  Lightbulb,
  Power,
  Thermometer,
  Lock,
  Camera,
  Wind,
  Plug,
  Speaker,
  Tv,
  Eye,
  DoorOpen,
  Gauge,
  MoreVertical,
} from 'lucide-react';

// Device type to icon mapping
const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  light: Lightbulb,
  switch: Power,
  thermostat: Thermometer,
  lock: Lock,
  sensor: Eye,
  camera: Camera,
  doorbell: DoorOpen,
  garage: DoorOpen,
  plug: Plug,
  fan: Wind,
  blinds: Wind,
  speaker: Speaker,
  tv: Tv,
  appliance: Gauge,
  other: Power,
};

interface DeviceCardProps {
  device: {
    _id: string;
    name: string;
    type: string;
    roomName?: string;
    state: Record<string, unknown>;
    capabilities: string[];
    isOnline: boolean;
  };
  onClick?: () => void;
  onControl?: (command: string, value: unknown) => void;
}

export function DeviceCard({ device, onClick, onControl }: DeviceCardProps) {
  const Icon = deviceIcons[device.type] || Power;
  const isOn = device.state.on === true || device.state.power === true;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onControl && device.capabilities.includes('on_off')) {
      onControl('on', !isOn);
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'device-card group relative',
        device.isOnline ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
        isOn && device.isOnline && 'border-primary bg-primary/5'
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-2 h-2 rounded-full',
          device.isOnline ? 'bg-green-500' : 'bg-gray-400'
        )}
      />

      {/* Device icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
          isOn && device.isOnline
            ? 'bg-primary text-primary-foreground'
            : 'bg-accent text-muted-foreground'
        )}
      >
        <Icon className="w-6 h-6" />
      </div>

      {/* Device info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{device.name}</h3>
        {device.roomName && (
          <p className="text-sm text-muted-foreground truncate">
            {device.roomName}
          </p>
        )}
      </div>

      {/* Quick controls */}
      {device.capabilities.includes('on_off') && device.isOnline && (
        <button
          onClick={handleToggle}
          className={cn(
            'mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors',
            isOn
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-accent text-foreground hover:bg-accent/80'
          )}
        >
          {isOn ? 'Turn Off' : 'Turn On'}
        </button>
      )}

      {/* Brightness slider for lights */}
      {device.capabilities.includes('brightness') && device.isOnline && isOn && (
        <div className="mt-3">
          <input
            type="range"
            min="0"
            max="100"
            value={(device.state.brightness as number) || 100}
            onChange={(e) => onControl?.('brightness', parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground text-center mt-1">
            {(device.state.brightness as number) || 100}%
          </p>
        </div>
      )}

      {/* Temperature display for thermostats */}
      {device.type === 'thermostat' && device.isOnline && (
        <div className="mt-3 text-center">
          <p className="text-2xl font-bold">
            {(device.state.currentTemp as number) || '--'}°
          </p>
          <p className="text-xs text-muted-foreground">
            Target: {(device.state.targetTemp as number) || '--'}°
          </p>
        </div>
      )}

      {/* Lock status */}
      {device.type === 'lock' && device.isOnline && (
        <div className="mt-3 text-center">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              device.state.locked
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            <Lock className="w-3 h-3" />
            {device.state.locked ? 'Locked' : 'Unlocked'}
          </span>
        </div>
      )}

      {/* Sensor values */}
      {device.type === 'sensor' && device.isOnline && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          {device.capabilities.includes('temperature') && (
            <div>
              <p className="text-lg font-semibold">
                {(device.state.temperature as number) || '--'}°
              </p>
              <p className="text-xs text-muted-foreground">Temp</p>
            </div>
          )}
          {device.capabilities.includes('humidity') && (
            <div>
              <p className="text-lg font-semibold">
                {(device.state.humidity as number) || '--'}%
              </p>
              <p className="text-xs text-muted-foreground">Humidity</p>
            </div>
          )}
        </div>
      )}

      {/* More options button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Open device options menu
        }}
        className="absolute top-2 right-8 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
}
