import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/endpoints';
import { formatDateTime, formatPrice } from '../utils/format';
import { Badge, EmptyState, Spinner } from '../components/ui';

export function MyOrdersPage() {
  const { data, isPending } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.mine(),
  });

  if (isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">My orders</h1>
      {!data || data.content.length === 0 ? (
        <EmptyState title="No orders yet">
          <Link to="/" className="font-medium text-indigo-600">
            Browse events
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.content.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-indigo-300"
              >
                <div>
                  <p className="font-medium">{order.eventTitle}</p>
                  <p className="text-sm text-zinc-500">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <Badge value={order.status} />
                  <p className="mt-1 text-sm font-semibold">
                    {formatPrice(order.totalCents, order.currency)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
