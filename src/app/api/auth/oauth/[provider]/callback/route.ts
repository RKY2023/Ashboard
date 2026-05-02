import { NextRequest, NextResponse } from 'next/server';
import { OAuth2RequestError, OAuth2Tokens } from 'arctic';
import {
  findOrCreateUserFromOAuth,
  getGitHubClient,
  getGoogleClient,
  isProviderConfigured,
  OAuthLinkError,
  type OAuthProfile,
} from '@/src/lib/auth/oauth';
import { generateTokenPair } from '@/src/lib/auth';
import {
  getHouseholdMembersCollection,
  getSessionsCollection,
  getUsersCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import type { OAuthProvider, Permission, Session, UserRole } from '@/src/types';

const STATE_COOKIE = 'oauth_state';
const PKCE_COOKIE = 'oauth_pkce';
const PROVIDER_COOKIE = 'oauth_provider';

/**
 * OAuth callback. Validates state, exchanges code, fetches userinfo, finds
 * or creates the matching user, mints the same JWT pair the password login
 * issues, and redirects to /auth/oauth/finish with tokens in the URL hash
 * (so they don't appear in server logs or Referer headers).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: { provider: string } }
) {
  const provider = ctx.params.provider as OAuthProvider;
  if (provider !== 'google' && provider !== 'github') {
    return errorRedirect(req, 'invalid_provider');
  }
  if (!isProviderConfigured(provider)) {
    return errorRedirect(req, 'provider_disabled');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  const pkceCookie = req.cookies.get(PKCE_COOKIE)?.value;
  const providerCookie = req.cookies.get(PROVIDER_COOKIE)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return errorRedirect(req, 'invalid_state');
  }
  if (providerCookie && providerCookie !== provider) {
    return errorRedirect(req, 'invalid_state');
  }
  if (provider === 'google' && !pkceCookie) {
    return errorRedirect(req, 'invalid_state');
  }

  // Exchange code for tokens
  let tokens: OAuth2Tokens;
  try {
    if (provider === 'google') {
      tokens = await getGoogleClient().validateAuthorizationCode(code, pkceCookie!);
    } else {
      tokens = await getGitHubClient().validateAuthorizationCode(code);
    }
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      console.error('[oauth.callback] provider rejected code', err.code, err.description);
    } else {
      console.error('[oauth.callback] token exchange failed', err);
    }
    return errorRedirect(req, 'exchange_failed');
  }

  // Fetch + normalise the profile
  let profile: OAuthProfile;
  try {
    profile =
      provider === 'google'
        ? await fetchGoogleProfile(tokens.accessToken())
        : await fetchGitHubProfile(tokens.accessToken());
  } catch (err) {
    console.error('[oauth.callback] userinfo fetch failed', err);
    return errorRedirect(req, 'profile_fetch_failed');
  }

  // Find or create the user
  let resolved;
  try {
    resolved = await findOrCreateUserFromOAuth(profile);
  } catch (err) {
    if (err instanceof OAuthLinkError) {
      return errorRedirect(req, 'link_required', err.message);
    }
    console.error('[oauth.callback] user resolution failed', err);
    return errorRedirect(req, 'server_error');
  }

  const { user } = resolved;

  // Auto-select household if the user belongs to exactly one (mirrors password login)
  const members = await getHouseholdMembersCollection();
  const memberships = await members
    .find({ userId: user._id, isActive: true })
    .toArray();

  let selectedHouseholdId: typeof memberships[number]['householdId'] | undefined;
  let selectedRole: UserRole | undefined;
  let selectedPermissions: Permission[] = [];
  if (memberships.length === 1) {
    selectedHouseholdId = memberships[0].householdId;
    selectedRole = memberships[0].role as UserRole;
    selectedPermissions = memberships[0].permissions as Permission[];
  }

  // Mint our JWT pair
  const jwt = await generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    householdId: selectedHouseholdId?.toString(),
    role: selectedRole,
    permissions: selectedPermissions,
  });

  // Persist session
  const sessions = await getSessionsCollection();
  const users = await getUsersCollection();
  const now = new Date();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = req.headers.get('user-agent') ?? undefined;

  await sessions.insertOne({
    userId: user._id,
    householdId: selectedHouseholdId,
    token: jwt.accessToken,
    refreshToken: jwt.refreshToken,
    expiresAt: jwt.accessExpiresAt,
    refreshExpiresAt: jwt.refreshExpiresAt,
    userAgent,
    ipAddress: ipAddress || undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as Session);

  await users.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  if (selectedHouseholdId) {
    try {
      await auditHelpers.logLogin(user._id, selectedHouseholdId, ipAddress, userAgent);
    } catch (err) {
      console.error('[oauth.callback] audit log failed', err);
    }
  }

  // Hand tokens to the client via URL hash — never the query string, so
  // they don't show up in access logs or Referer headers.
  const finishUrl = new URL('/auth/oauth/finish', req.nextUrl.origin);
  const hash = new URLSearchParams({
    token: jwt.accessToken,
    refreshToken: jwt.refreshToken,
  });
  const response = NextResponse.redirect(`${finishUrl.toString()}#${hash.toString()}`);
  clearOAuthCookies(response);
  return response;
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`google userinfo ${res.status}`);
  }
  const data = (await res.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
  };
  return {
    provider: 'google',
    providerAccountId: data.sub,
    email: data.email.toLowerCase(),
    emailVerified: Boolean(data.email_verified),
    name: data.name || data.given_name || data.email,
    avatar: data.picture,
  };
}

async function fetchGitHubProfile(accessToken: string): Promise<OAuthProfile> {
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ashboard',
    },
  });
  if (!userRes.ok) {
    throw new Error(`github user ${userRes.status}`);
  }
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };

  // /user.email may be null (private email) — fall back to /user/emails and
  // pick the verified primary.
  let email = user.email;
  let emailVerified = false;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ashboard',
      },
    });
    if (!emailsRes.ok) {
      throw new Error(`github emails ${emailsRes.status}`);
    }
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified);
    if (!primary) {
      throw new Error('github account has no verified primary email');
    }
    email = primary.email;
    emailVerified = true;
  } else {
    // /user returned an email — confirm it's verified by checking /user/emails.
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ashboard',
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        verified: boolean;
      }>;
      emailVerified = emails.some(
        (e) => e.email.toLowerCase() === email!.toLowerCase() && e.verified
      );
    }
  }

  return {
    provider: 'github',
    providerAccountId: String(user.id),
    email: email.toLowerCase(),
    emailVerified,
    name: user.name || user.login,
    avatar: user.avatar_url ?? undefined,
  };
}

function errorRedirect(
  req: NextRequest,
  code: string,
  detail?: string
): NextResponse {
  const url = new URL('/login', req.nextUrl.origin);
  url.searchParams.set('oauth_error', code);
  if (detail) url.searchParams.set('oauth_message', detail);
  const response = NextResponse.redirect(url.toString());
  clearOAuthCookies(response);
  return response;
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(PKCE_COOKIE);
  response.cookies.delete(PROVIDER_COOKIE);
}

export const dynamic = 'force-dynamic';
