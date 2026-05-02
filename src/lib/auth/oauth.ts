import { Google, GitHub } from 'arctic';
import { ObjectId } from 'mongodb';
import {
  getOAuthAccountsCollection,
  getUsersCollection,
} from '@/src/lib/db';
import type {
  OAuthAccount,
  OAuthProvider,
  User,
} from '@/src/types';

/**
 * Provider clients are lazily constructed so missing env vars don't crash
 * the module on import — they only matter when a route actually tries to
 * use that provider.
 */

export function getGoogleClient(): Google {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('Google OAuth is not configured');
  }
  return new Google(id, secret, buildRedirectUri('google'));
}

export function getGitHubClient(): GitHub {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('GitHub OAuth is not configured');
  }
  return new GitHub(id, secret, buildRedirectUri('github'));
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function buildRedirectUri(provider: OAuthProvider): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/+$/, '')}/api/auth/oauth/${provider}/callback`;
}

/**
 * Profile shape we use after normalising both providers' userinfo payloads.
 * `emailVerified` MUST come from the provider's own claim — never trust the
 * email alone.
 */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
}

export interface ResolvedUser {
  user: User;
  isNewUser: boolean;
}

/**
 * Find or create a user from a verified OAuth profile.
 *
 * Lookup order:
 *   1. oauth_accounts by (provider, providerAccountId) — handles "user logs
 *      in again with same provider".
 *   2. users by email (only if provider verified the email) — handles
 *      "existing password user adds Google".
 *   3. Create a new user (no passwordHash, no household) — first-time OAuth
 *      signup.
 */
export async function findOrCreateUserFromOAuth(
  profile: OAuthProfile
): Promise<ResolvedUser> {
  const oauthAccounts = await getOAuthAccountsCollection();
  const users = await getUsersCollection();
  const now = new Date();

  // 1. Already-linked OAuth account
  const linked = await oauthAccounts.findOne({
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
  });

  if (linked) {
    const user = await users.findOne({ _id: linked.userId, isActive: true });
    if (user) {
      return { user, isNewUser: false };
    }
    // Stale link — soft-delete and fall through to recreate.
    await oauthAccounts.updateOne(
      { _id: linked._id },
      { $set: { isActive: false, updatedAt: now } }
    );
  }

  // 2. Email match — only auto-link if provider verified the email
  if (profile.emailVerified) {
    const existing = await users.findOne({
      email: profile.email,
      isActive: true,
    });
    if (existing) {
      await insertOAuthAccount(profile, existing._id, now);
      return { user: existing, isNewUser: false };
    }
  } else {
    // Refuse to take over an existing account if the provider didn't vouch
    // for the email.
    const conflict = await users.findOne({
      email: profile.email,
      isActive: true,
    });
    if (conflict) {
      throw new OAuthLinkError(
        'An account with this email already exists. Sign in with your password first, then connect ' +
          (profile.provider === 'google' ? 'Google' : 'GitHub') +
          ' from settings.'
      );
    }
  }

  // 3. Brand-new user
  const userDoc: Omit<User, '_id'> = {
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    isEmailVerified: profile.emailVerified,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(userDoc as User);
  const newUser = { ...userDoc, _id: result.insertedId } as User;

  await insertOAuthAccount(profile, result.insertedId, now);

  return { user: newUser, isNewUser: true };
}

async function insertOAuthAccount(
  profile: OAuthProfile,
  userId: ObjectId,
  now: Date
): Promise<void> {
  const oauthAccounts = await getOAuthAccountsCollection();
  await oauthAccounts.insertOne({
    userId,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as OAuthAccount);
}

export class OAuthLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthLinkError';
  }
}
