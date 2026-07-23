import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import QrScanner from 'qr-scanner';
import { checkInApi, eventsApi } from '../../api/endpoints';
import { problemDetail } from '../../api/client';
import type { CheckInResult } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { ErrorNote, Spinner } from '../../components/ui';

/**
 * Gate console: staff pick which event this station admits, then scan
 * tickets three ways — a hardware QR scanner (acts as a keyboard, so a
 * focused input is all the integration needed), the device camera, or
 * pasting the code. Scoping scans to one event means a genuine ticket
 * for the workshop next door is turned away at this gate.
 */
export function CheckInPage() {
  const [eventId, setEventId] = useState('');
  const [code, setCode] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The same QR stays in front of the camera for many frames — remember
  // what was just submitted so one ticket produces one request.
  const recentScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const events = useQuery({ queryKey: ['my-events'], queryFn: () => eventsApi.mine() });
  const gateEvents = events.data?.content.filter((e) => e.status === 'PUBLISHED') ?? [];
  const selectedEventId = eventId || gateEvents[0]?.id || '';

  const scan = useMutation({
    mutationFn: (ticketCode: string) => checkInApi.scan(ticketCode, selectedEventId),
    onSuccess: (result) => {
      setLastResult(result);
      setError(null);
      setCode('');
    },
    onError: (e) => {
      setLastResult(null);
      setError(problemDetail(e));
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.trim() && selectedEventId) {
      scan.mutate(code.trim());
    }
  }

  useEffect(() => {
    if (!cameraOn || !videoRef.current) {
      return;
    }
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const now = Date.now();
        if (result.data === recentScan.current.code && now - recentScan.current.at < 3000) {
          return;
        }
        recentScan.current = { code: result.data, at: now };
        scan.mutate(result.data);
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, maxScansPerSecond: 4 },
    );
    scanner.start().catch((e: unknown) => {
      setCameraOn(false);
      setError(e instanceof Error ? e.message : 'Could not start the camera');
    });
    return () => {
      scanner.stop();
      scanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, selectedEventId]);

  if (events.isPending) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title mb-1">Ticket check-in</h1>
      <p className="muted mb-6 text-sm">
        Pick the event this gate is for, then scan or paste ticket codes. A QR scanner types the
        code and presses Enter on its own. Tickets for other events are rejected here.
      </p>

      {gateEvents.length === 0 ? (
        <p className="muted text-sm">No published events to check in for yet.</p>
      ) : (
        <>
          <label className="mb-4 block text-sm">
            <span className="lbl">Checking in for</span>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setLastResult(null);
                setError(null);
              }}
              className="input"
            >
              {gateEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {e.venue}
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Scan or paste ticket code…"
              autoFocus
              className="input font-mono"
            />
            <button type="submit" disabled={scan.isPending} className="btn-primary px-5">
              {scan.isPending ? 'Checking…' : 'Check in'}
            </button>
          </form>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCameraOn((v) => !v);
              }}
              className="btn-ghost w-full"
            >
              {cameraOn ? 'Stop camera' : 'Scan with camera'}
            </button>
            {cameraOn && (
              <video
                ref={videoRef}
                className="mt-3 aspect-video w-full rounded-2xl bg-black object-cover"
                muted
                playsInline
              />
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <ErrorNote message={error} />
        {lastResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-300">
              ✓ {lastResult.attendeeName}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-400">
              {lastResult.ticketTypeName} · {lastResult.eventTitle}
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-500">
              Checked in at {formatDateTime(lastResult.checkedInAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
