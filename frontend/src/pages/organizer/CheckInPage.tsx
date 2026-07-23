import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { checkInApi } from '../../api/endpoints';
import { problemDetail } from '../../api/client';
import type { CheckInResult } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { ErrorNote } from '../../components/ui';

/**
 * Gate console: staff paste/scan a ticket code. A hardware QR scanner acts
 * as a keyboard, so a focused input is all the integration needed.
 */
export function CheckInPage() {
  const [code, setCode] = useState('');
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useMutation({
    mutationFn: (ticketCode: string) => checkInApi.scan(ticketCode),
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
    if (code.trim()) {
      scan.mutate(code.trim());
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title mb-1">Ticket check-in</h1>
      <p className="muted mb-6 text-sm">
        Point a QR scanner at the attendee's ticket (it types the code and presses Enter), or
        paste the code manually. Each ticket can be checked in exactly once.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan or paste ticket code…"
          autoFocus
          className="input font-mono"
        />
        <button
          type="submit"
          disabled={scan.isPending}
          className="btn-primary px-5"
        >
          {scan.isPending ? 'Checking…' : 'Check in'}
        </button>
      </form>

      <div className="mt-6">
        <ErrorNote message={error} />
        {lastResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-300">✓ {lastResult.attendeeName}</p>
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
