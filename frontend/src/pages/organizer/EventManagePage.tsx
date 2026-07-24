import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/endpoints';
import { problemDetail } from '../../api/client';
import type { EventCategory, EventDetail } from '../../api/types';
import { formatDateTime, formatPrice } from '../../utils/format';
import { Badge, ErrorNote, Spinner } from '../../components/ui';

const CATEGORIES: EventCategory[] = [
  'CONFERENCE',
  'MEETUP',
  'WORKSHOP',
  'WEBINAR',
  'CONCERT',
  'OTHER',
];

/** ISO instant -> value a datetime-local input understands (local wall clock). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function EditEventForm({ event, onDone }: { event: EventDetail; onDone: () => void }) {
  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [categoryLabel, setCategoryLabel] = useState(event.categoryLabel ?? '');
  const [venue, setVenue] = useState(event.venue);
  const [city, setCity] = useState(event.city ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(event.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(event.endsAt));
  const [description, setDescription] = useState(event.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      eventsApi.update(event.id, {
        title,
        category,
        categoryLabel: category === 'OTHER' ? categoryLabel.trim() || null : null,
        venue,
        city: city || null,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    onSuccess: onDone,
    onError: (e) => setError(problemDetail(e)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="card mt-4 space-y-4 p-5"
    >
      <h2 className="font-display text-lg font-semibold">Edit details</h2>
      <ErrorNote message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="lbl">Title</span>
          <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="lbl">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory)} className="input">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        {category === 'OTHER' && (
          <label className="block text-sm">
            <span className="lbl">What kind of event?</span>
            <input required maxLength={50} value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} className="input" />
          </label>
        )}
        <label className="block text-sm">
          <span className="lbl">Venue</span>
          <input required maxLength={200} value={venue} onChange={(e) => setVenue(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="lbl">City</span>
          <input maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="lbl">Starts</span>
          <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="lbl">Ends</span>
          <input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="lbl">Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </label>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={save.isPending} className="btn-primary">
          {save.isPending ? 'Saving…' : 'Save details'}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddTicketTypeForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [capacity, setCapacity] = useState('100');
  const [perOrderLimit, setPerOrderLimit] = useState('4');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      eventsApi.addTicketType(eventId, {
        name,
        priceCents: Math.round(Number(price) * 100),
        capacity: Number(capacity),
        perOrderLimit: Number(perOrderLimit),
      }),
    onSuccess: () => {
      setName('');
      onDone();
    },
    onError: (e) => setError(problemDetail(e)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    add.mutate();
  }

  const inputClass = 'input';

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="lbl">Name</span>
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="General" />
        </label>
        <label className="block text-sm">
          <span className="lbl">Price (₹)</span>
          <input type="number" min="0" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="lbl">Capacity</span>
          <input type="number" min="1" required value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="lbl">Per-order limit</span>
          <input type="number" min="1" max="50" required value={perOrderLimit} onChange={(e) => setPerOrderLimit(e.target.value)} className={inputClass} />
        </label>
      </div>
      <button
        type="submit"
        disabled={add.isPending}
        className="btn-outline-accent"
      >
        {add.isPending ? 'Adding…' : 'Add ticket type'}
      </button>
    </form>
  );
}

export function EventManagePage() {
  const { eventId = '' } = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const { data: event, isPending } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.detail(eventId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['event', eventId] });

  const publish = useMutation({
    mutationFn: () => eventsApi.publish(eventId),
    onSuccess: refresh,
    onError: (e) => setError(problemDetail(e)),
  });
  const cancelEvent = useMutation({
    mutationFn: () => eventsApi.cancel(eventId),
    onSuccess: refresh,
    onError: (e) => setError(problemDetail(e)),
  });
  const removeTicketType = useMutation({
    mutationFn: (ticketTypeId: string) => eventsApi.removeTicketType(eventId, ticketTypeId),
    onSuccess: refresh,
    onError: (e) => setError(problemDetail(e)),
  });

  if (isPending) {
    return <Spinner />;
  }
  if (!event) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="page-title">{event.title}</h1>
        <Badge value={event.status} />
      </div>
      <p className="muted text-sm">
        {formatDateTime(event.startsAt)} · {event.venue}
        {event.city ? `, ${event.city}` : ''}
      </p>

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {event.status === 'DRAFT' && (
          <button
            type="button"
            disabled={publish.isPending}
            onClick={() => publish.mutate()}
            className="btn-primary"
          >
            {publish.isPending ? 'Publishing…' : 'Publish event'}
          </button>
        )}
        {event.status === 'DRAFT' && (
          <button type="button" onClick={() => setEditing((v) => !v)} className="btn-ghost">
            {editing ? 'Close editor' : 'Edit details'}
          </button>
        )}
        {event.status !== 'CANCELLED' && (
          <button
            type="button"
            disabled={cancelEvent.isPending}
            onClick={() => {
              if (window.confirm('Cancel this event? This cannot be undone.')) {
                cancelEvent.mutate();
              }
            }}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Cancel event
          </button>
        )}
      </div>

      {editing && event.status === 'DRAFT' && (
        <EditEventForm
          event={event}
          onDone={() => {
            setEditing(false);
            refresh();
          }}
        />
      )}
      {event.status !== 'DRAFT' && event.status !== 'CANCELLED' && (
        <p className="muted mt-3 text-xs">
          Published events can't have their details edited — attendees have already booked against
          them. Cancel and recreate if a major change is needed.
        </p>
      )}

      <div className="card mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">Ticket types</h2>
        {event.ticketTypes.length === 0 ? (
          <p className="muted mt-2 text-sm">
            Add at least one ticket type before publishing.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {event.ticketTypes.map((ticketType) => (
              <li key={ticketType.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{ticketType.name}</p>
                  <p className="muted text-sm">
                    {formatPrice(ticketType.priceCents, ticketType.currency)} ·{' '}
                    {ticketType.available}/{ticketType.capacity} available
                  </p>
                </div>
                {event.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => removeTicketType.mutate(ticketType.id)}
                    className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {event.status !== 'CANCELLED' && <AddTicketTypeForm eventId={eventId} onDone={refresh} />}
      </div>
    </div>
  );
}
