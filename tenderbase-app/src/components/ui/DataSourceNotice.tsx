import { AlertTriangle, Database } from 'lucide-react';
import type { DataSource } from '@/lib/tenders';

/**
 * Tells the user when they are looking at fixtures instead of live tenders.
 * Silent on the happy path — a badge on every screen would be noise.
 */
export function DataSourceNotice({
  source,
  notice,
}: {
  source: DataSource;
  notice?: string;
}) {
  if (source === 'live') return null;

  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-soon/25 bg-soon-bg px-3 py-2.5"
    >
      <AlertTriangle size={15} strokeWidth={2.1} className="mt-px shrink-0 text-soon" aria-hidden />
      <p className="text-[11.5px] leading-[1.45] text-ink-2">
        {notice ?? 'Showing sample data — the live tender service is unavailable.'}
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
