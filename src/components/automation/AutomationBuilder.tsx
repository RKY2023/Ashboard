'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { trpc } from '@/src/app/providers';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Sun,
  Webhook,
  Hand,
  Lightbulb,
  Power,
  Bell,
  Timer,
  GripVertical,
} from 'lucide-react';

interface Trigger {
  id: string;
  type: 'device_state' | 'time' | 'sun' | 'webhook' | 'manual';
  deviceId?: string;
  property?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'changed';
  value?: unknown;
  time?: string;
  days?: number[];
  cron?: string;
  sunEvent?: 'sunrise' | 'sunset';
  offset?: number;
}

interface Condition {
  id: string;
  type: 'device_state' | 'time_range' | 'day_of_week' | 'sun_position' | 'mode';
  deviceId?: string;
  property?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';
  value?: unknown;
  startTime?: string;
  endTime?: string;
  days?: number[];
  sunCondition?: 'before_sunrise' | 'after_sunrise' | 'before_sunset' | 'after_sunset';
  mode?: string;
  negate?: boolean;
}

interface Action {
  id: string;
  type: 'device_control' | 'scene' | 'delay' | 'notification' | 'webhook';
  deviceId?: string;
  command?: string;
  value?: unknown;
  sceneId?: string;
  delaySeconds?: number;
  title?: string;
  message?: string;
  webhookUrl?: string;
}

interface AutomationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  automation?: {
    _id: string;
    name: string;
    description?: string;
    triggers: Trigger[];
    conditions: Condition[];
    actions: Action[];
    isEnabled: boolean;
  };
  onSave: () => void;
}

export function AutomationBuilder({
  isOpen,
  onClose,
  automation,
  onSave,
}: AutomationBuilderProps) {
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [triggers, setTriggers] = useState<Trigger[]>(
    automation?.triggers || [{ id: '1', type: 'manual' }]
  );
  const [conditions, setConditions] = useState<Condition[]>(
    automation?.conditions || []
  );
  const [actions, setActions] = useState<Action[]>(
    automation?.actions || []
  );
  const [expandedSection, setExpandedSection] = useState<'triggers' | 'conditions' | 'actions' | null>('triggers');

  const { data: devices } = trpc.devices.list.useQuery({ page: 1, pageSize: 100 });
  const { data: scenes } = trpc.scenes.list.useQuery();

  const createAutomation = trpc.automation.create.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  const updateAutomation = trpc.automation.update.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  const handleSave = () => {
    if (!name.trim() || triggers.length === 0 || actions.length === 0) return;

    if (automation) {
      updateAutomation.mutate({
        automationId: automation._id,
        name,
        description,
        triggers,
        conditions,
        actions,
      });
    } else {
      createAutomation.mutate({
        name,
        description,
        triggers,
        conditions,
        actions,
        isEnabled: true,
      });
    }
  };

  const addTrigger = () => {
    setTriggers([
      ...triggers,
      { id: Date.now().toString(), type: 'manual' },
    ]);
  };

  const removeTrigger = (id: string) => {
    if (triggers.length > 1) {
      setTriggers(triggers.filter((t) => t.id !== id));
    }
  };

  const updateTrigger = (id: string, updates: Partial<Trigger>) => {
    setTriggers(triggers.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: Date.now().toString(), type: 'device_state' },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addAction = () => {
    setActions([
      ...actions,
      { id: Date.now().toString(), type: 'device_control' },
    ]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  if (!isOpen) return null;

  const isLoading = createAutomation.isPending || updateAutomation.isPending;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l border-border z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {automation ? 'Edit Automation' : 'Create Automation'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Turn off lights when leaving"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this automation do?"
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Triggers Section */}
          <Section
            title="When... (Triggers)"
            icon={<Zap className="w-4 h-4" />}
            count={triggers.length}
            isExpanded={expandedSection === 'triggers'}
            onToggle={() => setExpandedSection(expandedSection === 'triggers' ? null : 'triggers')}
            onAdd={addTrigger}
          >
            <div className="space-y-3">
              {triggers.map((trigger, index) => (
                <TriggerEditor
                  key={trigger.id}
                  trigger={trigger}
                  devices={devices?.items || []}
                  onUpdate={(updates) => updateTrigger(trigger.id, updates)}
                  onRemove={() => removeTrigger(trigger.id)}
                  canRemove={triggers.length > 1}
                  index={index}
                />
              ))}
            </div>
          </Section>

          {/* Conditions Section */}
          <Section
            title="And if... (Conditions)"
            icon={<Timer className="w-4 h-4" />}
            count={conditions.length}
            isExpanded={expandedSection === 'conditions'}
            onToggle={() => setExpandedSection(expandedSection === 'conditions' ? null : 'conditions')}
            onAdd={addCondition}
            optional
          >
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conditions. The automation will run whenever triggered.
              </p>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <ConditionEditor
                    key={condition.id}
                    condition={condition}
                    devices={devices?.items || []}
                    onUpdate={(updates) => updateCondition(condition.id, updates)}
                    onRemove={() => removeCondition(condition.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Actions Section */}
          <Section
            title="Then do... (Actions)"
            icon={<Power className="w-4 h-4" />}
            count={actions.length}
            isExpanded={expandedSection === 'actions'}
            onToggle={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
            onAdd={addAction}
          >
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add at least one action.
              </p>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <ActionEditor
                    key={action.id}
                    action={action}
                    devices={devices?.items || []}
                    scenes={scenes || []}
                    onUpdate={(updates) => updateAction(action.id, updates)}
                    onRemove={() => removeAction(action.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || triggers.length === 0 || actions.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : automation ? 'Save Changes' : 'Create Automation'}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  onAdd,
  optional,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <div className="text-left">
            <span className="font-medium">{title}</span>
            {optional && <span className="text-xs text-muted-foreground ml-2">(optional)</span>}
          </div>
          <span className="px-2 py-0.5 text-xs rounded-full bg-accent">
            {count}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-border">
          {children}
          <button
            onClick={onAdd}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {title.split('(')[1]?.replace(')', '') || 'item'}
          </button>
        </div>
      )}
    </div>
  );
}

function TriggerEditor({
  trigger,
  devices,
  onUpdate,
  onRemove,
  canRemove,
  index,
}: {
  trigger: Trigger;
  devices: { _id: string; name: string; type: string; capabilities: string[] }[];
  onUpdate: (updates: Partial<Trigger>) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
}) {
  const triggerTypes = [
    { value: 'device_state', label: 'Device State', icon: Lightbulb },
    { value: 'time', label: 'Time', icon: Clock },
    { value: 'sun', label: 'Sunrise/Sunset', icon: Sun },
    { value: 'webhook', label: 'Webhook', icon: Webhook },
    { value: 'manual', label: 'Manual Only', icon: Hand },
  ];

  const operators = [
    { value: 'eq', label: 'equals' },
    { value: 'ne', label: 'not equals' },
    { value: 'gt', label: 'greater than' },
    { value: 'lt', label: 'less than' },
    { value: 'changed', label: 'changes' },
  ];

  return (
    <div className="p-3 bg-accent/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <span className="text-xs text-muted-foreground">Trigger {index + 1}</span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <select
        value={trigger.type}
        onChange={(e) => onUpdate({ type: e.target.value as Trigger['type'] })}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
      >
        {triggerTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {trigger.type === 'device_state' && (
        <>
          <select
            value={trigger.deviceId || ''}
            onChange={(e) => onUpdate({ deviceId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Select device...</option>
            {devices.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Property (e.g., on)"
              value={trigger.property || ''}
              onChange={(e) => onUpdate({ property: e.target.value })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <select
              value={trigger.operator || 'eq'}
              onChange={(e) => onUpdate({ operator: e.target.value as Trigger['operator'] })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              {operators.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          {trigger.operator !== 'changed' && (
            <input
              type="text"
              placeholder="Value"
              value={String(trigger.value || '')}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          )}
        </>
      )}

      {trigger.type === 'time' && (
        <>
          <input
            type="time"
            value={trigger.time || ''}
            onChange={(e) => onUpdate({ time: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
          <DaySelector
            selected={trigger.days || []}
            onChange={(days) => onUpdate({ days })}
          />
        </>
      )}

      {trigger.type === 'sun' && (
        <>
          <select
            value={trigger.sunEvent || 'sunrise'}
            onChange={(e) => onUpdate({ sunEvent: e.target.value as 'sunrise' | 'sunset' })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="sunrise">Sunrise</option>
            <option value="sunset">Sunset</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="0"
              value={trigger.offset || 0}
              onChange={(e) => onUpdate({ offset: parseInt(e.target.value) })}
              className="w-20 px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <span className="text-sm text-muted-foreground">minutes offset</span>
          </div>
        </>
      )}
    </div>
  );
}

function ConditionEditor({
  condition,
  devices,
  onUpdate,
  onRemove,
  index,
}: {
  condition: Condition;
  devices: { _id: string; name: string; type: string }[];
  onUpdate: (updates: Partial<Condition>) => void;
  onRemove: () => void;
  index: number;
}) {
  const conditionTypes = [
    { value: 'device_state', label: 'Device State' },
    { value: 'time_range', label: 'Time Range' },
    { value: 'day_of_week', label: 'Day of Week' },
  ];

  return (
    <div className="p-3 bg-accent/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Condition {index + 1}</span>
        <button onClick={onRemove} className="p-1 rounded hover:bg-accent">
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <select
        value={condition.type}
        onChange={(e) => onUpdate({ type: e.target.value as Condition['type'] })}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
      >
        {conditionTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {condition.type === 'device_state' && (
        <>
          <select
            value={condition.deviceId || ''}
            onChange={(e) => onUpdate({ deviceId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Select device...</option>
            {devices.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </>
      )}

      {condition.type === 'time_range' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <input
              type="time"
              value={condition.startTime || ''}
              onChange={(e) => onUpdate({ startTime: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <input
              type="time"
              value={condition.endTime || ''}
              onChange={(e) => onUpdate({ endTime: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </div>
      )}

      {condition.type === 'day_of_week' && (
        <DaySelector
          selected={condition.days || []}
          onChange={(days) => onUpdate({ days })}
        />
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={condition.negate || false}
          onChange={(e) => onUpdate({ negate: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">Negate (NOT)</span>
      </label>
    </div>
  );
}

function ActionEditor({
  action,
  devices,
  scenes,
  onUpdate,
  onRemove,
  index,
}: {
  action: Action;
  devices: { _id: string; name: string; type: string; capabilities: string[] }[];
  scenes: { _id: string; name: string }[];
  onUpdate: (updates: Partial<Action>) => void;
  onRemove: () => void;
  index: number;
}) {
  const actionTypes = [
    { value: 'device_control', label: 'Control Device', icon: Lightbulb },
    { value: 'scene', label: 'Activate Scene', icon: Power },
    { value: 'delay', label: 'Wait/Delay', icon: Timer },
    { value: 'notification', label: 'Send Notification', icon: Bell },
  ];

  return (
    <div className="p-3 bg-accent/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <span className="text-xs text-muted-foreground">Action {index + 1}</span>
        </div>
        <button onClick={onRemove} className="p-1 rounded hover:bg-accent">
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <select
        value={action.type}
        onChange={(e) => onUpdate({ type: e.target.value as Action['type'] })}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
      >
        {actionTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {action.type === 'device_control' && (
        <>
          <select
            value={action.deviceId || ''}
            onChange={(e) => onUpdate({ deviceId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Select device...</option>
            {devices.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Command (e.g., on)"
              value={action.command || ''}
              onChange={(e) => onUpdate({ command: e.target.value })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <input
              type="text"
              placeholder="Value"
              value={String(action.value || '')}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </>
      )}

      {action.type === 'scene' && (
        <select
          value={action.sceneId || ''}
          onChange={(e) => onUpdate({ sceneId: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="">Select scene...</option>
          {scenes.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      )}

      {action.type === 'delay' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            placeholder="30"
            value={action.delaySeconds || ''}
            onChange={(e) => onUpdate({ delaySeconds: parseInt(e.target.value) })}
            className="w-24 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
          <span className="text-sm text-muted-foreground">seconds</span>
        </div>
      )}

      {action.type === 'notification' && (
        <>
          <input
            type="text"
            placeholder="Title"
            value={action.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
          <textarea
            placeholder="Message"
            value={action.message || ''}
            onChange={(e) => onUpdate({ message: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
          />
        </>
      )}
    </div>
  );
}

function DaySelector({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
}) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const toggle = (day: number) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort());
    }
  };

  return (
    <div className="flex gap-1">
      {days.map((label, index) => (
        <button
          key={index}
          onClick={() => toggle(index)}
          className={cn(
            'w-8 h-8 rounded-full text-sm font-medium transition-colors',
            selected.includes(index)
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-muted-foreground hover:bg-accent/80'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
