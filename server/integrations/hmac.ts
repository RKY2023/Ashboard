import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a webhook secret. URL-safe base64, 32 bytes of entropy.
 */
export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Compute the signature for a body. Used by the dashboard to render an
 * example signature and by the inbound handler to verify the caller.
 */
export function computeSignature(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
}

/**
 * Verify an `X-Ashboard-Signature: sha256=<hex>` header against the body.
 * Constant-time compare to avoid leaking the secret via timing.
 */
export function verifySignature(body: string, secret: string, header: string | null): boolean {
  if (!header) return false;
  const expected = computeSignature(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
