import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorNote } from '../components/ui';

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
        <Link to="/" className="mb-6 block text-center text-2xl font-bold text-indigo-700">
          EventPulse
        </Link>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold">Create your account</h1>
          <ErrorNote message={error} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Name</span>
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={organizer}
              onChange={(e) => setOrganizer(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            I want to organize events
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Sign up'}
          </button>
          <p className="text-center text-sm text-zinc-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-indigo-600">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
