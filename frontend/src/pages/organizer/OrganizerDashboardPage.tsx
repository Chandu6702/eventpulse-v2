import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/endpoints';
import { problemDetail } from '../../api/client';
import type { EventCategory } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { Badge, EmptyState, ErrorNote, Pager, Spinner } from '../../components/ui';

const CATEGORIES: EventCategory[] = [
  'CONFERENCE',
  'MEETUP',
  'WORKSHOP',
  'WEBINAR',
  'CONCERT',
  'OTHER',
];

/**
 * Downscale + JPEG-compress in the browser so the stored inline image stays
 * small (~100-300 KB). Steps down in quality until it fits the API cap.
 */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.6, 0.45]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length < 480_000) {
      return dataUrl;
    }
  }
  throw new Error('Image is too large even after compression — try a smaller one.');
}

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('MEETUP');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageData, setImageData] = useState('');
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
        categoryLabel: category === 'OTHER' ? categoryLabel.trim() || null : null,
        imageUrl: imageData || imageUrl.trim() || null,
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
        {category === 'OTHER' && (
          <label className="block text-sm">
            <span className="lbl">What kind of event?</span>
            <input
              required
              maxLength={50}
              placeholder="Hackathon, standup night, …"
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              className={inputClass}
            />
          </label>
        )}
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
        <div className="block text-sm sm:col-span-2">
          <span className="lbl">Cover image (optional)</span>
          {imageData ? (
            <div className="flex items-center gap-3">
              <img src={imageData} alt="Cover preview" className="h-16 w-28 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImageData('')}
                className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    compressImage(file)
                      .then(setImageData)
                      .catch((err) => setError(err.message));
                  }
                }}
                className="input file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-orange-700 dark:file:bg-orange-500/15 dark:file:text-orange-300"
              />
              <input
                type="url"
                maxLength={500}
                placeholder="…or paste an image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
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
  const [page, setPage] = useState(0);

  const { data, isPending } = useQuery({
    queryKey: ['my-events', page],
    queryFn: () => eventsApi.mine(page),
    placeholderData: (previous) => previous,
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
      <Pager page={data?.page ?? 0} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
