'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Plus,
  Search,
  Zap,
  Clock,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Play,
  Edit2,
  Copy,
  Trash2,
  Loader2,
  Lightbulb,
  Sun,
  Moon,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'automations' | 'scenes' | 'schedules';

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('automations');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automation</h1>
          <p className="text-muted-foreground">
            Create automations, scenes, and schedules
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: Open create modal based on active tab
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'automations' && 'New Automation'}
          {activeTab === 'scenes' && 'New Scene'}
          {activeTab === 'schedules' && 'New Schedule'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {(['automations', 'scenes', 'schedules'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize',
              activeTab === tab
                ? 'bg-background shadow'
                : 'hover:bg-background/50'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Content */}
      {activeTab === 'automations' && <AutomationsList search={search} />}
      {activeTab === 'scenes' && <ScenesList search={search} />}
      {activeTab === 'schedules' && <SchedulesList search={search} />}
    </div>
  );
}

function AutomationsList({ search }: { search: string }) {
  const utils = trpc.useUtils();

  const { data: automations, isLoading } = trpc.automation.list.useQuery({
    search: search || undefined,
  });

  const toggleAutomation = trpc.automation.toggle.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });

  const triggerAutomation = trpc.automation.trigger.useMutation();

  const deleteAutomation = trpc.automation.delete.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!automations || automations.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="w-8 h-8" />}
        title="No automations yet"
        description="Create your first automation to control your devices automatically based on triggers and conditions."
        actionLabel="Create Automation"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-3">
      {automations.map((automation) => (
        <AutomationCard
          key={automation._id}
          automation={automation}
          onToggle={() => toggleAutomation.mutate({ automationId: automation._id })}
          onTrigger={() => triggerAutomation.mutate({ automationId: automation._id })}
          onEdit={() => {}}
          onDelete={() => deleteAutomation.mutate({ automationId: automation._id })}
        />
      ))}
    </div>
  );
}

function AutomationCard({
  automation,
  onToggle,
  onTrigger,
  onEdit,
  onDelete,
}: {
  automation: {
    _id: string;
    name: string;
    description?: string;
    triggers: unknown[];
    conditions: unknown[];
    actions: unknown[];
    isEnabled: boolean;
    lastTriggeredAt?: string;
    executionCount: number;
  };
  onToggle: () => void;
  onTrigger: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-border bg-card transition-colors',
        !automation.isEnabled && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            automation.isEnabled
              ? 'bg-primary/10 text-primary'
              : 'bg-accent text-muted-foreground'
          )}
        >
          <Zap className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{automation.name}</h3>
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                automation.isEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {automation.isEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          {automation.description && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {automation.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{automation.triggers.length} trigger(s)</span>
            <span>{automation.conditions.length} condition(s)</span>
            <span>{automation.actions.length} action(s)</span>
            {automation.lastTriggeredAt && (
              <span>
                Last run: {new Date(automation.lastTriggeredAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {automation.isEnabled ? (
              <ToggleRight className="w-5 h-5 text-primary" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <button
            onClick={onTrigger}
            disabled={!automation.isEnabled}
            className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <DropdownMenu
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenesList({ search }: { search: string }) {
  const utils = trpc.useUtils();

  const { data: scenes, isLoading } = trpc.scenes.list.useQuery({
    search: search || undefined,
  });

  const activateScene = trpc.scenes.activate.useMutation();

  const deleteScene = trpc.scenes.delete.useMutation({
    onSuccess: () => utils.scenes.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scenes || scenes.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb className="w-8 h-8" />}
        title="No scenes yet"
        description="Create scenes to control multiple devices with a single tap. Perfect for 'Movie Night', 'Good Morning', or 'Away Mode'."
        actionLabel="Create Scene"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {scenes.map((scene) => (
        <SceneCard
          key={scene._id}
          scene={scene}
          onActivate={() => activateScene.mutate({ sceneId: scene._id })}
          onEdit={() => {}}
          onDelete={() => deleteScene.mutate({ sceneId: scene._id })}
        />
      ))}
    </div>
  );
}

function SceneCard({
  scene,
  onActivate,
  onEdit,
  onDelete,
}: {
  scene: {
    _id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    actions: unknown[];
    activationCount: number;
    lastActivatedAt?: string;
  };
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const getSceneIcon = () => {
    switch (scene.icon) {
      case 'sun':
        return <Sun className="w-6 h-6" />;
      case 'moon':
        return <Moon className="w-6 h-6" />;
      case 'home':
        return <Home className="w-6 h-6" />;
      default:
        return <Lightbulb className="w-6 h-6" />;
    }
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: scene.color || 'var(--accent)' }}
        >
          {getSceneIcon()}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <DropdownMenu
              onEdit={onEdit}
              onDelete={onDelete}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>

      <h3 className="font-medium mb-1">{scene.name}</h3>
      {scene.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {scene.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {scene.actions.length} device(s)
        </span>
        <button
          onClick={onActivate}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Activate
        </button>
      </div>
    </div>
  );
}

function SchedulesList({ search }: { search: string }) {
  const utils = trpc.useUtils();

  const { data: schedules, isLoading } = trpc.schedules.list.useQuery({
    search: search || undefined,
  });

  const toggleSchedule = trpc.schedules.toggle.useMutation({
    onSuccess: () => utils.schedules.list.invalidate(),
  });

  const deleteSchedule = trpc.schedules.delete.useMutation({
    onSuccess: () => utils.schedules.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="w-8 h-8" />}
        title="No schedules yet"
        description="Create schedules to automate your home based on time. Turn on lights at sunset, adjust thermostat at night, and more."
        actionLabel="Create Schedule"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <ScheduleCard
          key={schedule._id}
          schedule={schedule}
          onToggle={() => toggleSchedule.mutate({ scheduleId: schedule._id })}
          onEdit={() => {}}
          onDelete={() => deleteSchedule.mutate({ scheduleId: schedule._id })}
        />
      ))}
    </div>
  );
}

function ScheduleCard({
  schedule,
  onToggle,
  onEdit,
  onDelete,
}: {
  schedule: {
    _id: string;
    name: string;
    description?: string;
    timing: {
      type: string;
      time?: string;
      days?: number[];
      cron?: string;
    };
    action: { type: string };
    isEnabled: boolean;
    nextRunAt?: string;
    runCount: number;
  };
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const formatTiming = () => {
    const { timing } = schedule;
    if (timing.type === 'daily' && timing.time) {
      return `Daily at ${timing.time}`;
    }
    if (timing.type === 'weekly' && timing.time && timing.days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = timing.days.map((d) => dayNames[d]).join(', ');
      return `${days} at ${timing.time}`;
    }
    if (timing.type === 'cron' && timing.cron) {
      return `Cron: ${timing.cron}`;
    }
    return timing.type;
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-border bg-card transition-colors',
        !schedule.isEnabled && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            schedule.isEnabled
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-accent text-muted-foreground'
          )}
        >
          <Clock className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{schedule.name}</h3>
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                schedule.isEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {schedule.isEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatTiming()}
          </p>
          {schedule.nextRunAt && schedule.isEnabled && (
            <p className="text-xs text-muted-foreground mt-1">
              Next run: {new Date(schedule.nextRunAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {schedule.isEnabled ? (
              <ToggleRight className="w-5 h-5 text-primary" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <DropdownMenu
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {description}
      </p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {actionLabel}
      </button>
    </div>
  );
}

function DropdownMenu({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-lg shadow-lg z-20 py-1">
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => {
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-accent transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>
  );
}
