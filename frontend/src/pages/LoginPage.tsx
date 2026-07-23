import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorNote } from '../components/ui';

export function LoginPage() {
  const { onAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onAuthenticated(await authApi.login({ email, password }));
      navigate('/');
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
          <h1 className="font-display text-lg font-semibold">Welcome back</h1>
          <ErrorNote message={error} />
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          <p className="muted text-center text-sm">
            New here?{' '}
            <Link to="/register" className="accent font-medium">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
