import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorNote, PasswordInput } from '../components/ui';

export function RegisterPage() {
  const { onAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizer, setOrganizer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onAuthenticated(
        await authApi.register({
          name,
          email,
          password,
          role: organizer ? 'ORGANIZER' : 'ATTENDEE',
        }),
      );
      navigate(organizer ? '/organizer' : '/');
    } catch (e) {
      setError(problemDetail(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="font-display mb-6 block text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Event<span className="accent">Pulse</span>
        </Link>
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h1 className="font-display text-lg font-semibold">Create your account</h1>
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
          <label className="block text-sm">
            <span className="lbl">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block text-sm">
            <span className="lbl">Password</span>
            <PasswordInput
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="muted mt-1 block text-xs">
              8+ characters with an uppercase letter, a number and a symbol.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={organizer}
              onChange={(e) => setOrganizer(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            I want to organize events
          </label>
          <p className="muted -mt-2 text-xs">
            Not sure yet? You can upgrade to organizer anytime from your profile.
          </p>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2">
            {submitting ? 'Creating…' : 'Sign up'}
          </button>
          <p className="muted text-center text-sm">
            Already registered?{' '}
            <Link to="/login" className="accent font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
