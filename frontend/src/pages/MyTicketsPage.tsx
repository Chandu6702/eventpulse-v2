import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ticketsApi, waitlistApi } from '../api/endpoints';
import { formatDateTime } from '../utils/format';
import { Badge, EmptyState, Spinner } from '../components/ui';

export function MyTicketsPage() {
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: ticketsApi.mine });
  const waitlist = useQuery({ queryKey: ['waitlist'], queryFn: waitlistApi.mine });

  if (tickets.isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">My tickets</h1>

      {!tickets.data || tickets.data.length === 0 ? (
        <EmptyState title="No tickets yet">
          <Link to="/" className="font-medium text-indigo-600">
            Find an event
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.data.map((ticket) => (
            <div
              key={ticket.id}
              className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="shrink-0 rounded-lg border border-zinc-100 bg-white p-2">
                <QRCodeSVG value={ticket.code} size={96} aria-label="Ticket QR code" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{ticket.eventTitle}</p>
                <p className="text-sm text-zinc-500">{ticket.ticketTypeName}</p>
                <p className="text-sm text-zinc-500">{formatDateTime(ticket.startsAt)}</p>
                <p className="truncate text-sm text-zinc-500">{ticket.venue}</p>
                <div className="mt-2">
                  <Badge value={ticket.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {waitlist.data && waitlist.data.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Waitlists</h2>
          <ul className="space-y-2">
            {waitlist.data.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{entry.eventTitle}</p>
                  <p className="text-sm text-zinc-500">{entry.ticketTypeName}</p>
                </div>
                <div className="text-right">
                  <Badge value={entry.status} />
                  {entry.status === 'NOTIFIED' && (
                    <p className="mt-1 text-xs text-indigo-600">A spot opened up — book now!</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
