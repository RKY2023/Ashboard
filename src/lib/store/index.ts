import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// UI State Store
interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Device State Store (for real-time device states)
interface DeviceState {
  devices: Record<string, DeviceStatus>;
  setDeviceState: (deviceId: string, state: Partial<DeviceStatus>) => void;
  setDeviceOnline: (deviceId: string, online: boolean) => void;
  clearDeviceStates: () => void;
}

interface DeviceStatus {
  id: string;
  isOnline: boolean;
  state: Record<string, unknown>;
  lastUpdated: number;
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  devices: {},
  setDeviceState: (deviceId, state) =>
    set((prev) => ({
      devices: {
        ...prev.devices,
        [deviceId]: {
          ...prev.devices[deviceId],
          id: deviceId,
          ...state,
          lastUpdated: Date.now(),
        },
      },
    })),
  setDeviceOnline: (deviceId, online) =>
    set((prev) => ({
      devices: {
        ...prev.devices,
        [deviceId]: {
          ...prev.devices[deviceId],
          id: deviceId,
          isOnline: online,
          lastUpdated: Date.now(),
        },
      },
    })),
  clearDeviceStates: () => set({ devices: {} }),
}));

// Notification Store
interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      notifications: [
        { ...notification, id, timestamp: Date.now(), read: false },
        ...state.notifications,
      ].slice(0, 50), // Keep only latest 50
      unreadCount: state.unreadCount + 1,
    }));
  },
  markAsRead: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (notification && !notification.read) {
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }
      return state;
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  removeNotification: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

// Command Palette Store
interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>()((set) => ({
  isOpen: false,
  query: '',
  open: () => set({ isOpen: true, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen, query: '' })),
  setQuery: (query) => set({ query }),
}));

// Dashboard Widgets Store
interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  config?: Record<string, unknown>;
}

interface DashboardState {
  widgets: WidgetConfig[];
  isEditMode: boolean;
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  setWidgets: (widgets: WidgetConfig[]) => void;
  toggleEditMode: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: [],
      isEditMode: false,
      addWidget: (widget) =>
        set((state) => ({
          widgets: [
            ...state.widgets,
            { ...widget, id: `widget-${Date.now()}` },
          ],
        })),
      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        })),
      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),
      setWidgets: (widgets) => set({ widgets }),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
