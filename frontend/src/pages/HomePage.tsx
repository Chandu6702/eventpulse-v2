import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/endpoints';
import type { EventCategory, EventSummary } from '../api/types';
import { formatDateTime, relativeDate } from '../utils/format';
import { EmptyState, Pager, Spinner } from '../components/ui';

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

function EventCard({ event, index }: { event: EventSummary; index: number }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="card fade-up block overflow-hidden p-0 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:hover:border-orange-500/50"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <EventCover event={event} />
      <div className="p-5">
        <p className="accent text-xs font-semibold tracking-wide uppercase">
          {event.categoryLabel ?? event.category}
        </p>
        <h2 className="font-display mt-1 line-clamp-2 text-lg font-semibold">{event.title}</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{formatDateTime(event.startsAt)}</p>
        <p className="accent text-xs font-medium">{relativeDate(event.startsAt)}</p>
        <p className="muted mt-1 text-sm">
          {event.venue}
          {event.city ? ` · ${event.city}` : ''}
        </p>
      </div>
    </Link>
  );
}

const WHEN_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

/** Turns the "when" choice into from/to ISO bounds for the API. */
function whenRange(when: string): { from?: string; to?: string } {
  if (!when) {
    return {};
  }
  const now = new Date();
  const days = when === 'week' ? 7 : 30;
  const to = new Date(now.getTime() + days * 86_400_000);
  return { from: now.toISOString(), to: to.toISOString() };
}

export function HomePage() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [sort, setSort] = useState('date');
  const [when, setWhen] = useState('');
  const [page, setPage] = useState(0);

  // Debounced live search: the query fires 350ms after the last keystroke,
  // so typing does not spam the API with a request per character.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setSearch(q.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isPending } = useQuery({
    queryKey: ['events', { search, category, sort, when, page }],
    queryFn: () => eventsApi.browse({ q: search, category, sort, page, ...whenRange(when) }),
    placeholderData: (previous) => previous,
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
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(q.trim());
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, venue, city or category…"
            className="input"
            aria-label="Search events"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value as EventCategory | '');
          }}
          className="input sm:w-40"
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === '' ? 'All categories' : c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          value={when}
          onChange={(e) => {
            setPage(0);
            setWhen(e.target.value);
          }}
          className="input sm:w-36"
          aria-label="Filter by date"
        >
          {WHEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setPage(0);
            setSort(e.target.value);
          }}
          className="input sm:w-40"
          aria-label="Sort events"
        >
          <option value="date">Soonest first</option>
          <option value="newest">Recently added</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {isPending ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="No events found">Try a different search or category.</EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.content.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
          <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
