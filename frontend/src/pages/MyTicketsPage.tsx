import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ticketsApi, waitlistApi } from '../api/endpoints';
import type { Ticket } from '../api/types';
import { formatDateTime } from '../utils/format';
import { Badge, EmptyState, Spinner } from '../components/ui';

function TicketCard({ ticket }: { ticket: Ticket }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(ticket.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="card flex overflow-hidden p-0">
      {/* QR stub — always on a white patch so scanners read it in dark mode too */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 bg-white p-4">
        <QRCodeSVG value={ticket.code} size={104} aria-label="Ticket QR code" />
        <button
          type="button"
          onClick={copyCode}
          title="Copy the full ticket code"
          className="font-mono text-[10px] tracking-wider text-zinc-400 hover:text-zinc-600"
        >
          {copied ? 'Copied ✓' : `${ticket.code.slice(0, 12)}… ⧉`}
        </button>
      </div>

      {/* Perforation between stub and details */}
      <div className="relative border-l-2 border-dashed border-zinc-300 dark:border-zinc-700">
        <span className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-zinc-50 dark:bg-zinc-950" />
        <span className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-zinc-50 dark:bg-zinc-950" />
      </div>

      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display truncate font-semibold">{ticket.eventTitle}</p>
          <Badge value={ticket.status} />
        </div>
        <p className="accent mt-0.5 text-xs font-medium tracking-wide uppercase">
          {ticket.ticketTypeName}
        </p>
        <p className="muted mt-2 text-sm">{formatDateTime(ticket.startsAt)}</p>
        <p className="muted truncate text-sm">{ticket.venue}</p>
        {ticket.status === 'CHECKED_IN' && ticket.checkedInAt && (
          <p className="mt-2 text-xs text-sky-600 dark:text-sky-400">
            Checked in {formatDateTime(ticket.checkedInAt)}
          </p>
        )}
        {ticket.eventStatus === 'CANCELLED' && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            This event was cancelled by the organizer — the ticket is no longer
            valid and your payment will be refunded.
          </p>
        )}
      </div>
    </div>
  );
}

export function MyTicketsPage() {
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: ticketsApi.mine });
  const waitlist = useQuery({ queryKey: ['waitlist'], queryFn: waitlistApi.mine });

  if (tickets.isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title mb-1">My tickets</h1>
      <p className="muted mb-6 text-sm">
        Show the QR code at the entrance — the event team scans it at the check-in desk and it
        turns to <span className="font-medium">Checked in</span>.
      </p>

      {!tickets.data || tickets.data.length === 0 ? (
        <EmptyState title="No tickets yet">
          <Link to="/" className="accent font-medium">
            Find an event
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tickets.data.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {waitlist.data && waitlist.data.length > 0 && (
        <>
          <h2 className="font-display mt-10 mb-3 text-lg font-semibold">Waitlists</h2>
          <ul className="space-y-2">
            {waitlist.data.map((entry) => (
              <li key={entry.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{entry.eventTitle}</p>
                  <p className="muted text-sm">{entry.ticketTypeName}</p>
                </div>
                <div className="text-right">
                  <Badge value={entry.status} />
                  {entry.status === 'NOTIFIED' && (
                    <p className="accent mt-1 text-xs">A spot opened up — book now!</p>
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
