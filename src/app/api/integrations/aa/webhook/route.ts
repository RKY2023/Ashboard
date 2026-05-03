import { NextRequest, NextResponse } from 'next/server';
import { getAaConsentsCollection } from '@/src/lib/db';
import { getAaAdapter } from '@/src/lib/expense/aa';
import type { AaConsentStatus } from '@/src/types';

/**
 * TSP → Ashboard webhook.
 *
 * Setu (and most AA TSPs) POST a notification when a consent's status
 * changes (granted, revoked, paused). Body shape varies by TSP, so we
 * accept either:
 *   { ConsentStatusNotification: { consentHandle, consentId, ConsentStatus } }
 * or our own normalised shape used by the mock:
 *   { consentHandle, consentId?, status }
 *
 * Signature header: `X-Setu-Signature: sha256=<hex>` for Setu;
 * other TSPs vary. The adapter knows how to verify its own.
 */
export async function POST(req: NextRequest) {
  const adapter = getAaAdapter();
  const rawBody = await req.text();

  const signature =
    req.headers.get('x-setu-signature') ??
    req.headers.get('x-aa-signature') ??
    req.headers.get('x-ashboard-signature');

  if (adapter.provider !== 'mock') {
    if (!adapter.verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { consentHandle, consentId, status } = extractFields(payload);
  if (!consentHandle) {
    return NextResponse.json({ error: 'consentHandle missing' }, { status: 400 });
  }

  const consents = await getAaConsentsCollection();
  const result = await consents.updateOne(
    { consentHandle },
    {
      $set: {
        ...(consentId ? { consentId } : {}),
        ...(status ? { status } : {}),
        lastStatusAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'consent not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

function extractFields(payload: unknown): {
  consentHandle?: string;
  consentId?: string;
  status?: AaConsentStatus;
} {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;

  const setuShape = p.ConsentStatusNotification as
    | Record<string, unknown>
    | undefined;
  if (setuShape) {
    const status = setuShape.ConsentStatus as string | undefined;
    return {
      consentHandle: setuShape.consentHandle as string | undefined,
      consentId: setuShape.consentId as string | undefined,
      status: normaliseStatus(status),
    };
  }

  return {
    consentHandle: p.consentHandle as string | undefined,
    consentId: p.consentId as string | undefined,
    status: normaliseStatus(p.status as string | undefined),
  };
}

function normaliseStatus(status?: string): AaConsentStatus | undefined {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  if (
    [
      'PENDING',
      'ACTIVE',
      'PAUSED',
      'REVOKED',
      'REJECTED',
      'EXPIRED',
      'FAILED',
    ].includes(upper)
  ) {
    return upper as AaConsentStatus;
  }
  return undefined;
}
