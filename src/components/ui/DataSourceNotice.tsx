import { Database, Info, WifiOff } from 'lucide-react';
import type { DataSource } from '@/lib/tenders';

/** Shows provenance only when live data is unavailable or reached the browser directly. */
export function DataSourceNotice({ source, notice, via }: { source: DataSource; notice?: string; via?: 'server' | 'browser' }) {
  if (source === 'live') {
    if (via !== 'browser') return null;
    return (
      <div role="status" className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-blue-line bg-blue-soft px-3 py-2.5">
        <Info size={15} strokeWidth={2.1} className="mt-px shrink-0 text-blue" aria-hidden />
        <p className="text-[11.5px] leading-[1.45] text-ink-2">{notice ?? 'Live tenders, fetched directly from the tender service in your browser.'}</p>
      </div>
    );
  }
  return (
    <div role="status" className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-urgent/25 bg-urgent-bg px-3 py-2.5">
      <WifiOff size={15} strokeWidth={2.1} className="mt-px shrink-0 text-urgent" aria-hidden />
      <p className="text-[11.5px] leading-[1.45] text-ink">{notice ?? 'Could not reach the tender service. Please try again shortly.'}</p>
    </div>
  );
}

export function LiveDataFooter({ source, total }: { source: DataSource; total: number }) {
  if (source !== 'live') return null;
  return <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-3"><Database size={12} strokeWidth={2} aria-hidden />{total.toLocaleString('en-ZA')} live tenders · National Treasury eTenders</p>;
}
