'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  UserPlus,
  Loader2,
  Trash2,
  X,
  Shield,
  ShieldCheck,
  User,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Role = 'owner' | 'admin' | 'member' | 'guest';

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  owner: ShieldCheck,
  admin: Shield,
  member: User,
  guest: Eye,
};

const roleColors: Record<Role, string> = {
  owner: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  member: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  guest: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
};

export default function UsersPage() {
  const [showInvite, setShowInvite] = useState(false);
  const list = trpc.users.list.useQuery({ page: 1, pageSize: 50 });
  const utils = trpc.useUtils();

  const remove = trpc.users.remove.useMutation({
    onSuccess: () => {
      toast.success('Member removed');
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage household members and permissions
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="widget">
        {list.isLoading ? (
          <div className="py-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <p className="py-12 text-center text-muted-foreground text-sm">
            No members yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {list.data!.items.map((m) => {
              const Icon = roleIcons[m.role as Role];
              return (
                <li
                  key={m._id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-medium',
                      roleColors[m.role as Role]
                    )}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{m.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                          roleColors[m.role as Role]
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {m.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                  </div>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => remove.mutate({ memberId: m._id })}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'guest'>('member');
  const utils = trpc.useUtils();
  const invite = trpc.users.invite.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent');
      utils.users.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!email.trim()) return;
    invite.mutate({ email, role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Invite Member</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'admin' | 'member' | 'guest')
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={invite.isPending || !email.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {invite.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
