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

  const confirm = useMutation({
    mutationFn: () => ordersApi.confirm(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
    onError: (e) => setError(problemDetail(e)),
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Order for {order.eventTitle}</h1>
          <Badge value={order.status} />
        </div>

        <ErrorNote message={error} />

        <ul className="divide-y divide-zinc-100">
          {order.items.map((item) => (
            <li key={item.ticketTypeId} className="flex justify-between py-2 text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatPrice(item.unitPriceCents * item.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-zinc-200 pt-3 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.totalCents, order.currency)}</span>
        </div>

        {order.status === 'PENDING' && (
          <div className="mt-6">
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Tickets held for <span className="font-mono font-semibold">{countdown}</span> — complete
              payment before the hold expires.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={confirm.isPending}
                onClick={() => confirm.mutate()}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {confirm.isPending ? 'Processing…' : 'Pay now (mock)'}
              </button>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {order.status === 'CONFIRMED' && (
          <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Payment confirmed — your tickets are ready.{' '}
            <Link to="/tickets" className="font-semibold underline">
              View my tickets
            </Link>
          </div>
        )}

        {order.status === 'EXPIRED' && (
          <p className="mt-6 text-sm text-zinc-500">
            This order expired and its tickets were released.{' '}
            <Link to={`/events/${order.eventId}`} className="font-medium text-indigo-600">
              Try booking again
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
