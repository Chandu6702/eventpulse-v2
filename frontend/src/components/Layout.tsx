import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from './theme';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
    isActive
      ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
  }`;

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
      )}
    </button>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOrganizer = !!user && user.role !== 'ATTENDEE';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-600 dark:bg-orange-400" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              EventPulse
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            <NavLink to="/" className={navLinkClass} end>
              Explore
            </NavLink>
            {user && (
              <>
                <NavLink to="/tickets" className={navLinkClass}>
                  Tickets
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>
                  Orders
                </NavLink>
                <NavLink to="/analytics" className={navLinkClass}>
                  Analytics
                </NavLink>
              </>
            )}
            {isOrganizer && (
              <>
                <span className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
                <NavLink to="/organizer" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/organizer/check-in" className={navLinkClass}>
                  Check-in
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Profile settings"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white dark:bg-orange-500">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate('/'))}
                  className="btn-ghost px-3 py-1.5"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  Log in
                </Link>
                <Link to="/register" className="btn-primary px-3 py-1.5">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
