import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "@/styles/globals.css";
import { Providers } from "../store/provider";
import { ThemeProvider } from "@/components/theme-provider"
import { trpc, createTRPCClient } from '@/lib/trpc';

const App = ({ Component, pageProps }: any) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <>
     <trpc.Provider client={trpcClient} queryClient={queryClient}>
       <QueryClientProvider client={queryClient}>
         <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          >
          <Providers>
            <Component {...pageProps} />
          </Providers>
        </ThemeProvider>
       </QueryClientProvider>
     </trpc.Provider>
    </>
  );
}
export default App;