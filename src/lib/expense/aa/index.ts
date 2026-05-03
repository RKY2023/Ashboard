import { MockAaAdapter } from './mock';
import { SetuAaAdapter } from './setu';
import type { AaAdapter } from './types';

let cached: AaAdapter | null = null;

/**
 * Returns the configured AA TSP adapter. If `AA_PROVIDER=mock` (the default
 * when no Setu credentials are set) the in-process mock is used. Set
 * `AA_PROVIDER=setu` plus the four `SETU_AA_*` vars in `.env.local` to use
 * the real Setu Bridge.
 */
export function getAaAdapter(): AaAdapter {
  if (cached) return cached;

  const provider = (process.env.AA_PROVIDER ?? '').toLowerCase();
  if (
    provider === 'setu' ||
    (provider === '' &&
      process.env.SETU_AA_CLIENT_ID &&
      process.env.SETU_AA_CLIENT_SECRET)
  ) {
    cached = new SetuAaAdapter({
      baseUrl:
        process.env.SETU_AA_BASE_URL ?? 'https://fiu-uat.setu.co',
      clientId: process.env.SETU_AA_CLIENT_ID ?? '',
      clientSecret: process.env.SETU_AA_CLIENT_SECRET ?? '',
      productInstanceId: process.env.SETU_AA_PRODUCT_INSTANCE_ID ?? '',
      webhookSecret: process.env.SETU_AA_WEBHOOK_SECRET,
    });
    return cached;
  }

  cached = new MockAaAdapter();
  return cached;
}

/**
 * Test helper — replace the cached adapter (or clear it).
 */
export function setAaAdapter(adapter: AaAdapter | null): void {
  cached = adapter;
}

export { aaTxnToParsed } from './map';
export type * from './types';
