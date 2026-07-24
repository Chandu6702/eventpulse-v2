import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, ordersApi, waitlistApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import type { TicketType } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatDateTime, formatPrice } from '../utils/format';
import { Badge, ErrorNote, Spinner } from '../components/ui';

function TicketTypeRow({
  ticketType,
  quantity,
  onQuantityChange,
  onJoinWaitlist,
}: {
  ticketType: TicketType;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onJoinWaitlist: () => void;
}) {
  const soldOut = ticketType.available === 0;
  const max = Math.min(ticketType.perOrderLimit, ticketType.available);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0 dark:border-zinc-800">
      <div>
        <p className="font-medium">{ticketType.name}</p>
        <p className="muted text-sm">
          {formatPrice(ticketType.priceCents, ticketType.currency)}
          {soldOut ? (
            <span className="ml-2 font-medium text-red-600 dark:text-red-400">Sold out</span>
          ) : ticketType.available <= 5 ? (
            <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
              Only {ticketType.available} left!
            </span>
          ) : (
            <span className="ml-2">{ticketType.available} left</span>
          )}
        </p>
      </div>
      {soldOut ? (
        <button type="button" onClick={onJoinWaitlist} className="btn-outline-accent">
          Join waitlist
        </button>
      ) : ticketType.onSale ? (
        <select
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          className="input w-20"
          aria-label={`Quantity for ${ticketType.name}`}
        >
          {Array.from({ length: max + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-zinc-400 dark:text-zinc-500">Not on sale</span>
      )}
    </div>
  );
}

export function EventDetailPage() {
  const { eventId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  const { data: event, isPending } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.detail(eventId),
  });

  const book = useMutation({
    mutationFn: () =>
      ordersApi.create({
        eventId,
        items: Object.entries(quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (e) => setError(problemDetail(e)),
  });

  const joinWaitlist = useMutation({
    mutationFn: (ticketTypeId: string) => waitlistApi.join(ticketTypeId),
    onSuccess: (entry) =>
      setWaitlistMessage(
        `You're on the waitlist for ${entry.ticketTypeName} (${entry.peopleAhead} ahead of you).`,
      ),
    onError: (e) => setError(problemDetail(e)),
  });

  if (isPending) {
    return <Spinner />;
  }
  if (!event) {
    return null;
  }

  const selectedCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalCents = event.ticketTypes.reduce(
    (sum, t) => sum + (quantities[t.id] ?? 0) * t.priceCents,
    0,
  );

  function requireLogin(action: () => void) {
    if (!user) {
      navigate('/login');
      return;
    }
    action();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt=""
          className="mb-6 h-56 w-full rounded-2xl object-cover sm:h-72"
          onError={(e) => e.currentTarget.remove()}
        />
      )}
      <div className="mb-2 flex items-center gap-3">
        <p className="accent text-xs font-semibold tracking-wide uppercase">
          {event.categoryLabel ?? event.category}
        </p>
        {event.status !== 'PUBLISHED' && <Badge value={event.status} />}
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{event.title}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {formatDateTime(event.startsAt)} — {formatDateTime(event.endsAt)}
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">
        {event.venue}
        {event.city ? `, ${event.city}` : ''} · Organized by {event.organizerName}
      </p>

      {event.description && (
        <p className="mt-6 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
          {event.description}
        </p>
      )}

      <div className="card mt-8 p-5">
        <h2 className="font-display mb-2 text-lg font-semibold">Tickets</h2>
        <ErrorNote message={error} />
        {waitlistMessage && (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            {waitlistMessage}
          </p>
        )}
        {event.ticketTypes.length === 0 ? (
          <p className="muted text-sm">No ticket types yet.</p>
        ) : (
          event.ticketTypes.map((ticketType) => (
            <TicketTypeRow
              key={ticketType.id}
              ticketType={ticketType}
              quantity={quantities[ticketType.id] ?? 0}
              onQuantityChange={(value) => {
                setError(null);
                setQuantities((prev) => ({ ...prev, [ticketType.id]: value }));
              }}
              onJoinWaitlist={() => requireLogin(() => joinWaitlist.mutate(ticketType.id))}
            />
          ))
        )}
        {selectedCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedCount} ticket{selectedCount > 1 ? 's' : ''} ·{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatPrice(totalCents)}
              </span>
            </p>
            <button
              type="button"
              disabled={book.isPending}
              onClick={() => requireLogin(() => book.mutate())}
              className="btn-primary px-5"
            >
              {book.isPending ? 'Reserving…' : 'Book now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
