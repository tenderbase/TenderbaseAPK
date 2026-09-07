'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Info, Bell, BellRing, Bookmark, FileText, Globe2, Clock, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl, ToggleRow } from '@/components/ui/Toggle';
import { SavedToast } from '@/components/company/Field';
import { loadPreferences, savePreferences } from '@/lib/preferences';
import { fetchPreferences, persistPreferences } from '@/lib/preferences-remote';
import {
  CLOSING_WINDOWS, CLOSING_WINDOW_LABELS, DEFAULT_PREFERENCES,
  SELECTABLE_CATEGORIES, SELECTABLE_PROVINCES,
  preferencesEqual, toggleInList,
  type ClosingWindow, type DigestFrequency, type TenderPreferences,
} from '@/types/preferences';
import type { Category, Province } from '@/types/tender';

/**
 * Tender preferences.
 *
 * Saves are explicit rather than live: these settings reshape the whole feed,
 * so the user gets a chance to change several at once and confirm. The bar
 * only appears once something has actually changed.
 */
export function PreferencesView() {
  const router = useRouter();
  const [saved, setSaved] = useState<TenderPreferences>(DEFAULT_PREFERENCES);
  const [draft, setDraft] = useState<TenderPreferences>(DEFAULT_PREFERENCES);
  const [toast, setToast] = useState(false);

  // localStorage is client-only; seed from defaults so SSR and first client
  // render agree, then hydrate.
  useEffect(() => {
    let cancelled = false;
    const local = loadPreferences();
    setSaved(local);
    setDraft(local);
    // Remote wins when signed in, but only if the user hasn't started editing.
    void fetchPreferences().then((remote) => {
      if (cancelled || !remote) return;
      setSaved(remote);
      setDraft((d) => (preferencesEqual(d, local) ? remote : d));
    });
    return () => { cancelled = true; };
  }, []);

  const dirty = useMemo(() => !preferencesEqual(saved, draft), [saved, draft]);
  const set = <K extends keyof TenderPreferences>(key: K, value: TenderPreferences[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    setSaved(savePreferences(draft));
    setToast(true);
    void persistPreferences(draft);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <main className={cn(dirty && 'pb-28')}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-2">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink"
        >
          <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-card-title font-semibold tracking-[-0.02em]">
          Tender Preferences
        </h1>
        <button
          onClick={() => setDraft(DEFAULT_PREFERENCES)}
          disabled={preferencesEqual(draft, DEFAULT_PREFERENCES)}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-ink-2 disabled:opacity-30"
          aria-label="Reset to defaults"
          title="Reset to defaults"
        >
          <RotateCcw size={17} strokeWidth={1.9} aria-hidden />
        </button>
      </header>

      <div className="px-5 pt-3.5">
        <p className="text-[13px] leading-[1.5] text-ink-2">
          These preferences shape your dashboard feed, recommendations and alerts.
        </p>

        {/* Categories */}
        <Card className="mt-3.5">
          <CardHead
            title="Categories"
            count={draft.categories.length > 0 ? `${draft.categories.length} selected` : 'All'}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SELECTABLE_CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={c}
                tone="outline"
                selected={draft.categories.includes(c)}
                onClick={() => set('categories', toggleInList<Category>(draft.categories, c))}
              />
            ))}
          </div>
          {draft.categories.length === 0 && <AllNote>Showing every category.</AllNote>}
        </Card>

        {/* Provinces */}
        <Card className="mt-3">
          <CardHead
            title="Provinces"
            count={draft.provinces.length > 0 ? `${draft.provinces.length} selected` : 'All'}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SELECTABLE_PROVINCES.map((p) => (
              <Chip
                key={p}
                label={p}
                tone="outline"
                selected={draft.provinces.includes(p)}
                onClick={() => set('provinces', toggleInList<Province>(draft.provinces, p))}
              />
            ))}
          </div>
          {draft.provinces.length === 0 && <AllNote>Showing every province.</AllNote>}
          <div className="mt-1 border-t border-line">
            <ToggleRow
              icon={Globe2}
              label="Include national tenders"
              description="Tenders advertised nationally rather than to one province"
              checked={draft.includeNational}
              onChange={(v) => set('includeNational', v)}
            />
          </div>
        </Card>

        {/* Value range — unavailable in this feed */}
        <Card className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink-3">
                Tender value range
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-2">Only show tenders within this range</p>
            </div>
            <span className="mt-0.5 shrink-0 rounded-full bg-canvas px-2 py-1 text-micro font-semibold uppercase tracking-[0.05em] text-ink-3">
              Unavailable
            </span>
          </div>

          {/* Inert by design: the slider is shown so the intent is visible, but
              it cannot be operated because there is no data behind it. */}
          <div aria-hidden className="mt-3.5 select-none opacity-40">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-3">Min</p>
                <p className="text-[15px] font-bold text-ink-3">R250 000</p>
              </div>
              <div className="text-right">
                <p className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-3">Max</p>
                <p className="text-[15px] font-bold text-ink-3">R20M+</p>
              </div>
            </div>
            <div className="relative mt-2.5 h-1.5 rounded-full bg-line">
              <div className="absolute inset-y-0 left-[8%] right-[8%] rounded-full bg-ink-3/40" />
              <span className="absolute -top-[7px] left-[4%] h-[19px] w-[19px] rounded-full border-2 border-ink-3/40 bg-white" />
              <span className="absolute -top-[7px] right-[4%] h-[19px] w-[19px] rounded-full border-2 border-ink-3/40 bg-white" />
            </div>
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-canvas px-2.5 py-2 text-[11.5px] leading-[1.45] text-ink-2">
            <Info size={13} strokeWidth={2.1} className="mt-px shrink-0 text-ink-3" aria-hidden />
            <span>
              The eTenders feed doesn&apos;t publish contract values, so every tender shows
              &ldquo;Not disclosed&rdquo;. This filter will switch on if values become available.
            </span>
          </p>
        </Card>

        {/* Matching */}
        <SectionLabel>Matching</SectionLabel>
        <Card className="divide-y divide-line py-0">
          <div className="pt-1">
            <div className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink-2">
                <Clock size={17} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-medium text-ink">Time to prepare a bid</p>
                <p className="mt-0.5 text-[12px] leading-[1.4] text-ink-2">
                  Hide tenders closing sooner than this
                </p>
              </div>
            </div>
            <div className="pb-3">
              <SegmentedControl<ClosingWindow>
                label="Minimum days before closing"
                value={draft.minDaysToClose}
                options={CLOSING_WINDOWS.map((w) => ({
                  value: w,
                  label: w === 0 ? 'All' : `${w}d+`,
                }))}
                onChange={(v) => set('minDaysToClose', v)}
              />
              <p className="mt-1.5 text-[11.5px] text-ink-3">
                {CLOSING_WINDOW_LABELS[draft.minDaysToClose]}
                {draft.minDaysToClose > 0 && ' before the closing date.'}
              </p>
            </div>
          </div>
          <ToggleRow
            icon={FileText}
            label="Only tenders with documents"
            description="Skip listings with no downloadable bid pack"
            checked={draft.requireDocuments}
            onChange={(v) => set('requireDocuments', v)}
          />
        </Card>

        {/* Alerts */}
        <SectionLabel>Alerts</SectionLabel>
        <Card className="divide-y divide-line py-0">
          <ToggleRow
            icon={BellRing}
            label="New tender matches"
            description="When a tender matching these preferences is published"
            checked={draft.alertOnNewMatch}
            onChange={(v) => set('alertOnNewMatch', v)}
          />
          <ToggleRow
            icon={Clock}
            label="Closing soon"
            description="Three days before a saved tender closes"
            checked={draft.alertOnClosingSoon}
            onChange={(v) => set('alertOnClosingSoon', v)}
          />
          <ToggleRow
            icon={Bookmark}
            label="Saved tender updated"
            description="When an addendum or date change is published"
            checked={draft.alertOnSavedUpdated}
            onChange={(v) => set('alertOnSavedUpdated', v)}
          />
        </Card>

        <SectionLabel>Email digest</SectionLabel>
        <Card>
          <div className="flex items-center gap-3 pb-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink-2">
              <Bell size={17} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium text-ink">Digest frequency</p>
              <p className="mt-0.5 text-[12px] leading-[1.4] text-ink-2">
                A summary of new matches, sent at 07:00
              </p>
            </div>
          </div>
          <SegmentedControl<DigestFrequency>
            label="Email digest frequency"
            value={draft.digest}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            onChange={(v) => set('digest', v)}
          />
        </Card>

        <p className="mb-2 mt-4 text-center text-[11px] text-ink-3">
          Preferences apply to your feed, recommendations and alerts.
        </p>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-white px-5 py-3 md:bottom-0 md:pl-[calc(15rem+1.25rem)]">
          <div className="mx-auto flex max-w-3xl gap-2.5 md:max-w-5xl">
            <Button variant="secondary" className="flex-1" onClick={() => setDraft(saved)}>
              Discard
            </Button>
            <Button className="flex-[1.6]" onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </div>
      )}

      <SavedToast show={toast} />
    </main>
  );
}

// ---------------------------------------------------------------------------

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[14px] border border-line bg-white px-3.5 py-3.5', className)}>
      {children}
    </section>
  );
}

function CardHead({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h2>
      <span className="shrink-0 text-[12px] text-ink-2">{count}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 mt-4 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
      {children}
    </h2>
  );
}

function AllNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-[11.5px] text-ink-3">{children}</p>;
}
