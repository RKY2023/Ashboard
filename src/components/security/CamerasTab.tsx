'use client';

import { useState } from 'react';
import { Camera as CameraIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { trpc } from '@/src/app/providers';
import { toast } from 'sonner';
import { HlsPlayer } from './HlsPlayer';

export function CamerasTab() {
  const cameras = trpc.security.cameras.list.useQuery();
  const utils = trpc.useUtils();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [snapshotUrl, setSnapshotUrl] = useState('');

  const register = trpc.security.cameras.register.useMutation({
    onSuccess: () => {
      toast.success('Camera registered');
      setShowAdd(false);
      setName('');
      setHlsUrl('');
      setSnapshotUrl('');
      utils.security.cameras.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.security.cameras.delete.useMutation({
    onSuccess: () => {
      toast.success('Camera removed');
      utils.security.cameras.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({
      name: name.trim(),
      hlsUrl: hlsUrl.trim(),
      snapshotUrl: snapshotUrl.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="widget-title">Cameras</h3>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Cancel' : 'Add Camera'}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="widget grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="Front Door"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">HLS URL (.m3u8)</span>
            <input
              type="url"
              required
              value={hlsUrl}
              onChange={(e) => setHlsUrl(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs"
              placeholder="https://stream.example.com/index.m3u8"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Snapshot URL (optional)</span>
            <input
              type="url"
              value={snapshotUrl}
              onChange={(e) => setSnapshotUrl(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs"
              placeholder="https://stream.example.com/snapshot.jpg"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={register.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {register.isPending ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      )}

      {cameras.isLoading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (cameras.data?.length ?? 0) === 0 ? (
        <div className="widget text-center py-12 text-muted-foreground">
          <CameraIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No cameras yet. Add one to start streaming.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {cameras.data!.map((c) => (
            <div key={c._id} className="widget space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.lastSeenAt && (
                    <p className="text-xs text-muted-foreground">
                      Last seen {new Date(c.lastSeenAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove camera "${c.name}"?`)) {
                      remove.mutate({ cameraId: c._id });
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <HlsPlayer
                src={c.hlsUrl}
                poster={c.snapshotUrl}
                className="aspect-video"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
