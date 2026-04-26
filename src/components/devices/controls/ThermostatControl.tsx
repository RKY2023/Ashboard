'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Thermometer,
  Flame,
  Snowflake,
  Wind,
  Power,
  ChevronUp,
  ChevronDown,
  Droplets,
} from 'lucide-react';

type ThermostatMode = 'off' | 'heat' | 'cool' | 'auto' | 'fan';

interface ThermostatControlProps {
  deviceId: string;
  name: string;
  state: {
    on?: boolean;
    mode?: ThermostatMode;
    currentTemp?: number;
    targetTemp?: number;
    humidity?: number;
    fanSpeed?: 'auto' | 'low' | 'medium' | 'high';
  };
  capabilities: string[];
  isOnline: boolean;
  onControl: (command: string, value: unknown) => void;
  temperatureUnit?: 'celsius' | 'fahrenheit';
}

const modeIcons: Record<ThermostatMode, React.ComponentType<{ className?: string }>> = {
  off: Power,
  heat: Flame,
  cool: Snowflake,
  auto: Thermometer,
  fan: Wind,
};

const modeColors: Record<ThermostatMode, string> = {
  off: 'text-muted-foreground',
  heat: 'text-orange-500',
  cool: 'text-blue-500',
  auto: 'text-green-500',
  fan: 'text-purple-500',
};

export function ThermostatControl({
  deviceId: _deviceId,
  name,
  state,
  capabilities,
  isOnline,
  onControl,
  temperatureUnit = 'fahrenheit',
}: ThermostatControlProps) {
  // _deviceId available for future use (e.g., schedules)
  const [targetTemp, setTargetTemp] = useState(state.targetTemp || 72);

  const currentTemp = state.currentTemp ?? 0;
  const humidity = state.humidity;
  const mode = state.mode || 'off';
  const fanSpeed = state.fanSpeed || 'auto';
  const isOn = state.on ?? mode !== 'off';

  const minTemp = temperatureUnit === 'celsius' ? 10 : 50;
  const maxTemp = temperatureUnit === 'celsius' ? 32 : 90;
  const tempStep = 1;

  useEffect(() => {
    if (state.targetTemp !== undefined) {
      setTargetTemp(state.targetTemp);
    }
  }, [state.targetTemp]);

  const adjustTemp = (delta: number) => {
    const newTemp = Math.min(maxTemp, Math.max(minTemp, targetTemp + delta));
    setTargetTemp(newTemp);
    onControl('targetTemp', newTemp);
  };

  const setMode = (newMode: ThermostatMode) => {
    onControl('mode', newMode);
  };

  const setFan = (speed: string) => {
    onControl('fanSpeed', speed);
  };

  const ModeIcon = modeIcons[mode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isOn ? modeColors[mode] : 'text-muted-foreground',
              isOn ? 'bg-accent' : 'bg-muted'
            )}
          >
            <ModeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {isOnline ? mode : 'Offline'}
            </p>
          </div>
        </div>

        {/* Current readings */}
        <div className="text-right">
          <p className="text-3xl font-bold">
            {currentTemp}°{temperatureUnit === 'celsius' ? 'C' : 'F'}
          </p>
          {humidity !== undefined && (
            <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
              <Droplets className="w-3 h-3" />
              {humidity}%
            </p>
          )}
        </div>
      </div>

      {/* Temperature control */}
      <div className="flex items-center justify-center gap-6 py-4">
        <button
          onClick={() => adjustTemp(-tempStep)}
          disabled={!isOnline || mode === 'off' || mode === 'fan'}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            'bg-accent hover:bg-accent/80 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-5xl font-bold">
            {targetTemp}°
          </p>
          <p className="text-sm text-muted-foreground mt-1">Target</p>
        </div>

        <button
          onClick={() => adjustTemp(tempStep)}
          disabled={!isOnline || mode === 'off' || mode === 'fan'}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            'bg-accent hover:bg-accent/80 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      </div>

      {/* Temperature slider */}
      <div className="px-4">
        <input
          type="range"
          min={minTemp}
          max={maxTemp}
          value={targetTemp}
          onChange={(e) => setTargetTemp(parseInt(e.target.value))}
          onMouseUp={() => onControl('targetTemp', targetTemp)}
          onTouchEnd={() => onControl('targetTemp', targetTemp)}
          disabled={!isOnline || mode === 'off' || mode === 'fan'}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3b82f6, #22c55e, #f97316)`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{minTemp}°</span>
          <span>{maxTemp}°</span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Mode</label>
        <div className="grid grid-cols-5 gap-2">
          {(['off', 'heat', 'cool', 'auto', 'fan'] as ThermostatMode[]).map((m) => {
            const Icon = modeIcons[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={!isOnline}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                  mode === m
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Icon className={cn('w-5 h-5', mode === m && modeColors[m])} />
                <span className="text-xs capitalize">{m}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fan speed */}
      {(mode === 'fan' || capabilities.includes('fan_speed')) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Fan Speed</label>
          <div className="grid grid-cols-4 gap-2">
            {['auto', 'low', 'medium', 'high'].map((speed) => (
              <button
                key={speed}
                onClick={() => setFan(speed)}
                disabled={!isOnline}
                className={cn(
                  'py-2 px-3 rounded-lg border text-sm capitalize transition-colors',
                  fanSpeed === speed
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status info */}
      <div className="p-4 bg-accent/50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium capitalize">
              {mode === 'off' ? 'Off' :
               currentTemp < targetTemp && mode !== 'cool' ? 'Heating' :
               currentTemp > targetTemp && mode !== 'heat' ? 'Cooling' : 'Idle'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fan</p>
            <p className="font-medium capitalize">{fanSpeed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
