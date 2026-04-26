'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { trpc } from '@/src/app/providers';
import {
  X,
  Trash2,
  Lightbulb,
  Power,
  Thermometer,
  Lock,
  Eye,
  ChevronDown,
} from 'lucide-react';

interface SceneAction {
  deviceId: string;
  command: string;
  value: unknown;
}

interface SceneBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  scene?: {
    _id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    roomId?: string;
    actions: {
      deviceId: string;
      deviceName?: string;
      command: string;
      value: unknown;
    }[];
  };
  onSave: () => void;
}

const iconOptions = [
  { value: 'lightbulb', label: 'Lightbulb', icon: Lightbulb },
  { value: 'power', label: 'Power', icon: Power },
  { value: 'thermometer', label: 'Temperature', icon: Thermometer },
  { value: 'lock', label: 'Lock', icon: Lock },
  { value: 'eye', label: 'Eye', icon: Eye },
];

const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function SceneBuilder({
  isOpen,
  onClose,
  scene,
  onSave,
}: SceneBuilderProps) {
  const [name, setName] = useState(scene?.name || '');
  const [description, setDescription] = useState(scene?.description || '');
  const [icon, setIcon] = useState(scene?.icon || 'lightbulb');
  const [color, setColor] = useState(scene?.color || colorOptions[0]);
  const [roomId, setRoomId] = useState(scene?.roomId || '');
  const [actions, setActions] = useState<SceneAction[]>(
    scene?.actions.map((a) => ({
      deviceId: a.deviceId,
      command: a.command,
      value: a.value,
    })) || []
  );
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
    new Set(scene?.actions.map((a) => a.deviceId) || [])
  );
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const { data: devices } = trpc.devices.list.useQuery({ page: 1, pageSize: 100 });
  const { data: rooms } = trpc.rooms.list.useQuery();

  const createScene = trpc.scenes.create.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  const updateScene = trpc.scenes.update.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  // Update actions when devices are selected
  useEffect(() => {
    if (!devices?.items) return;

    const newActions: SceneAction[] = [];
    selectedDevices.forEach((deviceId) => {
      const device = devices.items.find((d) => d._id === deviceId);
      if (device) {
        // Check if action already exists
        const existingAction = actions.find((a) => a.deviceId === deviceId);
        if (existingAction) {
          newActions.push(existingAction);
        } else {
          // Add default action based on device type
          if (device.capabilities.includes('on_off')) {
            newActions.push({ deviceId, command: 'on', value: true });
          }
        }
      }
    });
    setActions(newActions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevices, devices?.items]);

  const handleSave = () => {
    if (!name.trim() || actions.length === 0) return;

    if (scene) {
      updateScene.mutate({
        sceneId: scene._id,
        name,
        description,
        icon,
        color,
        roomId: roomId || undefined,
        actions,
      });
    } else {
      createScene.mutate({
        name,
        description,
        icon,
        color,
        roomId: roomId || undefined,
        actions,
      });
    }
  };

  const toggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const updateAction = (deviceId: string, command: string, value: unknown) => {
    setActions(
      actions.map((a) =>
        a.deviceId === deviceId ? { ...a, command, value } : a
      )
    );
  };

  const removeDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    newSelected.delete(deviceId);
    setSelectedDevices(newSelected);
  };

  if (!isOpen) return null;

  const isLoading = createScene.isPending || updateScene.isPending;
  const selectedDevicesList = devices?.items.filter((d) =>
    selectedDevices.has(d._id)
  ) || [];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-xl border border-border z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {scene ? 'Edit Scene' : 'Create Scene'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Scene Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Movie Night"
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this scene do?"
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {iconOptions.map((opt) => {
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setIcon(opt.value)}
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                        icon === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent hover:bg-accent/80'
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      color === c && 'ring-2 ring-offset-2 ring-primary'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Room */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Room (optional)</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background"
            >
              <option value="">All Rooms</option>
              {rooms?.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Devices & Actions</label>
              <button
                onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                className="text-sm text-primary hover:underline"
              >
                {showDeviceSelector ? 'Done selecting' : 'Add devices'}
              </button>
            </div>

            {showDeviceSelector && (
              <div className="p-3 bg-accent/50 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {devices?.items.map((device) => (
                  <label
                    key={device._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDevices.has(device._id)}
                      onChange={() => toggleDevice(device._id)}
                      className="rounded"
                    />
                    <span className="text-sm">{device.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {device.type}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {selectedDevicesList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No devices selected. Add devices to configure their states.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDevicesList.map((device) => {
                  const action = actions.find((a) => a.deviceId === device._id);
                  return (
                    <DeviceActionEditor
                      key={device._id}
                      device={device}
                      action={action || { deviceId: device._id, command: 'on', value: true }}
                      onUpdate={(command, value) =>
                        updateAction(device._id, command, value)
                      }
                      onRemove={() => removeDevice(device._id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || actions.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : scene ? 'Save Changes' : 'Create Scene'}
          </button>
        </div>
      </div>
    </>
  );
}

function DeviceActionEditor({
  device,
  action,
  onUpdate,
  onRemove,
}: {
  device: { _id: string; name: string; type: string; capabilities: string[] };
  action: SceneAction;
  onUpdate: (command: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const getActionSummary = () => {
    if (action.command === 'on') {
      return action.value ? 'Turn On' : 'Turn Off';
    }
    if (action.command === 'brightness') {
      return `Brightness: ${action.value}%`;
    }
    if (action.command === 'colorTemp') {
      return `Color Temp: ${action.value}K`;
    }
    return `${action.command}: ${action.value}`;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            {device.type === 'light' && <Lightbulb className="w-4 h-4" />}
            {device.type === 'thermostat' && <Thermometer className="w-4 h-4" />}
            {device.type === 'lock' && <Lock className="w-4 h-4" />}
            {!['light', 'thermostat', 'lock'].includes(device.type) && (
              <Power className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{device.name}</p>
            <p className="text-xs text-muted-foreground">{getActionSummary()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded hover:bg-accent"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-border space-y-3">
          {/* On/Off toggle */}
          {device.capabilities.includes('on_off') && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Power</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate('on', true)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-lg transition-colors',
                    action.command === 'on' && action.value === true
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent hover:bg-accent/80'
                  )}
                >
                  On
                </button>
                <button
                  onClick={() => onUpdate('on', false)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-lg transition-colors',
                    action.command === 'on' && action.value === false
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent hover:bg-accent/80'
                  )}
                >
                  Off
                </button>
              </div>
            </div>
          )}

          {/* Brightness slider */}
          {device.capabilities.includes('brightness') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Brightness</span>
                <span className="text-sm text-muted-foreground">
                  {action.command === 'brightness' ? Number(action.value) : 100}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={action.command === 'brightness' ? Number(action.value) : 100}
                onChange={(e) => onUpdate('brightness', parseInt(e.target.value))}
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          )}

          {/* Color temp slider */}
          {device.capabilities.includes('color_temp') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Color Temperature</span>
                <span className="text-sm text-muted-foreground">
                  {action.command === 'colorTemp' ? Number(action.value) : 4000}K
                </span>
              </div>
              <input
                type="range"
                min="2700"
                max="6500"
                value={action.command === 'colorTemp' ? Number(action.value) : 4000}
                onChange={(e) => onUpdate('colorTemp', parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, #ff8a00, #fff5e6, #87ceeb)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
