import { NextResponse, type NextRequest } from 'next/server';
import { generateCodeVerifier, generateState } from 'arctic';
import {
  getGitHubClient,
  getGoogleClient,
  isProviderConfigured,
} from '@/src/lib/auth/oauth';
import type { OAuthProvider } from '@/src/types';

const STATE_COOKIE = 'oauth_state';
const PKCE_COOKIE = 'oauth_pkce';
const COOKIE_MAX_AGE = 60 * 10; // 10 minutes

/**
 * Begin the OAuth dance. Generates a fresh state (and PKCE verifier for
 * Google), stashes both as HttpOnly+Secure+SameSite=Lax cookies, and 302s
 * to the provider's authorize URL.
 *
 * If the provider isn't configured we return 404 — same shape as a missing
 * route — so attackers can't enumerate which providers are wired up.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: { provider: string } }
) {
  const provider = ctx.params.provider as OAuthProvider;
  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const state = generateState();
  let url: URL;
  let codeVerifier: string | null = null;

  if (provider === 'google') {
    codeVerifier = generateCodeVerifier();
    url = getGoogleClient().createAuthorizationURL(state, codeVerifier, [
      'openid',
      'email',
      'profile',
    ]);
  } else {
    url = getGitHubClient().createAuthorizationURL(state, ['read:user', 'user:email']);
  }

  const response = NextResponse.redirect(url.toString());
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  if (codeVerifier) {
    response.cookies.set(PKCE_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
  } else {
    // Clear stale verifier from a prior provider attempt.
    response.cookies.delete(PKCE_COOKIE);
  }

  // Tag the cookies with the provider so the callback knows which client to
  // construct without re-reading params.
  response.cookies.set('oauth_provider', provider, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}

// Don't reuse cached responses — every visit must mint a fresh state.
export const dynamic = 'force-dynamic';
