'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { AshboardLogo } from '@/src/components/brand/AshboardLogo';

/**
 * OAuth completion page. The callback route 302s here with tokens in the
 * URL hash — hashes never go to the server, so this is the only place
 * tokens are read on the client and immediately persisted to localStorage,
 * matching the password login path.
 */
export default function OAuthFinishPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      setError('No tokens in callback. Try signing in again.');
      return;
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Wipe the hash so the tokens don't sit in window.location after we navigate.
    window.history.replaceState(null, '', window.location.pathname);

    // Hard navigation so AuthProvider re-runs its mount effect with the new tokens.
    window.location.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <AshboardLogo size={48} className="text-primary" />
        </div>
        {error ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-3">
            <h1 className="text-xl font-bold">Sign-in didn&apos;t complete</h1>
            <p className="text-muted-foreground text-sm">{error}</p>
            <Link
              href="/login"
              className="inline-block mt-2 text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>Finishing sign-in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
