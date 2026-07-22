import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/endpoints';
import type { EventCategory, EventSummary } from '../api/types';
import { formatDateTime } from '../utils/format';
import { EmptyState, Spinner } from '../components/ui';

const CATEGORIES: (EventCategory | '')[] = [
  '',
  'CONFERENCE',
  'MEETUP',
  'WORKSHOP',
  'WEBINAR',
  'CONCERT',
  'OTHER',
];

function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
        {event.category}
      </p>
      <h2 className="mt-1 line-clamp-2 text-lg font-semibold">{event.title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{formatDateTime(event.startsAt)}</p>
      <p className="text-sm text-zinc-500">
        {event.venue}
        {event.city ? ` · ${event.city}` : ''}
      </p>
    </Link>
  );
}

export function HomePage() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [page, setPage] = useState(0);

  const { data, isPending } = useQuery({
    queryKey: ['events', { search, category, page }],
    queryFn: () => eventsApi.browse({ q: search, category, page }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events or venues…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>
        <select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value as EventCategory | '');
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === '' ? 'All categories' : c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="No events found">Try a different search or category.</EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.content.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-zinc-500">
                Page {data.page + 1} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
