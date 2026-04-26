import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/src/lib/auth/jwt';
import { mqttClient } from '@/server/mqtt';

// Types
interface AuthenticatedSocket extends Socket {
  userId?: string;
  householdId?: string;
}

interface DeviceUpdate {
  deviceId: string;
  householdId: string;
  state?: Record<string, unknown>;
  isOnline?: boolean;
}

// WebSocket Server Manager
class WebSocketManager {
  private io: SocketIOServer | null = null;
  private householdSockets: Map<string, Set<string>> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = await verifyAccessToken(token);
        if (!payload) {
          return next(new Error('Invalid token'));
        }

        socket.userId = payload.sub;
        socket.householdId = payload.householdId;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    // Subscribe to MQTT events
    this.setupMQTTBridge();

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    console.log(`Client connected: ${socket.id}, user: ${socket.userId}`);

    // Join household room if householdId is set
    if (socket.householdId) {
      this.joinHousehold(socket, socket.householdId);
    }

    // Handle switching households
    socket.on('switchHousehold', (householdId: string) => {
      // Leave previous household
      if (socket.householdId) {
        this.leaveHousehold(socket, socket.householdId);
      }
      // Join new household
      socket.householdId = householdId;
      this.joinHousehold(socket, householdId);
    });

    // Handle device control commands
    socket.on('deviceControl', async (data: { deviceId: string; command: string; value: unknown }) => {
      if (!socket.householdId) return;

      try {
        // Forward to MQTT
        await mqttClient.publishCommand(
          socket.householdId,
          data.deviceId,
          data.command,
          data.value
        );

        // Acknowledge to sender
        socket.emit('deviceControlAck', {
          deviceId: data.deviceId,
          command: data.command,
          success: true,
        });
      } catch (error) {
        socket.emit('deviceControlAck', {
          deviceId: data.deviceId,
          command: data.command,
          success: false,
          error: 'Failed to send command',
        });
      }
    });

    // Handle scene activation
    socket.on('activateScene', async (sceneId: string) => {
      if (!socket.householdId) return;

      // Emit to household for other clients
      this.emitToHousehold(socket.householdId, 'sceneActivated', {
        sceneId,
        activatedBy: socket.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (socket.householdId) {
        this.leaveHousehold(socket, socket.householdId);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  }

  /**
   * Join a household room
   */
  private joinHousehold(socket: AuthenticatedSocket, householdId: string): void {
    socket.join(`household:${householdId}`);

    // Track socket in household
    if (!this.householdSockets.has(householdId)) {
      this.householdSockets.set(householdId, new Set());
    }
    this.householdSockets.get(householdId)!.add(socket.id);

    console.log(`Socket ${socket.id} joined household ${householdId}`);

    // Notify others in household
    socket.to(`household:${householdId}`).emit('userJoined', {
      userId: socket.userId,
      socketId: socket.id,
    });
  }

  /**
   * Leave a household room
   */
  private leaveHousehold(socket: AuthenticatedSocket, householdId: string): void {
    socket.leave(`household:${householdId}`);

    // Remove from tracking
    const sockets = this.householdSockets.get(householdId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.householdSockets.delete(householdId);
      }
    }

    console.log(`Socket ${socket.id} left household ${householdId}`);

    // Notify others
    socket.to(`household:${householdId}`).emit('userLeft', {
      userId: socket.userId,
      socketId: socket.id,
    });
  }

  /**
   * Setup bridge between MQTT and WebSocket
   */
  private setupMQTTBridge(): void {
    // Forward device state updates to WebSocket clients
    mqttClient.on('deviceState', (update: DeviceUpdate) => {
      this.emitToHousehold(update.householdId, 'deviceState', {
        deviceId: update.deviceId,
        state: update.state,
        isOnline: update.isOnline,
        timestamp: Date.now(),
      });
    });

    // Forward device availability updates
    mqttClient.on('deviceAvailability', (update: DeviceUpdate) => {
      this.emitToHousehold(update.householdId, 'deviceAvailability', {
        deviceId: update.deviceId,
        isOnline: update.isOnline,
        timestamp: Date.now(),
      });
    });

    // Forward discovery events
    mqttClient.on('discovery', (data: { householdId: string; device: unknown }) => {
      this.emitToHousehold(data.householdId, 'deviceDiscovered', {
        device: data.device,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Emit event to all sockets in a household
   */
  emitToHousehold(householdId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`household:${householdId}`).emit(event, data);
  }

  /**
   * Emit event to a specific user
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;

    // Find all sockets for this user
    const sockets = this.io.sockets.sockets;
    sockets.forEach((socket) => {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.userId === userId) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Get number of connected clients for a household
   */
  getHouseholdClientCount(householdId: string): number {
    return this.householdSockets.get(householdId)?.size || 0;
  }

  /**
   * Get total connected clients
   */
  getTotalClientCount(): number {
    if (!this.io) return 0;
    return this.io.sockets.sockets.size;
  }

  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close(() => {
          this.io = null;
          this.householdSockets.clear();
          console.log('WebSocket server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// Export types
export type { AuthenticatedSocket, DeviceUpdate };
