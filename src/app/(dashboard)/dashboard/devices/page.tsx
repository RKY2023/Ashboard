'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import { DeviceList } from '@/src/components/devices/DeviceList';
import { DeviceDetailModal } from '@/src/components/devices/DeviceDetailModal';
import { DevicePairingWizard } from '@/src/components/devices/DevicePairingWizard';
import { useWebSocket } from '@/src/lib/hooks/useWebSocket';
import { Plus, Search, Filter, LayoutGrid, List, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  _id: string;
  name: string;
  type: string;
  roomId?: string;
  roomName?: string;
  manufacturer?: string;
  model?: string;
  protocol?: string;
  state: Record<string, unknown>;
  capabilities: string[];
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt?: string;
}

export default function DevicesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterOnline, setFilterOnline] = useState<boolean | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showPairingWizard, setShowPairingWizard] = useState(false);

  const { sendDeviceControl, isConnected } = useWebSocket();
  const utils = trpc.useUtils();

  // Fetch devices
  const {
    data: devicesData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.devices.list.useQuery({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    type: filterType as never,
    isOnline: filterOnline,
  });

  // Fetch rooms for room names
  const { data: roomsData } = trpc.rooms.list.useQuery();

  // Fetch device stats
  const { data: stats } = trpc.devices.stats.useQuery();

  // Create room lookup
  const roomLookup = new Map(
    roomsData?.map((room) => [room._id, room.name]) || []
  );

  // Merge room names into devices
  const devicesWithRooms = devicesData?.items.map((device) => ({
    ...device,
    roomName: device.roomId ? roomLookup.get(device.roomId) : undefined,
  })) || [];

  const deviceTypes = [
    'light', 'switch', 'thermostat', 'lock', 'sensor', 'camera',
    'doorbell', 'garage', 'plug', 'fan', 'blinds', 'speaker', 'tv', 'appliance',
  ];

  // Delete device mutation
  const deleteDevice = trpc.devices.delete.useMutation({
    onSuccess: () => {
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      setSelectedDevice(null);
    },
  });

  // Handle device control
  const handleDeviceControl = async (command: string, value: unknown) => {
    if (!selectedDevice) return;

    if (isConnected) {
      await sendDeviceControl(selectedDevice._id, command, value);
    }

    // Optimistically update local state
    setSelectedDevice({
      ...selectedDevice,
      state: { ...selectedDevice.state, [command]: value },
    });
  };

  // Handle device click
  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <p className="text-muted-foreground">
            {stats ? (
              <>
                {stats.online} online of {stats.total} devices
              </>
            ) : (
              'Manage your smart home devices'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowPairingWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Devices</p>
          </div>
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold text-green-500">{stats.online}</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold text-red-500">{stats.offline}</p>
            <p className="text-sm text-muted-foreground">Offline</p>
          </div>
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold">{roomsData?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Rooms</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors',
              showFilters
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-accent'
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'p-2 transition-colors',
                view === 'grid' ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-2 transition-colors',
                view === 'list' ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Device Type</label>
              <select
                value={filterType || ''}
                onChange={(e) => setFilterType(e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="">All Types</option>
                {deviceTypes.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={filterOnline === undefined ? '' : filterOnline.toString()}
                onChange={(e) => {
                  if (e.target.value === '') setFilterOnline(undefined);
                  else setFilterOnline(e.target.value === 'true');
                }}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="">All</option>
                <option value="true">Online</option>
                <option value="false">Offline</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilterType(undefined);
                setFilterOnline(undefined);
                setSearch('');
              }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Device List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : devicesWithRooms.length === 0 ? (
        <EmptyState
          hasFilters={!!search || !!filterType || filterOnline !== undefined}
          onAddDevice={() => setShowPairingWizard(true)}
        />
      ) : (
        <DeviceList
          devices={devicesWithRooms}
          view={view}
          onViewChange={setView}
          onDeviceClick={handleDeviceClick}
        />
      )}

      {/* Device Detail Modal */}
      <DeviceDetailModal
        device={selectedDevice}
        isOpen={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onControl={handleDeviceControl}
        onDelete={(device) => deleteDevice.mutate({ deviceId: device._id })}
      />

      {/* Device Pairing Wizard */}
      <DevicePairingWizard
        isOpen={showPairingWizard}
        onClose={() => setShowPairingWizard(false)}
        onComplete={(_deviceId) => {
          // _deviceId available to navigate to device detail if needed
          setShowPairingWizard(false);
          utils.devices.list.invalidate();
          utils.devices.stats.invalidate();
        }}
      />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onAddDevice,
}: {
  hasFilters: boolean;
  onAddDevice: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl">
        <Search className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No devices match your filters</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Try adjusting your search or filter criteria to find devices.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
        <Plus className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No devices yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        Connect your first smart device to start controlling your home. We support
        Zigbee, Z-Wave, WiFi, and Matter devices.
      </p>
      <button
        onClick={onAddDevice}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Your First Device
      </button>
    </div>
  );
}
