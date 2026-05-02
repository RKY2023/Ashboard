'use client';

import { useState } from 'react';
import { Loader2, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '@/src/app/providers';

export function AccessLogTab() {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const access = trpc.security.access.list.useQuery({ page, pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="widget-title">Access Log</h3>
        {access.data && (
          <span className="text-xs text-muted-foreground">
            {access.data.total} entries
          </span>
        )}
      </div>

      {access.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (access.data?.items.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No access events yet.</p>
        </div>
      ) : (
        <div className="widget overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {access.data!.items.map((entry) => (
                <tr key={entry._id} className="border-t border-border">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(entry.at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{entry.actorName ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full bg-accent text-xs font-medium capitalize">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {entry.detail ?? entry.deviceName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {access.data!.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Page {page} of {access.data!.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(access.data!.totalPages, p + 1))}
                  disabled={page >= access.data!.totalPages}
                  className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
