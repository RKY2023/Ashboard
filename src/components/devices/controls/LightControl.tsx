'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Lightbulb, Power, Sun, Moon } from 'lucide-react';

interface LightControlProps {
  deviceId: string;
  name: string;
  state: {
    on?: boolean;
    brightness?: number;
    colorTemp?: number;
    color?: { h: number; s: number; l: number };
  };
  capabilities: string[];
  isOnline: boolean;
  onControl: (command: string, value: unknown) => void;
}

export function LightControl({
  deviceId: _deviceId,
  name,
  state,
  capabilities,
  isOnline,
  onControl,
}: LightControlProps) {
  // _deviceId available for future use (e.g., device-specific settings)
  const [brightness, setBrightness] = useState(state.brightness || 100);
  const [colorTemp, setColorTemp] = useState(state.colorTemp || 4000);
  const [color, setColor] = useState(state.color || { h: 0, s: 100, l: 50 });

  const isOn = state.on ?? false;
  const hasBrightness = capabilities.includes('brightness');
  const hasColorTemp = capabilities.includes('color_temp');
  const hasColor = capabilities.includes('color');

  // Sync local state with incoming state
  useEffect(() => {
    if (state.brightness !== undefined) setBrightness(state.brightness);
    if (state.colorTemp !== undefined) setColorTemp(state.colorTemp);
    if (state.color !== undefined) setColor(state.color);
  }, [state]);

  // Debounced control for sliders
  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
  };

  const handleBrightnessCommit = () => {
    onControl('brightness', brightness);
  };

  const handleColorTempChange = (value: number) => {
    setColorTemp(value);
  };

  const handleColorTempCommit = () => {
    onControl('colorTemp', colorTemp);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isOn && isOnline
                ? 'bg-yellow-400 text-yellow-900'
                : 'bg-accent text-muted-foreground'
            )}
            style={
              isOn && hasColor
                ? {
                    backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
                  }
                : undefined
            }
          >
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOnline ? (isOn ? 'On' : 'Off') : 'Offline'}
            </p>
          </div>
        </div>

        {/* Power toggle */}
        <button
          onClick={() => onControl('on', !isOn)}
          disabled={!isOnline}
          className={cn(
            'p-3 rounded-full transition-colors',
            isOn
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-muted-foreground',
            !isOnline && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Power className="w-5 h-5" />
        </button>
      </div>

      {/* Brightness control */}
      {hasBrightness && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Brightness</label>
            <span className="text-sm text-muted-foreground">{brightness}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              onMouseUp={handleBrightnessCommit}
              onTouchEnd={handleBrightnessCommit}
              disabled={!isOnline || !isOn}
              className="flex-1 h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
            />
            <Sun className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Color temperature control */}
      {hasColorTemp && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Color Temperature</label>
            <span className="text-sm text-muted-foreground">{colorTemp}K</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="2700"
              max="6500"
              value={colorTemp}
              onChange={(e) => handleColorTempChange(parseInt(e.target.value))}
              onMouseUp={handleColorTempCommit}
              onTouchEnd={handleColorTempCommit}
              disabled={!isOnline || !isOn}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              style={{
                background: 'linear-gradient(to right, #ff8a00, #fff5e6, #87ceeb)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Warm</span>
            <span>Cool</span>
          </div>
        </div>
      )}

      {/* Color picker */}
      {hasColor && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="grid grid-cols-8 gap-2">
            {[
              '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
              '#00FFFF', '#0000FF', '#8B00FF', '#FF00FF',
              '#FFB6C1', '#FFA07A', '#FFFACD', '#98FB98',
              '#87CEEB', '#DDA0DD', '#F5DEB3', '#FFFFFF',
            ].map((hexColor) => (
              <button
                key={hexColor}
                onClick={() => {
                  // Convert hex to HSL
                  const hsl = hexToHSL(hexColor);
                  setColor(hsl);
                  onControl('color', hsl);
                }}
                disabled={!isOnline || !isOn}
                className={cn(
                  'w-8 h-8 rounded-full border-2 border-transparent',
                  'hover:scale-110 transition-transform',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={{ backgroundColor: hexColor }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick scenes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Quick Settings</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onControl('brightness', 100);
              onControl('colorTemp', 4000);
            }}
            disabled={!isOnline}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Full Bright
          </button>
          <button
            onClick={() => {
              onControl('brightness', 50);
              onControl('colorTemp', 2700);
            }}
            disabled={!isOnline}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Relaxed
          </button>
          <button
            onClick={() => {
              onControl('brightness', 20);
              onControl('colorTemp', 2700);
            }}
            disabled={!isOnline}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Night Light
          </button>
          <button
            onClick={() => {
              onControl('brightness', 80);
              onControl('colorTemp', 5000);
            }}
            disabled={!isOnline}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Work Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 100, l: 50 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
