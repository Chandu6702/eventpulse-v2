import type { ReactNode } from 'react';

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-orange-600 dark:border-zinc-700 dark:border-t-orange-400" />
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  EXPIRED: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
  VALID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  CHECKED_IN: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  VOID: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  WAITING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  NOTIFIED: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  CONVERTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        badgeStyles[value] ?? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
      }`}
    >
      {value.replace('_', ' ')}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {children && <div className="muted mt-2 text-sm">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      role="alert"
    >
      {message}
    </p>
  );
}

/** Headline number with a label — the "not a chart" form for single stats. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      {hint && <p className="muted mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}
