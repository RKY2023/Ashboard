'use client';

import { DeviceCard } from './DeviceCard';
import { useWebSocket } from '@/src/lib/hooks/useWebSocket';
import { useDeviceStore } from '@/src/lib/store';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  _id: string;
  name: string;
  type: string;
  roomId?: string;
  roomName?: string;
  state: Record<string, unknown>;
  capabilities: string[];
  isOnline: boolean;
}

interface DeviceListProps {
  devices: Device[];
  isLoading?: boolean;
  view?: 'grid' | 'list';
  onViewChange?: (view: 'grid' | 'list') => void;
  onDeviceClick?: (device: Device) => void;
}

export function DeviceList({
  devices,
  isLoading,
  view = 'grid',
  onViewChange: _onViewChange,
  onDeviceClick,
}: DeviceListProps) {
  // _onViewChange passed from parent but view toggle is in parent component
  const { sendDeviceControl, isConnected } = useWebSocket();
  const deviceStates = useDeviceStore((state) => state.devices);

  // Merge server state with real-time state
  const mergedDevices = devices.map((device) => {
    const realtimeState = deviceStates[device._id];
    if (realtimeState) {
      return {
        ...device,
        state: { ...device.state, ...realtimeState.state },
        isOnline: realtimeState.isOnline ?? device.isOnline,
      };
    }
    return device;
  });

  const handleControl = async (deviceId: string, command: string, value: unknown) => {
    if (isConnected) {
      await sendDeviceControl(deviceId, command, value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No devices found</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        view === 'grid'
          ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'space-y-2'
      )}
    >
      {mergedDevices.map((device) => (
        <DeviceCard
          key={device._id}
          device={device}
          onClick={() => onDeviceClick?.(device)}
          onControl={(command, value) => handleControl(device._id, command, value)}
        />
      ))}
    </div>
  );
}

// List view item component
export function DeviceListItem({
  device,
  onClick,
  onControl,
}: {
  device: Device;
  onClick?: () => void;
  onControl?: (command: string, value: unknown) => void;
}) {
  const isOn = device.state.on === true || device.state.power === true;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border border-border',
        'hover:bg-accent/50 cursor-pointer transition-colors',
        !device.isOnline && 'opacity-60'
      )}
    >
      {/* Status dot */}
      <div
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          device.isOnline ? 'bg-green-500' : 'bg-gray-400'
        )}
      />

      {/* Device info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{device.name}</h4>
          <span className="text-xs text-muted-foreground capitalize">
            {device.type}
          </span>
        </div>
        {device.roomName && (
          <p className="text-sm text-muted-foreground truncate">
            {device.roomName}
          </p>
        )}
      </div>

      {/* State indicator */}
      {device.capabilities.includes('on_off') && (
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            isOn
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isOn ? 'On' : 'Off'}
        </span>
      )}

      {/* Quick toggle */}
      {device.capabilities.includes('on_off') && device.isOnline && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onControl?.('on', !isOn);
          }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isOn
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent hover:bg-accent/80'
          )}
        >
          <div className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
