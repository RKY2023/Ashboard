'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@/server/trpc/routers/_app';
import { AuthProvider } from '@/src/lib/auth/AuthProvider';
import { Toaster } from 'sonner';

// Create tRPC React hooks
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

// Get base URL for tRPC
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return '';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            // Get token from localStorage
            if (typeof window !== 'undefined') {
              const token = localStorage.getItem('accessToken');
              if (token) {
                return {
                  Authorization: `Bearer ${token}`,
                };
              }
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
