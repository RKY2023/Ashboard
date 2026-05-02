import { ObjectId } from 'mongodb';
import { getNotificationsCollection, getHouseholdMembersCollection } from '@/src/lib/db';
import { ResourceType } from '@/src/types';

export interface AppChannelPayload {
  householdId: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: ObjectId;
  channels: ('app' | 'email' | 'push' | 'sms')[];
}

/**
 * Insert one in-app notification per household member. Real other-channel
 * delivery is delegated to dedicated adapters; we keep `channels` on the row
 * so the UI can show the user where the alert went.
 */
export async function deliverApp(payload: AppChannelPayload): Promise<number> {
  const members = await getHouseholdMembersCollection();
  const notifications = await getNotificationsCollection();

  const recipients = await members
    .find({ householdId: payload.householdId, isActive: true } as never)
    .toArray();

  if (recipients.length === 0) return 0;

  const now = new Date();
  await notifications.insertMany(
    recipients.map((m) => ({
      userId: m.userId,
      householdId: payload.householdId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      isRead: false,
      channels: payload.channels,
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    })) as never
  );

  return recipients.length;
}
