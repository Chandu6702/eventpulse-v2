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
  const [imageUrl, setImageUrl] = useState('');
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
        imageUrl: imageUrl.trim() || null,
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

  const inputClass = 'input';

  return (
    <form onSubmit={handleSubmit} className="card mb-8 space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">New event</h2>
      <ErrorNote message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="lbl">Title</span>
          <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="lbl">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="lbl">Venue</span>
          <input required maxLength={200} value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="lbl">City</span>
          <input maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4 sm:col-span-1">
          <label className="block text-sm">
            <span className="lbl">Starts</span>
            <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="lbl">Ends</span>
            <input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm sm:col-span-2">
          <span className="lbl">Cover image URL (optional)</span>
          <input type="url" maxLength={500} placeholder="https://images.unsplash.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="lbl">Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </label>
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="btn-primary"
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
        <h1 className="page-title">Your events</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary"
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
                className="card flex items-center justify-between p-4 transition hover:border-orange-300 dark:hover:border-orange-500/50"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="muted text-sm">
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
