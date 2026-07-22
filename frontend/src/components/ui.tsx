import type { ReactNode } from 'react';

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-zinc-200 text-zinc-600',
  VALID: 'bg-emerald-100 text-emerald-800',
  CHECKED_IN: 'bg-indigo-100 text-indigo-800',
  VOID: 'bg-red-100 text-red-700',
  WAITING: 'bg-amber-100 text-amber-800',
  NOTIFIED: 'bg-indigo-100 text-indigo-800',
  CONVERTED: 'bg-emerald-100 text-emerald-800',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        badgeStyles[value] ?? 'bg-zinc-200 text-zinc-700'
      }`}
    >
      {value.replace('_', ' ')}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
      <p className="text-lg font-medium text-zinc-700">{title}</p>
      {children && <div className="mt-2 text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
