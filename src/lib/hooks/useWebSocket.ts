'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/src/lib/auth/AuthProvider';
import { useDeviceStore } from '@/src/lib/store';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface DeviceStateUpdate {
  deviceId: string;
  state: Record<string, unknown>;
  isOnline: boolean;
  timestamp: number;
}

interface DeviceAvailabilityUpdate {
  deviceId: string;
  isOnline: boolean;
  timestamp: number;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, currentHouseholdId } = useAuth();
  const { setDeviceState, setDeviceOnline } = useDeviceStore();

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected || state.isConnecting) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState(prev => ({ ...prev, error: 'No auth token' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setState({ isConnected: true, isConnecting: false, error: null });

      // Join household room if we have one
      if (currentHouseholdId) {
        socket.emit('switchHousehold', currentHouseholdId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setState({ isConnected: false, isConnecting: false, error: error.message });
    });

    // Handle device state updates
    socket.on('deviceState', (update: DeviceStateUpdate) => {
      setDeviceState(update.deviceId, {
        state: update.state,
        isOnline: update.isOnline,
      });
    });

    // Handle device availability updates
    socket.on('deviceAvailability', (update: DeviceAvailabilityUpdate) => {
      setDeviceOnline(update.deviceId, update.isOnline);
    });

    socketRef.current = socket;
  }, [currentHouseholdId, setDeviceState, setDeviceOnline, state.isConnecting]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({ isConnected: false, isConnecting: false, error: null });
    }
  }, []);

  // Send device control command
  const sendDeviceControl = useCallback((
    deviceId: string,
    command: string,
    value: unknown
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve(false);
        return;
      }

      socketRef.current.emit('deviceControl', { deviceId, command, value });

      // Wait for acknowledgment
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      socketRef.current.once('deviceControlAck', (ack: { deviceId: string; success: boolean }) => {
        clearTimeout(timeout);
        if (ack.deviceId === deviceId) {
          resolve(ack.success);
        }
      });
    });
  }, []);

  // Activate a scene
  const activateScene = useCallback((sceneId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('activateScene', sceneId);
    }
  }, []);

  // Switch household
  const switchHousehold = useCallback((householdId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('switchHousehold', householdId);
    }
  }, []);

  // Subscribe to custom event
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated && currentHouseholdId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, currentHouseholdId, connect, disconnect]);

  // Switch household when it changes
  useEffect(() => {
    if (state.isConnected && currentHouseholdId) {
      switchHousehold(currentHouseholdId);
    }
  }, [currentHouseholdId, state.isConnected, switchHousehold]);

  return {
    ...state,
    connect,
    disconnect,
    sendDeviceControl,
    activateScene,
    switchHousehold,
    on,
  };
}
