'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Radio,
  Bluetooth,
  Zap,
  Loader2,
  Check,
  AlertCircle,
  Lightbulb,
  Power,
  Thermometer,
  Lock,
  Eye,
  Camera,
  DoorOpen,
  Plug,
  Wind,
  Speaker,
  Tv,
  Gauge,
  Search,
} from 'lucide-react';
import { trpc } from '@/src/app/providers';

interface DevicePairingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (deviceId: string) => void;
}

type WizardStep = 'protocol' | 'type' | 'discover' | 'configure' | 'complete';

type Protocol = 'zigbee' | 'zwave' | 'wifi' | 'mqtt' | 'matter' | 'bluetooth';
type DeviceType =
  | 'light'
  | 'switch'
  | 'thermostat'
  | 'lock'
  | 'sensor'
  | 'camera'
  | 'doorbell'
  | 'garage'
  | 'plug'
  | 'fan'
  | 'blinds'
  | 'speaker'
  | 'tv'
  | 'appliance'
  | 'other';

const protocols: { id: Protocol; name: string; icon: React.ReactNode; description: string }[] = [
  { id: 'zigbee', name: 'Zigbee', icon: <Radio className="w-6 h-6" />, description: 'Low-power mesh networking' },
  { id: 'zwave', name: 'Z-Wave', icon: <Radio className="w-6 h-6" />, description: 'Long-range smart home' },
  { id: 'wifi', name: 'Wi-Fi', icon: <Wifi className="w-6 h-6" />, description: 'Direct WiFi connection' },
  { id: 'mqtt', name: 'MQTT', icon: <Zap className="w-6 h-6" />, description: 'Custom MQTT device' },
  { id: 'matter', name: 'Matter', icon: <Radio className="w-6 h-6" />, description: 'Universal smart home standard' },
  { id: 'bluetooth', name: 'Bluetooth', icon: <Bluetooth className="w-6 h-6" />, description: 'Bluetooth Low Energy' },
];

const deviceTypes: { id: DeviceType; name: string; icon: React.ReactNode }[] = [
  { id: 'light', name: 'Light', icon: <Lightbulb className="w-5 h-5" /> },
  { id: 'switch', name: 'Switch', icon: <Power className="w-5 h-5" /> },
  { id: 'thermostat', name: 'Thermostat', icon: <Thermometer className="w-5 h-5" /> },
  { id: 'lock', name: 'Lock', icon: <Lock className="w-5 h-5" /> },
  { id: 'sensor', name: 'Sensor', icon: <Eye className="w-5 h-5" /> },
  { id: 'camera', name: 'Camera', icon: <Camera className="w-5 h-5" /> },
  { id: 'doorbell', name: 'Doorbell', icon: <DoorOpen className="w-5 h-5" /> },
  { id: 'garage', name: 'Garage', icon: <DoorOpen className="w-5 h-5" /> },
  { id: 'plug', name: 'Plug', icon: <Plug className="w-5 h-5" /> },
  { id: 'fan', name: 'Fan', icon: <Wind className="w-5 h-5" /> },
  { id: 'blinds', name: 'Blinds', icon: <Wind className="w-5 h-5" /> },
  { id: 'speaker', name: 'Speaker', icon: <Speaker className="w-5 h-5" /> },
  { id: 'tv', name: 'TV', icon: <Tv className="w-5 h-5" /> },
  { id: 'appliance', name: 'Appliance', icon: <Gauge className="w-5 h-5" /> },
  { id: 'other', name: 'Other', icon: <Power className="w-5 h-5" /> },
];

interface DiscoveredDevice {
  id: string;
  name: string;
  type: DeviceType;
  model?: string;
  manufacturer?: string;
}

export function DevicePairingWizard({ isOpen, onClose, onComplete }: DevicePairingWizardProps) {
  const [step, setStep] = useState<WizardStep>('protocol');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredDevice | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [deviceConfig, setDeviceConfig] = useState({
    name: '',
    roomId: '',
    mqttTopic: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms for assignment
  const { data: rooms } = trpc.rooms.list.useQuery();

  // Create device mutation
  const createDevice = trpc.devices.create.useMutation({
    onSuccess: (result) => {
      setStep('complete');
      onComplete(result._id);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const reset = () => {
    setStep('protocol');
    setSelectedProtocol(null);
    setSelectedType(null);
    setIsDiscovering(false);
    setDiscoveredDevices([]);
    setSelectedDiscovered(null);
    setManualMode(false);
    setDeviceConfig({ name: '', roomId: '', mqttTopic: '' });
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const startDiscovery = () => {
    setIsDiscovering(true);
    setError(null);

    // Simulate device discovery
    setTimeout(() => {
      // Mock discovered devices based on protocol
      const mockDevices: DiscoveredDevice[] = [
        { id: '1', name: 'Living Room Light', type: 'light', manufacturer: 'Philips', model: 'Hue White' },
        { id: '2', name: 'Kitchen Sensor', type: 'sensor', manufacturer: 'Aqara', model: 'Motion Sensor' },
        { id: '3', name: 'Front Door Lock', type: 'lock', manufacturer: 'Yale', model: 'Assure Lock' },
      ];

      setDiscoveredDevices(
        selectedType
          ? mockDevices.filter((d) => d.type === selectedType)
          : mockDevices
      );
      setIsDiscovering(false);
    }, 3000);
  };

  const handleCreateDevice = () => {
    if (!selectedProtocol || !selectedType) return;

    const capabilities = getDefaultCapabilities(selectedType);

    createDevice.mutate({
      name: deviceConfig.name || selectedDiscovered?.name || `New ${selectedType}`,
      type: selectedType,
      protocol: selectedProtocol,
      roomId: deviceConfig.roomId || undefined,
      manufacturer: selectedDiscovered?.manufacturer,
      model: selectedDiscovered?.model,
      mqttTopic: deviceConfig.mqttTopic || undefined,
      capabilities,
    });
  };

  type DeviceCapability = 'on_off' | 'brightness' | 'color' | 'color_temp' | 'temperature' | 'humidity' | 'motion' | 'contact' | 'lock' | 'battery' | 'energy' | 'video' | 'audio' | 'fan_speed' | 'auto_lock';

  const getDefaultCapabilities = (type: DeviceType): DeviceCapability[] => {
    const capabilityMap: Record<DeviceType, DeviceCapability[]> = {
      light: ['on_off', 'brightness'],
      switch: ['on_off'],
      thermostat: ['temperature', 'humidity'],
      lock: ['lock'],
      sensor: ['temperature', 'humidity'],
      camera: ['video'],
      doorbell: ['video', 'audio'],
      garage: ['on_off', 'contact'],
      plug: ['on_off', 'energy'],
      fan: ['on_off'],
      blinds: ['on_off'],
      speaker: ['on_off', 'audio'],
      tv: ['on_off'],
      appliance: ['on_off', 'energy'],
      other: ['on_off'],
    };
    return capabilityMap[type] || (['on_off'] as DeviceCapability[]);
  };

  if (!isOpen) return null;

  const steps: { id: WizardStep; title: string }[] = [
    { id: 'protocol', title: 'Protocol' },
    { id: 'type', title: 'Type' },
    { id: 'discover', title: 'Discover' },
    { id: 'configure', title: 'Configure' },
    { id: 'complete', title: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-xl border border-border z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add New Device</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between">
            {steps.slice(0, -1).map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    currentStepIndex > index
                      ? 'bg-primary text-primary-foreground'
                      : currentStepIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground'
                  )}
                >
                  {currentStepIndex > index ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < steps.length - 2 && (
                  <div
                    className={cn(
                      'w-16 h-1 mx-2',
                      currentStepIndex > index ? 'bg-primary' : 'bg-accent'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {steps.slice(0, -1).map((s) => (
              <span key={s.id}>{s.title}</span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-4 mb-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Protocol Selection */}
          {step === 'protocol' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the communication protocol your device uses.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {protocols.map((protocol) => (
                  <button
                    key={protocol.id}
                    onClick={() => setSelectedProtocol(protocol.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                      selectedProtocol === protocol.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    {protocol.icon}
                    <span className="font-medium">{protocol.name}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {protocol.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Device Type */}
          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                What type of device are you adding?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {deviceTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                      selectedType === type.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    {type.icon}
                    <span className="text-xs font-medium">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Discovery */}
          {step === 'discover' && (
            <div className="space-y-4">
              {!manualMode ? (
                <>
                  {isDiscovering ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="font-medium">Searching for devices...</p>
                      <p className="text-sm text-muted-foreground">
                        Make sure your device is in pairing mode
                      </p>
                    </div>
                  ) : discoveredDevices.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Found {discoveredDevices.length} device(s). Select one to add.
                      </p>
                      <div className="space-y-2">
                        {discoveredDevices.map((device) => (
                          <button
                            key={device.id}
                            onClick={() => setSelectedDiscovered(device)}
                            className={cn(
                              'w-full flex items-center gap-3 p-4 rounded-lg border transition-colors',
                              selectedDiscovered?.id === device.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-accent'
                            )}
                          >
                            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                              {deviceTypes.find((t) => t.id === device.type)?.icon}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {device.manufacturer} {device.model}
                              </p>
                            </div>
                            {selectedDiscovered?.id === device.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={startDiscovery}
                        className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Search again
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Search className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="font-medium mb-2">Ready to discover</p>
                      <p className="text-sm text-muted-foreground text-center mb-6">
                        Put your device in pairing mode, then click the button below.
                      </p>
                      <button
                        onClick={startDiscovery}
                        className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Start Discovery
                      </button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <button
                      onClick={() => setManualMode(true)}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Add device manually instead
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your device details manually.
                  </p>
                  <button
                    onClick={() => setManualMode(false)}
                    className="text-sm text-primary hover:underline"
                  >
                    ← Back to discovery
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Configure */}
          {step === 'configure' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure your new device.
              </p>

              {/* Device name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Name</label>
                <input
                  type="text"
                  value={deviceConfig.name}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, name: e.target.value })}
                  placeholder={selectedDiscovered?.name || `My ${selectedType}`}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Room assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Room (optional)</label>
                <select
                  value={deviceConfig.roomId}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, roomId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="">No room</option>
                  {rooms?.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MQTT topic for MQTT devices */}
              {selectedProtocol === 'mqtt' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">MQTT Topic</label>
                  <input
                    type="text"
                    value={deviceConfig.mqttTopic}
                    onChange={(e) => setDeviceConfig({ ...deviceConfig, mqttTopic: e.target.value })}
                    placeholder="home/living-room/light"
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    The MQTT topic your device publishes and subscribes to.
                  </p>
                </div>
              )}

              {/* Device info summary */}
              <div className="p-4 bg-accent/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Summary</p>
                <div className="text-sm">
                  <p>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="capitalize">{selectedType}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Protocol:</span>{' '}
                    <span className="capitalize">{selectedProtocol}</span>
                  </p>
                  {selectedDiscovered && (
                    <p>
                      <span className="text-muted-foreground">Model:</span>{' '}
                      {selectedDiscovered.manufacturer} {selectedDiscovered.model}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Device Added!</h3>
              <p className="text-muted-foreground text-center mb-6">
                Your {selectedType} has been successfully added to your home.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    reset();
                    setStep('protocol');
                  }}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Add Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'complete' && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <button
              onClick={() => {
                if (step === 'protocol') handleClose();
                else if (step === 'type') setStep('protocol');
                else if (step === 'discover') setStep('type');
                else if (step === 'configure') setStep('discover');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 'protocol' ? 'Cancel' : 'Back'}
            </button>

            <button
              onClick={() => {
                if (step === 'protocol' && selectedProtocol) setStep('type');
                else if (step === 'type' && selectedType) setStep('discover');
                else if (step === 'discover' && (selectedDiscovered || manualMode)) setStep('configure');
                else if (step === 'configure') handleCreateDevice();
              }}
              disabled={
                (step === 'protocol' && !selectedProtocol) ||
                (step === 'type' && !selectedType) ||
                (step === 'discover' && !selectedDiscovered && !manualMode) ||
                createDevice.isPending
              }
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {createDevice.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  {step === 'configure' ? 'Add Device' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
