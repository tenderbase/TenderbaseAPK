import { AlertTriangle, Database, Info, WifiOff } from 'lucide-react';
import type { DataSource } from '@/lib/tenders';

/**
 * Tells the user when they are NOT looking at the live catalogue:
 *   - `fixture` (dev/test only): captured real payloads, amber, with the
 *     capture date so a stale snapshot is never mistaken for current data.
 *   - `error` (production, upstream down): red-tinted so an outage never reads
 *     as an empty catalogue or a "no results" search.
 *   - `live` + `via: 'browser'`: live rows fetched by the browser because our
 *     own server could not reach the service. Still real data, so it is an
 *     informational line, not a warning — but the user is told where it came
 *     from rather than being left to guess.
 * Silent on the happy path — a badge on every live screen would be noise.
 */
export function DataSourceNotice({
  source,
  notice,
  via,
}: {
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
}) {
  if (source === 'live') {
    if (via !== 'browser') return null;
    return (
      <div
        role="status"
        className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-blue-line bg-blue-soft px-3 py-2.5"
      >
        <Info size={15} strokeWidth={2.1} className="mt-px shrink-0 text-blue" aria-hidden />
        <p className="text-[11.5px] leading-[1.45] text-ink-2">
          {notice ??
            'Live tenders, fetched directly from the tender service in your browser — our server could not reach it from here.'}
        </p>
      </div>
    );
  }

  const error = source === 'error';
  return (
    <div
      role="status"
      className={`mb-3 flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5 ${
        error ? 'border-urgent/25 bg-urgent-bg' : 'border-soon/25 bg-soon-bg'
      }`}
    >
      {error ? (
        <WifiOff size={15} strokeWidth={2.1} className="mt-px shrink-0 text-urgent" aria-hidden />
      ) : (
        <AlertTriangle size={15} strokeWidth={2.1} className="mt-px shrink-0 text-soon" aria-hidden />
      )}
      <p className={`text-[11.5px] leading-[1.45] ${error ? 'text-ink' : 'text-ink-2'}`}>
        {notice ??
          (error
            ? 'Could not reach the tender service. Please try again shortly.'
            : 'Showing tenders captured from the live API — the service is unreachable right now.')}
      </p>
    </div>
  );
}

/** Small provenance line: where the data came from and when. */
export function LiveDataFooter({
  source,
  total,
}: {
  source: DataSource;
  total: number;
}) {
  if (source !== 'live') return null;
  return (
    <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
      <Database size={12} strokeWidth={2} aria-hidden />
      {total.toLocaleString('en-ZA')} live tenders · National Treasury eTenders
    </p>
  );
}
