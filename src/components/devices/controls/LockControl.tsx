'use client';

import { cn } from '@/lib/utils';
import {
  Lock,
  Unlock,
  Key,
  History,
  Shield,
  ShieldAlert,
  Battery,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface LockControlProps {
  deviceId: string;
  name: string;
  state: {
    locked?: boolean;
    batteryLevel?: number;
    jammed?: boolean;
    autoLock?: boolean;
    autoLockDelay?: number;
  };
  capabilities: string[];
  isOnline: boolean;
  onControl: (command: string, value: unknown) => void;
}

export function LockControl({
  deviceId: _deviceId,
  name,
  state,
  capabilities,
  isOnline,
  onControl,
}: LockControlProps) {
  // _deviceId available for future use (e.g., access log queries)
  const isLocked = state.locked ?? false;
  const isJammed = state.jammed ?? false;
  const batteryLevel = state.batteryLevel;
  const autoLock = state.autoLock ?? false;
  const autoLockDelay = state.autoLockDelay ?? 30;

  const handleToggleLock = () => {
    onControl('locked', !isLocked);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isLocked
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            )}
          >
            {isLocked ? (
              <Lock className="w-6 h-6" />
            ) : (
              <Unlock className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {isOnline ? (isLocked ? 'Locked' : 'Unlocked') : 'Offline'}
            </p>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Jammed warning */}
      {isJammed && (
        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Lock Jammed</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              The lock mechanism is jammed and needs attention.
            </p>
          </div>
        </div>
      )}

      {/* Main lock button */}
      <button
        onClick={handleToggleLock}
        disabled={!isOnline || isJammed}
        className={cn(
          'w-full py-6 rounded-xl flex flex-col items-center justify-center gap-2 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isLocked
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
        )}
      >
        {isLocked ? (
          <>
            <Lock className="w-12 h-12" />
            <span className="text-lg font-semibold">Tap to Unlock</span>
          </>
        ) : (
          <>
            <Unlock className="w-12 h-12" />
            <span className="text-lg font-semibold">Tap to Lock</span>
          </>
        )}
      </button>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Battery */}
        {batteryLevel !== undefined && (
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
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
              <span className="text-sm text-muted-foreground">Battery</span>
            </div>
            <p className="text-xl font-bold">{batteryLevel}%</p>
          </div>
        )}

        {/* Security status */}
        <div className="p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
          <p className="text-xl font-bold">
            {isJammed ? 'Jammed' : isLocked ? 'Secure' : 'Unsecured'}
          </p>
        </div>
      </div>

      {/* Auto-lock settings */}
      {capabilities.includes('auto_lock') && (
        <div className="space-y-4">
          <label className="text-sm font-medium">Auto-Lock Settings</label>

          {/* Toggle auto-lock */}
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-Lock</p>
                <p className="text-sm text-muted-foreground">
                  Automatically lock after {autoLockDelay} seconds
                </p>
              </div>
            </div>
            <button
              onClick={() => onControl('autoLock', !autoLock)}
              disabled={!isOnline}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                autoLock ? 'bg-primary' : 'bg-accent',
                !isOnline && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  autoLock ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Auto-lock delay */}
          {autoLock && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delay</span>
                <span className="text-sm font-medium">{autoLockDelay}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={autoLockDelay}
                onChange={(e) => onControl('autoLockDelay', parseInt(e.target.value))}
                disabled={!isOnline}
                className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10s</span>
                <span>120s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Quick Actions</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              // TODO: Navigate to access log
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">Access Log</span>
          </button>
          <button
            onClick={() => {
              // TODO: Navigate to user management
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Key className="w-4 h-4" />
            <span className="text-sm">Manage Codes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
