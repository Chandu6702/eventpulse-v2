import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from './theme';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
    isActive
      ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
  }`;

/** The favicon mark: a ticket with a heartbeat line. */
function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-orange-600 dark:fill-orange-500" />
      <path
        d="M14 22a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v4a6 6 0 0 0 0 12v4a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6v-4a6 6 0 0 0 0-12z"
        fill="#fff7ed"
      />
      <polyline
        points="20,36 26,36 29,29 33,42 36,33 38,36 44,36"
        fill="none"
        className="stroke-orange-600 dark:stroke-orange-500"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOrganizer = !!user && user.role !== 'ATTENDEE';

  const dashboardActive =
    location.pathname === '/organizer' || location.pathname.startsWith('/organizer/events');

  const links = [
    { to: '/', label: 'Explore', end: true, show: true },
    { to: '/tickets', label: 'Tickets', show: !!user },
    { to: '/orders', label: 'Orders', show: !!user },
    { to: '/analytics', label: 'Analytics', show: !!user },
    { to: '/organizer', label: 'Dashboard', show: isOrganizer, forceActive: dashboardActive },
    { to: '/organizer/check-in', label: 'Check-in', show: isOrganizer },
  ].filter((l) => l.show);

  function renderLink(link: (typeof links)[number], onClick?: () => void) {
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        onClick={onClick}
        className={
          link.forceActive === undefined
            ? navLinkClass
            : navLinkClass({ isActive: link.forceActive })
        }
      >
        {link.label}
      </NavLink>
    );
  }

  function handleLogout() {
    setMenuOpen(false);
    logout().then(() => navigate('/'));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 justify-self-start"
            onClick={() => setMenuOpen(false)}
          >
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              EventPulse
            </span>
          </Link>

          {/* Centered between the logo (left) and actions (right) */}
          <nav className="hidden items-center gap-1.5 justify-self-center md:flex">
            {links.map((link) => renderLink(link))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 justify-self-end">
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Profile settings"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white dark:bg-orange-500">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">
                    {user.name}
                  </span>
                </Link>
                <button type="button" onClick={handleLogout} className="btn-ghost hidden px-3 py-1.5 md:inline-flex">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-medium text-zinc-700 hover:text-zinc-900 md:inline dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  Log in
                </Link>
                <Link to="/register" className="btn-primary hidden px-3 py-1.5 md:inline-flex">
                  Sign up
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
            <div className="flex flex-col gap-1">
              {links.map((link) => renderLink(link, () => setMenuOpen(false)))}
              <div className="mt-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                {user ? (
                  <button type="button" onClick={handleLogout} className="btn-ghost w-full">
                    Log out
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost flex-1">
                      Log in
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* keyed by route so every navigation gets a gentle fade-up */}
        <div key={location.pathname} className="fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
