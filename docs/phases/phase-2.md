# Phase 2 — Device Management

Full device lifecycle: registry, room assignment, real-time control via MQTT, state ingestion, and history.

## What shipped

### Routers
- `server/trpc/routers/devices/index.ts` — CRUD, control, paginated list, online/offline state, capability-aware schemas.
- `server/trpc/routers/devices/history.ts` — time-series state changes per device with bucketed aggregations.
- `server/trpc/routers/rooms.ts` — room CRUD, reorder, unassigned-devices query, device counts per room.

### Real-time infrastructure
- `server/mqtt/index.ts` — singleton MQTT client (using `mqtt`) that subscribes to topic patterns, dispatches messages into the device-state pipeline, and publishes outbound commands. Reconnect/backoff built in.
- `server/websocket/index.ts` — Socket.IO server attached to the Next custom request handler. Bridges MQTT events to authenticated browser sockets, namespaced by household.
- `src/lib/hooks/useWebSocket.ts` — client hook that subscribes to device updates and pushes them into the Zustand device store, so UI re-renders without re-fetching.

### Components
- `src/components/devices/DeviceList.tsx` — paginated table/grid with search and filters.
- `src/components/devices/DeviceCard.tsx` — compact tile with online dot, primary action, room/protocol badges.
- `src/components/devices/DeviceDetailModal.tsx` — full state, capabilities, audit log, manual control.
- `src/components/devices/DeviceHistoryChart.tsx` — recharts line/bar of state changes over time.
- `src/components/devices/DevicePairingWizard.tsx` — multi-step pairing UI that listens for new MQTT topics.
- `src/components/devices/controls/{LightControl,ThermostatControl,LockControl,SensorDisplay}.tsx` — capability-driven UIs (on/off, brightness, color temp, lock state, sensor read-only).

### Pages
- `src/app/(dashboard)/dashboard/devices/page.tsx` — device list page.
- `src/app/(dashboard)/dashboard/rooms/page.tsx` — room management with grid/list toggle, reorder, edit/delete modals.

## Schema highlights

```ts
Device {
  householdId, roomId?,
  name, type, protocol,        // light/switch/thermostat/lock/sensor/...
  manufacturer?, model?, firmwareVersion?,
  mqttTopic?,
  state: Record<string, unknown>,  // free-form, validated per capability
  capabilities: DeviceCapability[],
  isOnline, lastSeenAt?, isActive
}

DeviceHistory {
  deviceId, householdId,
  timestamp, property, value, previousValue?,
  source: 'user' | 'automation' | 'mqtt' | 'schedule' | 'api',
  userId?
}
```

The state object is intentionally `Record<string, unknown>` so new device types don't require schema migrations — the UI maps capabilities to the right property names (`on`, `brightness`, `targetTemperature`, `locked`, etc).

## Permissions

| Permission | Grants |
|------------|--------|
| `devices:read` | List & get devices, rooms |
| `devices:write` | Create/update devices, manage rooms |
| `devices:control` | Send commands (changes state, no schema changes) |
| `devices:delete` | Soft-delete devices |

`devices:control` is split out so guests can flip a light without being able to rename or delete it.

## Why these choices

- **MQTT as the device transport** keeps the cloud dashboard out of the critical path — devices stay reachable on the LAN even when the SaaS layer is down.
- **WebSocket bridge** rather than direct MQTT-in-browser: lets the server authorize subscriptions per household and avoids exposing the broker.
- **History as a separate collection** with a TTL-friendly compound index `(householdId, deviceId, timestamp)` keeps the device document small and lets analytics aggregate without touching live state.

## Critical files

```
server/mqtt/index.ts
server/websocket/index.ts
server/trpc/routers/devices/{index,history}.ts
server/trpc/routers/rooms.ts
src/lib/hooks/useWebSocket.ts
src/components/devices/**
src/app/(dashboard)/dashboard/{devices,rooms}/page.tsx
```
