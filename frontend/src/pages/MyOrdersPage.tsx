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
      <h1 className="page-title mb-6">My orders</h1>
      {!data || data.content.length === 0 ? (
        <EmptyState title="No orders yet">
          <Link to="/" className="accent font-medium">
            Browse events
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.content.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="card flex items-center justify-between p-4 transition hover:border-indigo-300 dark:hover:border-indigo-500/50"
              >
                <div>
                  <p className="font-medium">{order.eventTitle}</p>
                  <p className="muted text-sm">{formatDateTime(order.createdAt)}</p>
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
