import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/endpoints';
import type { CategoryCount, EventStats } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatDate, formatPrice } from '../utils/format';
import { Badge, Spinner, StatTile } from '../components/ui';

/** Sum per-event daily sales into one continuous 14-day series. */
function buildDailySeries(events: EventStats[]): { date: string; count: number }[] {
  const byDate = new Map<string, number>();
  for (const event of events) {
    for (const day of event.salesPerDay) {
      byDate.set(day.date, (byDate.get(day.date) ?? 0) + day.count);
    }
  }
  const series: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return series;
}

/** Single-series daily bar chart with a per-bar hover tooltip. */
function DailySalesChart({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 170;
  const PAD = { top: 12, right: 8, bottom: 22, left: 30 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.count));
  const band = plotW / data.length;
  const barW = Math.max(4, band - 2); // 2px surface gap between bars
  const gridSteps = max <= 4 ? max : 4;

  const bars = data.map((d, i) => {
    const h = (d.count / max) * plotH;
    const x = PAD.left + i * band + (band - barW) / 2;
    const y = PAD.top + plotH - h;
    const r = Math.min(4, barW / 2, h); // rounded data-end, anchored baseline
    const path =
      h === 0
        ? ''
        : `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + barW - r} ${y} Q ${x + barW} ${y} ${x + barW} ${y + r} L ${x + barW} ${y + h} Z`;
    return { ...d, x, y, h, path, i };
  });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tickets sold per day, last 14 days">
        {Array.from({ length: gridSteps + 1 }, (_, s) => {
          const value = Math.round((max / gridSteps) * s);
          const y = PAD.top + plotH - (value / max) * plotH;
          return (
            <g key={s}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
              >
                {value}
              </text>
            </g>
          );
        })}
        {bars.map((bar) => (
          <path key={bar.date} d={bar.path} className="fill-orange-600 dark:fill-orange-600" />
        ))}
        {/* labels on first, middle and last day only */}
        {[0, 7, 13].map((i) => (
          <text
            key={i}
            x={PAD.left + i * band + band / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
          >
            {formatDate(data[i].date)}
          </text>
        ))}
        {/* full-height hover targets, wider than the bars */}
        {bars.map((bar) => (
          <rect
            key={`hit-${bar.date}`}
            x={PAD.left + bar.i * band}
            y={PAD.top}
            width={band}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(bar.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: `${((PAD.left + hover * band + band / 2) / W) * 100}%` }}
        >
          <span className="font-semibold">{data[hover].count}</span> ticket
          {data[hover].count === 1 ? '' : 's'} · {formatDate(data[hover].date)}
        </div>
      )}
    </div>
  );
}

/** Horizontal magnitude bars — one hue, direct labels, values in text ink. */
function CategoryBars({ data, unit }: { data: CategoryCount[]; unit: string }) {
  if (data.length === 0) {
    return <p className="muted text-sm">Nothing here yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.count));
  return (
    <ul className="space-y-2.5">
      {data.map((row) => (
        <li key={row.category} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate font-medium">
            {row.category.charAt(0) + row.category.slice(1).toLowerCase()}
          </span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <span
              className="block h-full rounded-full bg-orange-600 dark:bg-orange-600"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </span>
          <span className="muted w-16 shrink-0 text-right tabular-nums">
            {row.count} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function InsightCard({ queryKey, fetcher }: { queryKey: string; fetcher: () => Promise<{ insight: string } | null> }) {
  const { data, isPending } = useQuery({
    queryKey: ['analytics', queryKey, 'insight'],
    queryFn: fetcher,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // null = AI not configured server-side; the dashboard is numbers-only.
  if (!isPending && !data) {
    return null;
  }

  const bullets = (data?.insight ?? '')
    .split('\n')
    .map((line) => line.replace(/^[\s•*-]+/, '').trim())
    .filter(Boolean);

  return (
    <div className="card border-orange-200 p-5 dark:border-orange-500/30">
      <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
        <span className="accent">✦</span> AI insight
      </h3>
      {isPending ? (
        <p className="muted mt-2 text-sm">Reading your numbers…</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2">
              <span className="accent shrink-0">–</span>
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrganizerSection() {
  const { data, isPending } = useQuery({
    queryKey: ['analytics', 'organizer'],
    queryFn: analyticsApi.organizer,
  });

  const daily = useMemo(() => (data ? buildDailySeries(data.events) : []), [data]);

  if (isPending) {
    return <Spinner />;
  }
  if (!data) {
    return null;
  }

  return (
    <section className="space-y-5">
      <h2 className="font-display text-lg font-semibold">Organizer overview</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Events" value={String(data.totalEvents)} />
        <StatTile label="Tickets sold" value={String(data.ticketsSold)} />
        <StatTile label="Revenue" value={formatPrice(data.revenueCents) === 'Free' ? '₹0' : formatPrice(data.revenueCents)} />
        <StatTile
          label="Checked in"
          value={String(data.checkedIn)}
          hint={data.ticketsSold > 0 ? `${Math.round((data.checkedIn / data.ticketsSold) * 100)}% attendance` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h3 className="font-display mb-3 text-sm font-semibold">Tickets sold — last 14 days</h3>
          <DailySalesChart data={daily} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display mb-3 text-sm font-semibold">Sales by category</h3>
          <CategoryBars data={data.categoryBreakdown} unit="sold" />
        </div>
      </div>

      {data.events.length > 0 && (
        <div className="card scroll-thin overflow-x-auto p-5">
          <h3 className="font-display mb-3 text-sm font-semibold">Per-event pulse</h3>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="muted border-b border-zinc-200 text-left text-xs uppercase tracking-wide dark:border-zinc-800">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Sold</th>
                <th className="pb-2 font-medium">Last 7 days</th>
                <th className="pb-2 font-medium">Checked in</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.events.map((event) => (
                <tr key={event.eventId}>
                  <td className="max-w-52 py-2.5 pr-3">
                    <p className="truncate font-medium">{event.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge value={event.status} />
                      <span className="muted text-xs">{formatDate(event.startsAt)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="tabular-nums">
                      {event.sold}
                      <span className="muted">/{event.capacity}</span>
                    </p>
                    <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span
                        className="block h-full rounded-full bg-orange-600 dark:bg-orange-600"
                        style={{ width: `${event.capacity > 0 ? Math.min(100, (event.sold / event.capacity) * 100) : 0}%` }}
                      />
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {event.soldLast7Days > 0 ? `+${event.soldLast7Days}` : '0'}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{event.checkedIn}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {event.revenueCents === 0 ? '₹0' : formatPrice(event.revenueCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InsightCard queryKey="organizer" fetcher={analyticsApi.organizerInsight} />
    </section>
  );
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const isOrganizer = !!user && user.role !== 'ATTENDEE';

  const { data, isPending } = useQuery({
    queryKey: ['analytics', 'me'],
    queryFn: analyticsApi.personal,
  });

  if (isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="space-y-5">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="muted mt-1 text-sm">Your activity on EventPulse at a glance.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Tickets bought" value={String(data?.ticketsBought ?? 0)} />
          <StatTile
            label="Total spent"
            value={(data?.spentCents ?? 0) === 0 ? '₹0' : formatPrice(data?.spentCents ?? 0)}
          />
          <StatTile label="Events attended" value={String(data?.eventsAttended ?? 0)} />
          <StatTile label="Upcoming tickets" value={String(data?.upcomingTickets ?? 0)} />
        </div>

        <div className="card p-5">
          <h3 className="font-display mb-3 text-sm font-semibold">What you go to</h3>
          {data && data.categoryBreakdown.length > 0 ? (
            <CategoryBars data={data.categoryBreakdown} unit="" />
          ) : (
            <p className="muted text-sm">
              No tickets yet —{' '}
              <Link to="/" className="accent font-medium">
                find your first event
              </Link>
              .
            </p>
          )}
        </div>

        <InsightCard queryKey="me" fetcher={analyticsApi.personalInsight} />
      </section>

      {isOrganizer && <OrganizerSection />}
    </div>
  );
}
