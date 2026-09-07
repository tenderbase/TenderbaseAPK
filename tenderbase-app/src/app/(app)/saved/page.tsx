'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Bookmark } from 'lucide-react';
import { TenderCard } from '@/components/tender/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MOCK_TENDERS } from '@/lib/mock-data';
import { getStatus, daysUntil } from '@/lib/format';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';

const TABS = ['All', 'Closing Soon', 'Recently Saved'] as const;
type Tab = (typeof TABS)[number];

export default function SavedPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('All');
  const [tenders, setTenders] = useState(MOCK_TENDERS);

  const toggleSave = (id: string) =>
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, isSaved: !t.isSaved } : t)));

  const saved = tenders.filter((t) => t.isSaved);
  const visible = saved
    .filter((t) => (tab === 'Closing Soon' ? ['urgent', 'closing_soon'].includes(getStatus(t)) : true))
    .sort((a, b) =>
      tab === 'Recently Saved'
        ? +new Date(b.savedAt ?? 0) - +new Date(a.savedAt ?? 0)
        : daysUntil(a.closingDate) - daysUntil(b.closingDate),
    );

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Saved Tenders</h1>
          </div>
            <p className="mt-1 text-meta text-ink-2">Keep track of opportunities you&apos;re interested in.</p>
          </div>
          <button
            aria-label="Sort saved tenders"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
          >
            <ArrowUpDown size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div role="tablist" className="mt-3.5 flex gap-1 rounded-[11px] bg-canvas p-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] text-[13.5px] transition-colors',
                tab === t ? 'bg-white font-semibold text-navy shadow-card-sm' : 'font-medium text-ink-2',
              )}
            >
              {t}
              {t === 'All' && (
                <span className="rounded-lg bg-blue-soft px-1.5 text-micro text-blue">{saved.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-3.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved tenders yet"
            description="Save tenders you're interested in and they'll appear here."
            actionLabel="Explore Tenders"
            onAction={() => router.push('/search')}
          />
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {visible.map((t) => (
              <TenderCard key={t.id} tender={t} onToggleSave={toggleSave} showTenderNumber={false} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
