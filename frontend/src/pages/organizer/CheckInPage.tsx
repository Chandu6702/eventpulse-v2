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
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Ticket check-in</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan or paste ticket code…"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={scan.isPending}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {scan.isPending ? 'Checking…' : 'Check in'}
        </button>
      </form>

      <div className="mt-6">
        <ErrorNote message={error} />
        {lastResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-lg font-semibold text-emerald-900">✓ {lastResult.attendeeName}</p>
            <p className="text-sm text-emerald-800">
              {lastResult.ticketTypeName} · {lastResult.eventTitle}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Checked in at {formatDateTime(lastResult.checkedInAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
