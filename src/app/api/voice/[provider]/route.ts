import { NextRequest, NextResponse } from 'next/server';
import { getVoiceIntentsCollection } from '@/src/lib/db';
import { fireTarget } from '@/server/integrations/fireTarget';
import { VoiceProvider } from '@/src/types';

/**
 * Voice-assistant entry point. Providers (Alexa skill / Google action /
 * generic webhook) post:
 *
 *   { householdId: "<id>", intent: "<name>" }
 *
 * The handler looks up the matching VoiceIntent and fires its target. Auth
 * is intentionally simple here — the provider is expected to be locked
 * down separately (signed Alexa requests, Google service-account auth).
 * Households not exposed to a voice integration won't have any intents
 * registered, so the lookup is the access boundary.
 */
const VALID_PROVIDERS: ReadonlySet<VoiceProvider> = new Set(['alexa', 'google', 'generic']);

export async function POST(req: NextRequest, ctx: { params: { provider: string } }) {
  const provider = ctx.params.provider as VoiceProvider;
  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'unknown provider' }, { status: 404 });
  }

  let payload: { householdId?: string; intent?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { householdId, intent } = payload;
  if (!householdId || !intent) {
    return NextResponse.json({ error: 'householdId and intent are required' }, { status: 400 });
  }

  const intents = await getVoiceIntentsCollection();
  const match = await intents.findOne({
    householdId,
    provider,
    intent: intent.toLowerCase(),
    isActive: true,
  } as never);

  if (!match) {
    return NextResponse.json({ error: 'no matching intent' }, { status: 404 });
  }

  const result = await fireTarget({
    householdId,
    targetType: match.targetType,
    targetId: match.targetId,
    reason: 'voice',
  });

  await intents.updateOne(
    { _id: match._id },
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
