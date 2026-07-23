import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { problemDetail } from '../api/client';
import { formatPrice } from '../utils/format';
import { Badge, ErrorNote, Spinner } from '../components/ui';

/** Live countdown until the inventory hold is released. */
function useCountdown(deadline: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!deadline) {
    return null;
  }
  const remainingMs = new Date(deadline).getTime() - now;
  if (remainingMs <= 0) {
    return '0:00';
  }
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function OrderPage() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: order, isPending } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  });

  const countdown = useCountdown(order?.status === 'PENDING' ? order.expiresAt : undefined);

  // Confirming issues tickets server-side, so every cached view of
  // tickets, orders and analytics is stale the moment it succeeds.
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const confirm = useMutation({
    mutationFn: () => ordersApi.confirm(orderId),
    onSuccess: invalidateAll,
    onError: (e) => setError(problemDetail(e)),
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: invalidateAll,
    onError: (e) => setError(problemDetail(e)),
  });

  if (isPending) {
    return <Spinner />;
  }
  if (!order) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-semibold">Order · {order.eventTitle}</h1>
          <Badge value={order.status} />
        </div>

        <ErrorNote message={error} />

        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {order.items.map((item) => (
            <li key={item.ticketTypeId} className="flex justify-between py-2 text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatPrice(item.unitPriceCents * item.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-zinc-200 pt-3 font-semibold dark:border-zinc-800">
          <span>Total</span>
          <span>{formatPrice(order.totalCents, order.currency)}</span>
        </div>

        {order.status === 'PENDING' && (
          <div className="mt-6">
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Tickets held for <span className="font-mono font-semibold">{countdown}</span> —
              complete payment before the hold expires.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={confirm.isPending}
                onClick={() => confirm.mutate()}
                className="btn-primary flex-1 py-2.5"
              >
                {confirm.isPending
                  ? 'Processing…'
                  : `Pay ${formatPrice(order.totalCents, order.currency)}`}
              </button>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
                className="btn-ghost py-2.5"
              >
                Cancel
              </button>
            </div>
            <p className="muted mt-2 text-xs">
              Demo checkout — payment is simulated. In production this step hands off to a
              gateway such as Razorpay or Stripe in test mode.
            </p>
          </div>
        )}

        {order.status === 'CONFIRMED' && (
          <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            Payment confirmed — your tickets are ready.{' '}
            <Link to="/tickets" className="font-semibold underline">
              View my tickets
            </Link>
          </div>
        )}

        {order.status === 'EXPIRED' && (
          <p className="muted mt-6 text-sm">
            This order expired and its tickets were released.{' '}
            <Link to={`/events/${order.eventId}`} className="accent font-medium">
              Try booking again
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
