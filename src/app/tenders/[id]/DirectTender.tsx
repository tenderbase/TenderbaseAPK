'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudOff, Loader2, SearchX } from 'lucide-react';
import { TenderDetailView } from './TenderDetailView';
import { directTenderDetail, type DirectDetail } from '@/lib/tender-direct';

type Phase =
  | { phase: 'loading' }
  | { phase: 'found'; detail: DirectDetail }
  | { phase: 'missing' }
  | { phase: 'failed' };

/**
 * Detail resolver for when our own server could not reach the ingestion API.
 *
 * The server cannot tell "this tender does not exist" apart from "I could not
 * ask" in that situation — it only knows it has no local copy. Rather than show
 * an outage (or a false 404, which is what the old fixture-miss path did for
 * every id outside the 8 captured rows), the browser asks the public,
 * CORS-open upstream directly:
 *   - found   -> render the real detail view, provenance shown (`via`)
 *   - missing -> only the upstream's own 404 becomes "not found"
 *   - failed  -> the honest outage state, with the server's notice
 *
 * Failure is always visible, never silent: the user sees which of the three
 * happened.
 */
export function DirectTender({ id, serverNotice }: { id: string; serverNotice: string }) {
  const [state, setState] = useState<Phase>({ phase: 'loading' });

  const resolve = useCallback(async () => {
    setState({ phase: 'loading' });
    try {
      const detail = await directTenderDetail(id);
      setState(detail ? { phase: 'found', detail } : { phase: 'missing' });
    } catch (e) {
      console.warn(
        '[tender] browser-direct detail fallback failed:',
        e instanceof Error ? e.message : e,
      );
      setState({ phase: 'failed' });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await directTenderDetail(id);
        if (cancelled) return;
        setState(detail ? { phase: 'found', detail } : { phase: 'missing' });
      } catch (e) {
        if (cancelled) return;
        console.warn(
          '[tender] browser-direct detail fallback failed:',
          e instanceof Error ? e.message : e,
        );
        setState({ phase: 'failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.phase === 'found') {
    return (
      <TenderDetailView
        tender={state.detail.tender}
        amendments={state.detail.tender.amendments}
        source="live"
        via="browser"
      />
    );
  }

  if (state.phase === 'loading') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <Loader2 size={22} className="animate-spin text-ink-3" aria-hidden />
        <p className="mt-3 text-[14px] text-ink-2">Fetching this tender from the tender service…</p>
      </main>
    );
  }

  if (state.phase === 'missing') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <SearchX size={26} strokeWidth={1.8} className="text-ink-3" aria-hidden />
        <p className="mt-3 text-[15px] font-semibold text-ink">This tender is no longer listed</p>
        <p className="mt-2 max-w-[300px] text-body text-ink-2">
          The tender service has no record under this link. It may have been withdrawn or replaced —
          search the live catalogue instead.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white"
        >
          Search tenders
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
      <CloudOff size={26} strokeWidth={1.8} className="text-urgent" aria-hidden />
      <p className="mt-3 text-[15px] font-semibold text-ink">{serverNotice}</p>
      <p className="mt-2 max-w-[300px] text-body text-ink-2">
        The tender you opened is still on the eTenders portal — nothing has been lost.
      </p>
      <div className="mt-6 flex items-center gap-2.5">
        <button
          type="button"
          onClick={resolve}
          className="inline-flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/search"
          className="inline-flex h-[52px] items-center rounded-md border border-line bg-white px-6 font-semibold text-ink"
        >
          Back to search
        </Link>
      </div>
    </main>
  );
}
