import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/endpoints';
import { problemDetail } from '../../api/client';
import type { EventCategory } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { Badge, EmptyState, ErrorNote, Spinner } from '../../components/ui';

const CATEGORIES: EventCategory[] = [
  'CONFERENCE',
  'MEETUP',
  'WORKSHOP',
  'WEBINAR',
  'CONCERT',
  'OTHER',
];

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('MEETUP');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      eventsApi.create({
        title,
        category,
        venue,
        city: city || null,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    onSuccess: onDone,
    onError: (e) => setError(problemDetail(e)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">New event</h2>
      <ErrorNote message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-700">Title</span>
          <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Venue</span>
          <input required maxLength={200} value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">City</span>
          <input maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4 sm:col-span-1">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Starts</span>
            <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Ends</span>
            <input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-700">Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </label>
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {create.isPending ? 'Creating…' : 'Create draft'}
      </button>
    </form>
  );
}

export function OrganizerDashboardPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.mine(),
  });

  if (isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your events</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Close' : 'New event'}
        </button>
      </div>

      {showForm && (
        <CreateEventForm
          onDone={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['my-events'] });
          }}
        />
      )}

      {!data || data.content.length === 0 ? (
        <EmptyState title="No events yet">Create your first event to start selling.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.content.map((event) => (
            <li key={event.id}>
              <Link
                to={`/organizer/events/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-indigo-300"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-zinc-500">
                    {formatDateTime(event.startsAt)} · {event.venue}
                  </p>
                </div>
                <Badge value={event.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
