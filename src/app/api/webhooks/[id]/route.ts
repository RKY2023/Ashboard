import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getWebhooksCollection } from '@/src/lib/db';
import { verifySignature } from '@/server/integrations/hmac';
import { fireTarget } from '@/server/integrations/fireTarget';

/**
 * Inbound webhook entry point.
 *
 * Caller posts JSON to /api/webhooks/<id> with header
 *   X-Ashboard-Signature: sha256=<hex>
 * computed as HMAC-SHA256(rawBody, webhook.secret).
 *
 * On success the configured automation/scene is fired and the call returns
 * 200; bad signatures return 401, missing webhooks 404.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const webhooks = await getWebhooksCollection();
  const webhook = await webhooks.findOne({ _id: new ObjectId(id) });
  if (!webhook) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!webhook.isActive) {
    return NextResponse.json({ error: 'disabled' }, { status: 410 });
  }

  const body = await req.text();
  const signature = req.headers.get('x-ashboard-signature');
  if (!verifySignature(body, webhook.secret, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const householdId = webhook.householdId as unknown as string;
  const result = await fireTarget({
    householdId,
    targetType: webhook.targetType,
    targetId: webhook.targetId,
    reason: 'webhook',
  });

  await webhooks.updateOne(
    { _id: webhook._id },
    {
      $set: { lastTriggeredAt: new Date(), updatedAt: new Date() },
      $inc: { triggerCount: 1 },
    }
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.details }, { status: 500 });
  }
  return NextResponse.json({ ok: true, details: result.details });
}
