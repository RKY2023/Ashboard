import { ObjectId } from 'mongodb';
import { ResourceType } from '@/src/types';
import { deliverApp } from './channels/app';
import { deliverEmail, deliverPush, deliverSms } from './channels/stubs';

export type NotificationChannel = 'app' | 'email' | 'push' | 'sms';
export type NotificationType = 'info' | 'warning' | 'alert' | 'success';

export interface DispatchInput {
  householdId: string;
  type?: NotificationType;
  title: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: ObjectId;
  channels?: NotificationChannel[];
}

/**
 * Fan-out a notification to a household across its configured channels.
 * `app` always inserts a per-user row in `notifications`; the other channels
 * are stubs until their provider integrations land.
 */
export async function dispatchNotification(input: DispatchInput): Promise<{ recipientCount: number }> {
  const channels: NotificationChannel[] = input.channels?.length ? input.channels : ['app'];

  let recipientCount = 0;

  if (channels.includes('app')) {
    recipientCount = await deliverApp({
      householdId: input.householdId,
      type: input.type ?? 'info',
      title: input.title,
      message: input.message,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      channels,
    });
  }

  await Promise.all([
    channels.includes('email') ? deliverEmail({ householdId: input.householdId, title: input.title }) : null,
    channels.includes('push') ? deliverPush({ householdId: input.householdId, title: input.title }) : null,
    channels.includes('sms') ? deliverSms({ householdId: input.householdId, title: input.title }) : null,
  ]);

  return { recipientCount };
}
