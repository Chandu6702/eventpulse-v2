import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, usersApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge, ErrorNote } from '../components/ui';

export function ProfilePage() {
  const { user, onAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The role and name live inside the JWT, so after any profile change we
  // refresh the token pair — the new access token carries the new claims.
  const save = useMutation({
    mutationFn: () => usersApi.updateProfile({ name: name.trim() }),
    onSuccess: async () => {
      onAuthenticated(await authApi.refresh());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(problemDetail(e)),
  });

  const upgrade = useMutation({
    mutationFn: () => usersApi.becomeOrganizer(),
    onSuccess: async () => {
      onAuthenticated(await authApi.refresh());
      navigate('/organizer');
    },
    onError: (e) => setError(problemDetail(e)),
  });

  if (!user) {
    return null;
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    save.mutate();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="page-title">Profile settings</h1>

      <div className="card flex items-center gap-4 p-6">
        <span className="font-display flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white dark:bg-indigo-500">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-semibold">{user.name}</p>
          <p className="muted truncate text-sm">{user.email}</p>
        </div>
        <div className="ml-auto">
          <Badge value={user.role} />
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Display name</h2>
        <ErrorNote message={error} />
        <label className="block text-sm">
          <span className="lbl">Name</span>
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending || name.trim() === '' || name.trim() === user.name}
            className="btn-primary"
          >
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Saved ✓
            </span>
          )}
        </div>
      </form>

      {user.role === 'ATTENDEE' && (
        <div className="card border-indigo-200 p-6 dark:border-indigo-500/30">
          <h2 className="font-display text-lg font-semibold">Want to host your own events?</h2>
          <p className="muted mt-1 text-sm">
            Upgrade to an organizer account to create events, sell tickets and see live sales
            analytics. Your existing tickets and orders stay exactly as they are.
          </p>
          <button
            type="button"
            disabled={upgrade.isPending}
            onClick={() => upgrade.mutate()}
            className="btn-primary mt-4"
          >
            {upgrade.isPending ? 'Upgrading…' : 'Become an organizer'}
          </button>
        </div>
      )}
    </div>
  );
}
