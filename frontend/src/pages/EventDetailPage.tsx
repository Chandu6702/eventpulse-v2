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
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
      <div>
        <p className="font-medium">{ticketType.name}</p>
        <p className="text-sm text-zinc-500">
          {formatPrice(ticketType.priceCents, ticketType.currency)}
          {soldOut ? (
            <span className="ml-2 font-medium text-red-600">Sold out</span>
          ) : (
            <span className="ml-2">{ticketType.available} left</span>
          )}
        </p>
      </div>
      {soldOut ? (
        <button
          type="button"
          onClick={onJoinWaitlist}
          className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Join waitlist
        </button>
      ) : ticketType.onSale ? (
        <select
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          aria-label={`Quantity for ${ticketType.name}`}
        >
          {Array.from({ length: max + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-zinc-400">Not on sale</span>
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
      <div className="mb-2 flex items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {event.category}
        </p>
        {event.status !== 'PUBLISHED' && <Badge value={event.status} />}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
      <p className="mt-2 text-zinc-600">
        {formatDateTime(event.startsAt)} — {formatDateTime(event.endsAt)}
      </p>
      <p className="text-zinc-600">
        {event.venue}
        {event.city ? `, ${event.city}` : ''} · Organized by {event.organizerName}
      </p>

      {event.description && (
        <p className="mt-6 whitespace-pre-line text-zinc-700">{event.description}</p>
      )}

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Tickets</h2>
        <ErrorNote message={error} />
        {waitlistMessage && (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            {waitlistMessage}
          </p>
        )}
        {event.ticketTypes.length === 0 ? (
          <p className="text-sm text-zinc-500">No ticket types yet.</p>
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
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
            <p className="text-sm text-zinc-600">
              {selectedCount} ticket{selectedCount > 1 ? 's' : ''} ·{' '}
              <span className="font-semibold text-zinc-900">{formatPrice(totalCents)}</span>
            </p>
            <button
              type="button"
              disabled={book.isPending}
              onClick={() => requireLogin(() => book.mutate())}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {book.isPending ? 'Reserving…' : 'Book now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
