import { dispatchNotification } from '@/server/notifications/dispatch';
import { publishDeviceCommand } from './publishCommand';
import { runScene } from './runScene';

export interface AutomationActionDoc {
  id?: string;
  type: 'device_control' | 'scene' | 'delay' | 'notification' | 'webhook';
  deviceId?: string;
  command?: string;
  value?: unknown;
  sceneId?: string;
  delaySeconds?: number;
  title?: string;
  message?: string;
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookBody?: string;
}

export interface ActionRunResult {
  index: number;
  type: AutomationActionDoc['type'];
  success: boolean;
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutomationActions(params: {
  householdId: string;
  actions: AutomationActionDoc[];
  reason: string;
}): Promise<ActionRunResult[]> {
  const { householdId, actions, reason } = params;
  const results: ActionRunResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    try {
      switch (action.type) {
        case 'device_control': {
          if (!action.deviceId || !action.command) {
            throw new Error('device_control action requires deviceId and command');
          }
          await publishDeviceCommand({
            householdId,
            deviceId: action.deviceId,
            command: action.command,
            value: action.value,
          });
          break;
        }

        case 'scene': {
          if (!action.sceneId) throw new Error('scene action requires sceneId');
          await runScene({ householdId, sceneId: action.sceneId });
          break;
        }

        case 'delay': {
          const seconds = Math.max(0, Math.min(300, action.delaySeconds ?? 0));
          if (seconds > 0) await sleep(seconds * 1000);
          break;
        }

        case 'notification': {
          await dispatchNotification({
            householdId,
            title: action.title ?? 'Automation',
            message: action.message ?? `Automation fired (${reason})`,
            type: 'info',
          });
          break;
        }

        case 'webhook': {
          if (!action.webhookUrl) throw new Error('webhook action requires webhookUrl');
          const method = action.webhookMethod ?? 'POST';
          await fetch(action.webhookUrl, {
            method,
            headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
            body: method === 'POST' ? action.webhookBody : undefined,
          });
          break;
        }
      }
      results.push({ index: i, type: action.type, success: true });
    } catch (err) {
      results.push({
        index: i,
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}
