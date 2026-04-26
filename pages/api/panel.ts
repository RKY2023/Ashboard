import type { NextApiRequest, NextApiResponse } from 'next';
import { renderTrpcPanel } from 'trpc-panel';
import { appRouter } from '@/server/trpc/routers/_app';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Only enable in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(
    renderTrpcPanel(appRouter, {
      url: '/api/trpc',
      transformer: 'superjson',
    })
  );
}
