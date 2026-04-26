import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';
import { ObjectId } from 'mongodb';
import { getDevicesCollection } from '@/src/lib/db';

// MQTT message types
export interface DeviceMessage {
  deviceId: string;
  householdId: string;
  type: 'state' | 'command' | 'status' | 'discovery';
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface DeviceStateUpdate {
  deviceId: string;
  state: Record<string, unknown>;
  isOnline: boolean;
}

// MQTT Client Manager
class MQTTClientManager extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private topicHandlers: Map<string, (topic: string, message: Buffer) => void> = new Map();

  constructor() {
    super();
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      console.log('MQTT client already connected');
      return;
    }

    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const options: IClientOptions = {
      clientId: `ashboard-server-${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 5000,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    };

    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(brokerUrl, options);

        this.client.on('connect', () => {
          console.log('MQTT connected to broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.subscribeToHouseholdTopics();
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          this.emit('error', err);
          if (!this.isConnected) {
            reject(err);
          }
        });

        this.client.on('close', () => {
          console.log('MQTT connection closed');
          this.isConnected = false;
          this.emit('disconnected');
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`MQTT reconnecting... attempt ${this.reconnectAttempts}`);
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.client?.end();
            this.emit('maxReconnectAttempts');
          }
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client?.end(false, {}, () => {
          this.client = null;
          this.isConnected = false;
          console.log('MQTT disconnected');
          resolve();
        });
      });
    }
  }

  /**
   * Subscribe to household device topics
   */
  private subscribeToHouseholdTopics(): void {
    if (!this.client) return;

    // Subscribe to device state updates
    // Topic format: ashboard/{householdId}/devices/{deviceId}/state
    this.client.subscribe('ashboard/+/devices/+/state', (err) => {
      if (err) {
        console.error('Failed to subscribe to device state topics:', err);
      } else {
        console.log('Subscribed to device state topics');
      }
    });

    // Subscribe to device availability
    // Topic format: ashboard/{householdId}/devices/{deviceId}/availability
    this.client.subscribe('ashboard/+/devices/+/availability', (err) => {
      if (err) {
        console.error('Failed to subscribe to availability topics:', err);
      }
    });

    // Subscribe to device discovery
    // Topic format: ashboard/{householdId}/discovery
    this.client.subscribe('ashboard/+/discovery', (err) => {
      if (err) {
        console.error('Failed to subscribe to discovery topics:', err);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const payload = JSON.parse(message.toString());
      const topicParts = topic.split('/');

      // Parse topic: ashboard/{householdId}/devices/{deviceId}/{messageType}
      if (topicParts[0] !== 'ashboard') return;

      const householdId = topicParts[1];
      const messageType = topicParts[topicParts.length - 1];

      if (topicParts[2] === 'devices' && topicParts[3]) {
        const deviceId = topicParts[3];

        switch (messageType) {
          case 'state':
            await this.handleDeviceState(householdId, deviceId, payload);
            break;
          case 'availability':
            await this.handleDeviceAvailability(householdId, deviceId, payload);
            break;
        }
      } else if (topicParts[2] === 'discovery') {
        await this.handleDiscovery(householdId, payload);
      }

      // Emit for WebSocket forwarding
      this.emit('message', {
        topic,
        householdId,
        payload,
      });

    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  /**
   * Handle device state update
   */
  private async handleDeviceState(
    householdId: string,
    deviceId: string,
    state: Record<string, unknown>
  ): Promise<void> {
    try {
      const devices = await getDevicesCollection();

      await devices.updateOne(
        {
          _id: new ObjectId(deviceId),
          householdId: new ObjectId(householdId),
        },
        {
          $set: {
            state,
            isOnline: true,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      this.emit('deviceState', {
        deviceId,
        householdId,
        state,
        isOnline: true,
      } as DeviceStateUpdate);

    } catch (error) {
      console.error('Error updating device state:', error);
    }
  }

  /**
   * Handle device availability update
   */
  private async handleDeviceAvailability(
    householdId: string,
    deviceId: string,
    payload: { online: boolean }
  ): Promise<void> {
    try {
      const devices = await getDevicesCollection();

      await devices.updateOne(
        {
          _id: new ObjectId(deviceId),
          householdId: new ObjectId(householdId),
        },
        {
          $set: {
            isOnline: payload.online,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      this.emit('deviceAvailability', {
        deviceId,
        householdId,
        isOnline: payload.online,
      });

    } catch (error) {
      console.error('Error updating device availability:', error);
    }
  }

  /**
   * Handle device discovery
   */
  private async handleDiscovery(
    householdId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    this.emit('discovery', {
      householdId,
      device: payload,
    });
  }

  /**
   * Publish a command to a device
   */
  async publishCommand(
    householdId: string,
    deviceId: string,
    command: string,
    value: unknown
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const topic = `ashboard/${householdId}/devices/${deviceId}/set`;
    const payload = JSON.stringify({
      command,
      value,
      timestamp: Date.now(),
    });

    return new Promise((resolve, reject) => {
      this.client?.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, payload: unknown, qos: 0 | 1 | 2 = 1): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.client?.publish(topic, message, { qos }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Subscribe to a custom topic
   */
  subscribe(topic: string, handler: (topic: string, message: Buffer) => void): void {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    this.topicHandlers.set(topic, handler);
    this.client.subscribe(topic);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string): void {
    if (!this.client) return;

    this.topicHandlers.delete(topic);
    this.client.unsubscribe(topic);
  }

  /**
   * Check if connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const mqttClient = new MQTTClientManager();

// Helper to initialize MQTT on server startup
export async function initializeMQTT(): Promise<void> {
  if (process.env.MQTT_BROKER_URL) {
    try {
      await mqttClient.connect();
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
    }
  } else {
    console.log('MQTT broker URL not configured, skipping MQTT initialization');
  }
}
