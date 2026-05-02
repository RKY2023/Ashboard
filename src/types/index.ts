import { ObjectId } from 'mongodb';

// Base document interface with common fields
export interface BaseDocument {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Multi-tenant types
export interface Household extends BaseDocument {
  name: string;
  slug: string;
  ownerId: ObjectId;
  settings: HouseholdSettings;
  subscription: SubscriptionTier;
  isActive: boolean;
}

export interface HouseholdSettings {
  timezone: string;
  currency: string;
  temperatureUnit: 'celsius' | 'fahrenheit';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';

// User and RBAC types
export interface User extends BaseDocument {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  avatar?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface HouseholdMember extends BaseDocument {
  userId: ObjectId;
  householdId: ObjectId;
  role: UserRole;
  permissions: Permission[];
  invitedBy: ObjectId;
  joinedAt: Date;
  isActive: boolean;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

export type Permission =
  // Device permissions
  | 'devices:read'
  | 'devices:write'
  | 'devices:control'
  | 'devices:delete'
  // Automation permissions
  | 'automation:read'
  | 'automation:write'
  | 'automation:delete'
  | 'automation:execute'
  // Security permissions
  | 'security:read'
  | 'security:arm'
  | 'security:disarm'
  | 'security:manage'
  // Energy permissions
  | 'energy:read'
  | 'energy:manage'
  // Climate permissions
  | 'climate:read'
  | 'climate:write'
  // Notification permissions
  | 'notifications:read'
  | 'notifications:manage'
  // Grocery permissions
  | 'grocery:read'
  | 'grocery:write'
  | 'grocery:delete'
  // Recipe permissions
  | 'recipes:read'
  | 'recipes:write'
  | 'recipes:delete'
  // Finance permissions
  | 'finance:read'
  | 'finance:write'
  | 'finance:delete'
  | 'finance:reports'
  // User management
  | 'users:read'
  | 'users:invite'
  | 'users:manage'
  // Settings
  | 'settings:read'
  | 'settings:write'
  // Reports
  | 'reports:read'
  | 'reports:export'
  // Inventory & Maintenance
  | 'inventory:read'
  | 'inventory:write'
  | 'inventory:delete'
  // Integrations
  | 'integrations:read'
  | 'integrations:write';

// Default permissions by role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'devices:read', 'devices:write', 'devices:control', 'devices:delete',
    'automation:read', 'automation:write', 'automation:delete', 'automation:execute',
    'security:read', 'security:arm', 'security:disarm', 'security:manage',
    'energy:read', 'energy:manage',
    'climate:read', 'climate:write',
    'notifications:read', 'notifications:manage',
    'grocery:read', 'grocery:write', 'grocery:delete',
    'recipes:read', 'recipes:write', 'recipes:delete',
    'finance:read', 'finance:write', 'finance:delete', 'finance:reports',
    'users:read', 'users:invite', 'users:manage',
    'settings:read', 'settings:write',
    'reports:read', 'reports:export',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'integrations:read', 'integrations:write',
  ],
  admin: [
    'devices:read', 'devices:write', 'devices:control',
    'automation:read', 'automation:write', 'automation:execute',
    'security:read', 'security:arm', 'security:disarm',
    'energy:read', 'energy:manage',
    'climate:read', 'climate:write',
    'notifications:read', 'notifications:manage',
    'grocery:read', 'grocery:write', 'grocery:delete',
    'recipes:read', 'recipes:write', 'recipes:delete',
    'finance:read', 'finance:write', 'finance:reports',
    'users:read', 'users:invite',
    'settings:read', 'settings:write',
    'reports:read', 'reports:export',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'integrations:read', 'integrations:write',
  ],
  member: [
    'devices:read', 'devices:control',
    'automation:read', 'automation:execute',
    'security:read', 'security:arm', 'security:disarm',
    'energy:read',
    'climate:read',
    'notifications:read',
    'grocery:read', 'grocery:write',
    'recipes:read', 'recipes:write',
    'finance:read', 'finance:write',
    'users:read',
    'settings:read',
    'reports:read',
    'inventory:read', 'inventory:write',
    'integrations:read',
  ],
  guest: [
    'devices:read', 'devices:control',
    'security:read',
    'grocery:read',
    'recipes:read',
    'inventory:read',
  ],
};

// Session types
export interface Session extends BaseDocument {
  userId: ObjectId;
  householdId?: ObjectId;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
}

// Audit log types
export interface AuditLog extends BaseDocument {
  userId: ObjectId;
  householdId: ObjectId;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: ObjectId;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'invite'
  | 'join'
  | 'leave'
  | 'arm'
  | 'disarm'
  | 'trigger'
  | 'control';

export type ResourceType =
  | 'user'
  | 'household'
  | 'device'
  | 'room'
  | 'automation'
  | 'scene'
  | 'schedule'
  | 'security'
  | 'energy'
  | 'grocery'
  | 'recipe'
  | 'transaction'
  | 'budget'
  | 'inventory'
  | 'maintenance'
  | 'webhook'
  | 'integration';

// Device types
export type DeviceType =
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

export type DeviceProtocol =
  | 'zigbee'
  | 'zwave'
  | 'wifi'
  | 'bluetooth'
  | 'mqtt'
  | 'matter'
  | 'thread';

export interface Device extends BaseDocument {
  householdId: ObjectId;
  roomId?: ObjectId;
  name: string;
  type: DeviceType;
  protocol: DeviceProtocol;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  mqttTopic?: string;
  state: Record<string, unknown>;
  capabilities: DeviceCapability[];
  isOnline: boolean;
  lastSeenAt?: Date;
  isActive: boolean;
}

export type DeviceCapability =
  | 'on_off'
  | 'brightness'
  | 'color'
  | 'color_temp'
  | 'temperature'
  | 'humidity'
  | 'motion'
  | 'contact'
  | 'lock'
  | 'battery'
  | 'energy'
  | 'video'
  | 'audio'
  | 'fan_speed'
  | 'auto_lock';

export type DeviceHistorySource = 'user' | 'automation' | 'mqtt' | 'schedule' | 'api';

export interface DeviceHistory {
  _id: ObjectId;
  deviceId: ObjectId;
  householdId: ObjectId;
  timestamp: Date;
  property: string;
  value: unknown;
  previousValue?: unknown;
  source: DeviceHistorySource;
  userId?: ObjectId;
}

export interface Room extends BaseDocument {
  householdId: ObjectId;
  name: string;
  icon?: string;
  floor?: number;
  order: number;
  isActive: boolean;
}

// Automation types
export interface Automation extends BaseDocument {
  householdId: ObjectId;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggers: AutomationTrigger[];
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  lastTriggeredAt?: Date;
  executionCount: number;
}

export interface AutomationTrigger {
  type: 'device' | 'time' | 'sun' | 'webhook' | 'manual';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  type: 'device' | 'time' | 'sun' | 'and' | 'or';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'device' | 'scene' | 'notification' | 'delay' | 'webhook';
  config: Record<string, unknown>;
}

export interface Scene extends BaseDocument {
  householdId: ObjectId;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  roomId?: ObjectId;
  actions: SceneAction[];
  order: number;
  activationCount: number;
  lastActivatedAt?: Date;
  isActive: boolean;
}

export interface SceneAction {
  deviceId: ObjectId;
  command: string;
  value: unknown;
}

export interface Schedule extends BaseDocument {
  householdId: ObjectId;
  name: string;
  description?: string;
  timing: ScheduleTiming;
  action: ScheduleAction;
  isEnabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  isActive: boolean;
}

export interface ScheduleTiming {
  type: 'daily' | 'weekly' | 'once' | 'cron';
  time?: string;
  days?: number[];
  date?: string;
  cron?: string;
  timezone: string;
}

export type ScheduleAction =
  | { type: 'device_control'; deviceId: string; command: string; value: unknown }
  | { type: 'scene'; sceneId: string }
  | { type: 'automation'; automationId: string };

// Energy types
export interface EnergyReading extends BaseDocument {
  householdId: ObjectId;
  deviceId?: ObjectId;
  timestamp: Date;
  power: number; // Watts
  energy: number; // kWh
  cost?: number;
}

export interface EnergyBudget extends BaseDocument {
  householdId: ObjectId;
  name: string;
  month: number;
  year: number;
  limitKwh: number;
  limitCost: number;
  alertThreshold: number; // percentage
}

// Climate types
export interface ClimateZone extends BaseDocument {
  householdId: ObjectId;
  name: string;
  thermostatDeviceIds: ObjectId[];
  targetTemperature: number;
  unit: 'celsius' | 'fahrenheit';
  mode: 'off' | 'heat' | 'cool' | 'auto' | 'fan';
  humidity?: number;
  isActive: boolean;
}

export interface ClimateSchedule extends BaseDocument {
  householdId: ObjectId;
  zoneId: ObjectId;
  name: string;
  entries: ClimateScheduleEntry[];
  isEnabled: boolean;
}

export interface ClimateScheduleEntry {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // HH:mm
  targetTemperature: number;
  mode: 'off' | 'heat' | 'cool' | 'auto' | 'fan';
}

// Alert rule type for notifications
export interface AlertRule extends BaseDocument {
  householdId: ObjectId;
  name: string;
  resourceType: ResourceType;
  condition: Record<string, unknown>;
  channels: ('app' | 'email' | 'push' | 'sms')[];
  isEnabled: boolean;
  cooldownMinutes?: number;
  lastFiredAt?: Date;
  lastEvaluatedAt?: Date;
  lastValue?: number;
}

// Security types
export interface SecurityEvent extends BaseDocument {
  householdId: ObjectId;
  deviceId?: ObjectId;
  type: 'motion' | 'door' | 'window' | 'alarm' | 'tamper' | 'smoke' | 'co' | 'water';
  severity: 'info' | 'warning' | 'alert' | 'critical';
  message: string;
  isAcknowledged: boolean;
  acknowledgedBy?: ObjectId;
  acknowledgedAt?: Date;
}

export interface SecurityMode extends BaseDocument {
  householdId: ObjectId;
  name: string;
  mode: 'disarmed' | 'home' | 'away' | 'night' | 'vacation';
  deviceSettings: Record<string, unknown>;
  isActive: boolean;
}

// Grocery types
export interface GroceryItem extends BaseDocument {
  householdId: ObjectId;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: 'pantry' | 'fridge' | 'freezer' | 'other';
  expiryDate?: Date;
  purchaseDate?: Date;
  price?: number;
  barcode?: string;
  notes?: string;
  isLow: boolean;
  reorderThreshold?: number;
}

export interface ShoppingList extends BaseDocument {
  householdId: ObjectId;
  name: string;
  items: ShoppingListItem[];
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isPurchased: boolean;
  groceryItemId?: ObjectId;
  recipeId?: ObjectId;
}

// Recipe types
export interface Recipe extends BaseDocument {
  householdId: ObjectId;
  name: string;
  description?: string;
  servings: number;
  prepTime: number; // minutes
  cookTime: number; // minutes
  ingredients: RecipeIngredient[];
  instructions: string[];
  tags: string[];
  cuisine?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  nutrition?: NutritionInfo;
  imageUrl?: string;
  sourceUrl?: string;
  isFavorite: boolean;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional: boolean;
  groceryItemId?: ObjectId;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface MealPlan extends BaseDocument {
  householdId: ObjectId;
  date: Date;
  meals: MealPlanEntry[];
}

export interface MealPlanEntry {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: ObjectId;
  name: string;
  servings: number;
}

// Finance types
export interface Transaction extends BaseDocument {
  householdId: ObjectId;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: ObjectId;
  accountId?: ObjectId;
  description: string;
  date: Date;
  payee?: string;
  isRecurring: boolean;
  recurringId?: ObjectId;
  tags: string[];
  receiptUrl?: string;
  groceryItemIds?: ObjectId[];
}

export interface Budget extends BaseDocument {
  householdId: ObjectId;
  name: string;
  month: number;
  year: number;
  categories: BudgetCategory[];
  totalLimit: number;
}

export interface BudgetCategory {
  categoryId: ObjectId;
  name: string;
  limit: number;
  spent: number;
  alertThreshold: number;
}

export interface FinanceCategory extends BaseDocument {
  householdId: ObjectId;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  parentId?: ObjectId;
  isSystem: boolean;
}

export interface Account extends BaseDocument {
  householdId: ObjectId;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface RecurringPayment extends BaseDocument {
  householdId: ObjectId;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: ObjectId;
  accountId?: ObjectId;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextDueDate: Date;
  isActive: boolean;
}

// Notification types
export interface Notification extends BaseDocument {
  userId: ObjectId;
  householdId: ObjectId;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: ObjectId;
  isRead: boolean;
  readAt?: Date;
  channels: ('app' | 'email' | 'push' | 'sms')[];
  sentAt?: Date;
}

// Inventory & maintenance types
export interface InventoryItem extends BaseDocument {
  householdId: ObjectId;
  name: string;
  category?: string;
  description?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  purchasedAt?: Date;
  purchasedPrice?: number;
  warrantyExpiresAt?: Date;
  location?: string;
  roomId?: ObjectId;
  quantity: number;
  isActive: boolean;
}

export type MaintenanceCadence = 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

export interface MaintenanceTask extends BaseDocument {
  householdId: ObjectId;
  inventoryItemId?: ObjectId;
  name: string;
  description?: string;
  cadence: MaintenanceCadence;
  intervalDays?: number;
  nextDueAt: Date;
  lastCompletedAt?: Date;
  assigneeId?: ObjectId;
  isComplete: boolean;
  isActive: boolean;
}

// Camera & access-log types
export interface Camera extends BaseDocument {
  householdId: ObjectId;
  name: string;
  hlsUrl: string;
  snapshotUrl?: string;
  roomId?: ObjectId;
  isActive: boolean;
  lastSeenAt?: Date;
}

export interface AccessLogEntry extends BaseDocument {
  householdId: ObjectId;
  actorId?: ObjectId;
  actorName?: string;
  deviceId?: ObjectId;
  deviceName?: string;
  action: string;
  detail?: string;
  at: Date;
}

// Integration types
export interface Integration extends BaseDocument {
  householdId: ObjectId;
  name: string;
  type: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  isConnected: boolean;
  lastSyncAt?: Date;
}

export type WebhookTargetType = 'automation' | 'scene';

export interface Webhook extends BaseDocument {
  householdId: ObjectId;
  name: string;
  description?: string;
  secret: string;
  targetType: WebhookTargetType;
  targetId: ObjectId;
  isActive: boolean;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

export type VoiceProvider = 'alexa' | 'google' | 'generic';

export interface VoiceIntent extends BaseDocument {
  householdId: ObjectId;
  provider: VoiceProvider;
  intent: string;
  targetType: WebhookTargetType;
  targetId: ObjectId;
  isActive: boolean;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// JWT payload types
export interface JwtPayload {
  sub: string; // userId
  email: string;
  householdId?: string;
  role?: UserRole;
  permissions?: Permission[];
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

// Context types for tRPC
export interface AuthContext {
  userId: ObjectId;
  user: User;
  householdId?: ObjectId;
  household?: Household;
  member?: HouseholdMember;
  role?: UserRole;
  permissions: Permission[];
}
