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

function EventCover({ event, tall = false }: { event: EventSummary; tall?: boolean }) {
  const height = tall ? 'h-56 sm:h-72' : 'h-36';
  if (event.imageUrl) {
    return (
      <img
        src={event.imageUrl}
        alt=""
        loading="lazy"
        className={`${height} w-full object-cover`}
        onError={(e) => {
          // Broken URL: fall back to the gradient placeholder
          e.currentTarget.outerHTML = `<div class="${height} w-full bg-gradient-to-br from-orange-500 to-amber-400"></div>`;
        }}
      />
    );
  }
  return (
    <div
      className={`${height} flex w-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400`}
    >
      <span className="font-display text-3xl font-bold tracking-widest text-white/60 uppercase">
        {event.category.slice(0, 4)}
      </span>
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="card block overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:hover:border-orange-500/50"
    >
      <EventCover event={event} />
      <div className="p-5">
        <p className="accent text-xs font-semibold tracking-wide uppercase">{event.category}</p>
        <h2 className="font-display mt-1 line-clamp-2 text-lg font-semibold">{event.title}</h2>
        <p className="muted mt-2 text-sm">{formatDateTime(event.startsAt)}</p>
        <p className="muted text-sm">
          {event.venue}
          {event.city ? ` · ${event.city}` : ''}
        </p>
      </div>
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
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          What's <span className="accent">on</span>?
        </h1>
        <p className="muted mt-1 text-sm">
          Discover conferences, meetups and concerts near you — and grab a ticket in seconds.
        </p>
      </div>

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
            className="input"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
        <select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value as EventCategory | '');
          }}
          className="input sm:w-44"
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
                className="btn-ghost px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="muted">
                Page {data.page + 1} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-ghost px-3 py-1.5 disabled:opacity-40"
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
