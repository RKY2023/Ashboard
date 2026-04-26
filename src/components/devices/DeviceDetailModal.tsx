'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Edit2, ChevronRight, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LightControl } from './controls/LightControl';
import { ThermostatControl } from './controls/ThermostatControl';
import { LockControl } from './controls/LockControl';
import { SensorDisplay } from './controls/SensorDisplay';
import { trpc } from '@/src/app/providers';

interface Device {
  _id: string;
  name: string;
  type: string;
  roomId?: string;
  roomName?: string;
  manufacturer?: string;
  model?: string;
  protocol?: string;
  firmwareVersion?: string;
  state: Record<string, unknown>;
  capabilities: string[];
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt?: string;
}

interface DeviceDetailModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onControl: (command: string, value: unknown) => void;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

type TabType = 'control' | 'settings' | 'history';

export function DeviceDetailModal({
  device,
  isOpen,
  onClose,
  onControl,
  onEdit,
  onDelete,
}: DeviceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('control');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch rooms for assignment dropdown
  const { data: rooms } = trpc.rooms.list.useQuery(undefined, {
    enabled: isOpen && activeTab === 'settings',
  });

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('control');
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !device) return null;

  const renderControl = () => {
    switch (device.type) {
      case 'light':
        return (
          <LightControl
            deviceId={device._id}
            name={device.name}
            state={device.state as {
              on?: boolean;
              brightness?: number;
              colorTemp?: number;
              color?: { h: number; s: number; l: number };
            }}
            capabilities={device.capabilities}
            isOnline={device.isOnline}
            onControl={onControl}
          />
        );
      case 'thermostat':
        return (
          <ThermostatControl
            deviceId={device._id}
            name={device.name}
            state={device.state as {
              on?: boolean;
              mode?: 'off' | 'heat' | 'cool' | 'auto' | 'fan';
              currentTemp?: number;
              targetTemp?: number;
              humidity?: number;
              fanSpeed?: 'auto' | 'low' | 'medium' | 'high';
            }}
            capabilities={device.capabilities}
            isOnline={device.isOnline}
            onControl={onControl}
          />
        );
      case 'lock':
        return (
          <LockControl
            deviceId={device._id}
            name={device.name}
            state={device.state as {
              locked?: boolean;
              batteryLevel?: number;
              jammed?: boolean;
              autoLock?: boolean;
              autoLockDelay?: number;
            }}
            capabilities={device.capabilities}
            isOnline={device.isOnline}
            onControl={onControl}
          />
        );
      case 'sensor':
        return (
          <SensorDisplay
            deviceId={device._id}
            name={device.name}
            state={device.state as Record<string, unknown>}
            capabilities={device.capabilities}
            isOnline={device.isOnline}
          />
        );
      default:
        return (
          <GenericDeviceControl
            device={device}
            onControl={onControl}
          />
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                device.isOnline ? 'bg-green-500' : 'bg-gray-400'
              )}
            />
            <div>
              <h2 className="font-semibold">{device.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {device.type} • {device.roomName || 'Unassigned'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['control', 'settings', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'control' && renderControl()}

          {activeTab === 'settings' && (
            <DeviceSettings
              device={device}
              rooms={rooms || []}
              onEdit={onEdit}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}

          {activeTab === 'history' && (
            <DeviceHistory deviceId={device._id} />
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          deviceName={device.name}
          onConfirm={() => {
            onDelete?.(device);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

// Generic control for unsupported device types
function GenericDeviceControl({
  device,
  onControl,
}: {
  device: Device;
  onControl: (command: string, value: unknown) => void;
}) {
  const isOn = device.state.on === true || device.state.power === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <p className="text-4xl mb-2">
          {isOn ? '🟢' : '⚫'}
        </p>
        <h3 className="text-xl font-semibold">{device.name}</h3>
        <p className="text-muted-foreground capitalize">{device.type}</p>
      </div>

      {/* Power toggle */}
      {device.capabilities.includes('on_off') && (
        <button
          onClick={() => onControl('on', !isOn)}
          disabled={!device.isOnline}
          className={cn(
            'w-full py-4 rounded-xl font-medium transition-colors',
            isOn
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-accent text-foreground hover:bg-accent/80',
            !device.isOnline && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isOn ? 'Turn Off' : 'Turn On'}
        </button>
      )}

      {/* State display */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Current State</label>
        <div className="p-4 bg-accent/50 rounded-lg">
          <pre className="text-sm overflow-auto max-h-48">
            {JSON.stringify(device.state, null, 2)}
          </pre>
        </div>
      </div>

      {/* Capabilities */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Capabilities</label>
        <div className="flex flex-wrap gap-2">
          {device.capabilities.map((cap) => (
            <span
              key={cap}
              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
            >
              {cap.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Settings tab
function DeviceSettings({
  device,
  rooms: _rooms,
  onEdit,
  onDelete,
}: {
  device: Device;
  rooms: { _id: string; name: string }[];
  onEdit?: (device: Device) => void;
  onDelete?: () => void;
}) {
  // _rooms will be used for room reassignment feature
  return (
    <div className="space-y-6">
      {/* Device info */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">Device Information</label>

        <div className="space-y-2">
          <InfoRow label="Name" value={device.name} />
          <InfoRow label="Type" value={device.type} />
          <InfoRow label="Room" value={device.roomName || 'Unassigned'} />
          {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
          {device.model && <InfoRow label="Model" value={device.model} />}
          {device.protocol && <InfoRow label="Protocol" value={device.protocol} />}
          {device.firmwareVersion && <InfoRow label="Firmware" value={device.firmwareVersion} />}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">Status</label>

        <div className="space-y-2">
          <InfoRow
            label="Connection"
            value={device.isOnline ? 'Online' : 'Offline'}
            valueClassName={device.isOnline ? 'text-green-500' : 'text-red-500'}
          />
          {device.lastSeenAt && (
            <InfoRow
              label="Last Seen"
              value={new Date(device.lastSeenAt).toLocaleString()}
            />
          )}
          {device.createdAt && (
            <InfoRow
              label="Added"
              value={new Date(device.createdAt).toLocaleDateString()}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">Actions</label>

        <div className="space-y-2">
          <button
            onClick={() => onEdit?.(device)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Edit2 className="w-4 h-4" />
              <span>Edit Device</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={onDelete}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" />
              <span>Delete Device</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium capitalize', valueClassName)}>{value}</span>
    </div>
  );
}

// History tab (placeholder)
function DeviceHistory({ deviceId: _deviceId }: { deviceId: string }) {
  // TODO: Use _deviceId to fetch actual device history from trpc.devices.history
  const mockHistory = [
    { time: '2 mins ago', action: 'Turned on', user: 'John' },
    { time: '15 mins ago', action: 'Brightness set to 80%', user: 'Jane' },
    { time: '1 hour ago', action: 'Turned off', user: 'Automation' },
    { time: '3 hours ago', action: 'Color changed', user: 'John' },
    { time: '6 hours ago', action: 'Turned on', user: 'Schedule' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <History className="w-4 h-4" />
        <span className="text-sm">Recent Activity</span>
      </div>

      <div className="space-y-2">
        {mockHistory.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-accent/50"
          >
            <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.action}</p>
              <p className="text-xs text-muted-foreground">
                {item.time} • by {item.user}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Showing last 5 activities
      </p>
    </div>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({
  deviceName,
  onConfirm,
  onCancel,
}: {
  deviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background rounded-xl border border-border p-6 z-[60]">
        <h3 className="text-lg font-semibold mb-2">Delete Device</h3>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete <strong>{deviceName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
