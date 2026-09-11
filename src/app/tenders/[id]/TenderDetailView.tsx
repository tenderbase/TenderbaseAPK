'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Share2, Bookmark, Building2, Check, FileText, History,
  Download, Mail, Phone, User, ExternalLink, Bell, ArrowUpRight,
  Sparkles, CircleCheck, Circle, MessageSquare, MoreHorizontal,
  Target, Clock3, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { StatusBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';
import { AiSummaryPanel } from '@/components/tender/AiSummaryPanel';
import { TenderMatchRow } from '@/components/tender/TenderMatchRow';
import { CalendarAction } from '@/components/tender/CalendarAction';
import { FollowSheet } from '@/components/tender/FollowSheet';
import { useSavedTenders } from '@/lib/saved-store';
import { formatValue, formatDate, daysUntil, getStatus, normaliseCase } from '@/lib/format';
import type { DataSource } from '@/lib/tenders';
import type { TenderWithUserState } from '@/types/tender';

export interface Amendment {
  id: string;
  field: string;
  from: string | null;
  to: string | null;
  detectedAt: string;
}

function formatBytes(n: number): string | null {
  if (!n) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Section({
  eyebrow,
  title,
  count,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-[18px] border border-line bg-white p-4 sm:p-5', className)}>
      <div className="mb-4 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">{eyebrow}</p>}
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.025em] text-ink">{title}</h2>
        </div>
        {count !== undefined && <span className="shrink-0 text-[12px] font-medium text-ink-3">{count}</span>}
      </div>
      {children}
    </section>
  );
}

export function TenderDetailView({
  tender,
  amendments,
  source,
  via,
}: {
  tender: TenderWithUserState;
  amendments: Amendment[];
  source: DataSource;
  via?: 'server' | 'browser';
}) {
  const router = useRouter();
  const { session, isSaved, toggleSaved } = useSavedTenders();
  const [copiedLink, setCopiedLink] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const saved = isSaved(tender.id);
  const signedIn = session.signedIn;
  const remaining = tender.closingDate ? daysUntil(tender.closingDate) : null;
  const status = getStatus(tender);

  const shareOrCopy = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: tender.title, url }); } catch { /* dismissed */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch { /* unavailable */ }
  };

  const urgency = remaining !== null && remaining <= 3;

  return (
    <main className="min-h-screen w-full min-w-0 bg-canvas pb-[180px] md:pb-28">
      {/* Quiet navigation chrome */}
      <header className="sticky top-0 z-30 w-full border-b border-line/80 bg-white/92 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-ink-2 transition-colors hover:bg-canvas hover:text-ink active:scale-[.97]"
          >
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-blue" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tender workspace</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={copiedLink ? 'Link copied' : 'Share tender'}
              onClick={() => void shareOrCopy()}
              className="flex h-11 w-11 items-center justify-center rounded-[12px] text-ink-2 transition-colors hover:bg-canvas hover:text-ink active:scale-[.97]"
            >
              {copiedLink ? <Check size={19} className="text-success" /> : <Share2 size={19} strokeWidth={1.8} />}
            </button>
            <button
              type="button"
              onClick={() => toggleSaved(tender)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save tender'}
              className={cn('flex h-11 w-11 items-center justify-center rounded-[12px] transition-all active:scale-[.97]', saved ? 'bg-navy text-white' : 'text-ink-2 hover:bg-canvas hover:text-ink')}
            >
              <Bookmark size={19} strokeWidth={1.9} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" aria-label="More actions" className="hidden h-11 w-11 items-center justify-center rounded-[12px] text-ink-2 hover:bg-canvas md:flex">
              <MoreHorizontal size={19} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-6">
        <div className="pt-3">
          <DataSourceNotice source={source} via={via} />
        </div>

        {/* Hero: one decision, one next action */}
        <section className="relative min-w-0 overflow-hidden rounded-[24px] bg-navy px-5 pb-5 pt-6 text-white shadow-[0_18px_50px_rgba(9,27,49,.16)] sm:px-7 sm:pb-7 sm:pt-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue/15 blur-3xl" />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={status} />
              <CategoryBadge category={tender.category} />
              {amendments.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/75">
                  <History size={11} /> Amended
                </span>
              )}
            </div>

            <h1 className="mt-4 max-w-3xl break-words text-[25px] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[32px]">
              {tender.title}
            </h1>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/65">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words"><Building2 size={15} className="shrink-0" />{tender.organisation}</span>
              {tender.location && <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words"><MapPin size={15} className="shrink-0" />{tender.location}</span>}
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-[16px] border border-white/10 bg-white/[.055]">
              <div className="min-w-0 px-2.5 py-3.5 sm:px-4">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-white/45">Deadline</p>
                <p className="mt-1.5 break-words text-[13px] font-semibold sm:text-[15px]">{tender.closingDate ? formatDate(tender.closingDate) : 'Not stated'}</p>
              </div>
              <div className="min-w-0 px-2.5 py-3.5 sm:px-4">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-white/45">Time left</p>
                <p className={cn('mt-1.5 break-words text-[13px] font-semibold sm:text-[15px]', urgency ? 'text-[#ffadad]' : 'text-[#f2c06b]')}>
                  {remaining === null ? '—' : remaining < 0 ? 'Closed' : remaining === 0 ? 'Today' : `${remaining} days`}
                </p>
              </div>
              <div className="min-w-0 px-2.5 py-3.5 sm:px-4">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-white/45">Opportunity</p>
                <p className={cn('mt-1.5 break-words font-semibold sm:text-[15px]', tender.valueCents === null ? 'text-[12px]' : 'text-[13px]')}>{formatValue(tender.valueCents)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CalendarAction tender={tender} />
              {tender.sourceUrl && (
                <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border border-white/12 bg-white/8 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/12">
                  Open source <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Pipeline context */}
        <section className="mt-3 min-w-0 rounded-[18px] border border-line bg-white p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft text-blue"><Target size={19} /></span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[.1em] text-ink-3">Opportunity stage</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink">Ready for qualification</p>
              </div>
            </div>
            <button type="button" className="hidden shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-semibold text-blue hover:bg-blue-soft sm:flex">
              Change stage <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="mt-4 flex min-w-0 items-center gap-1.5 overflow-hidden">
            {['Discover', 'Qualify', 'Pursue', 'Prepare', 'Submit'].map((stage, i) => (
              <div key={stage} className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className={cn('h-1.5 min-w-0 flex-1 rounded-full', i === 0 ? 'bg-blue' : 'bg-line')} />
                {i < 4 && <span className="hidden shrink-0 text-[9px] text-ink-3 sm:block">{stage}</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <div className="min-w-0 space-y-3">
            {/* Next move */}
            <Section eyebrow="Next right move" title="Decide if this is worth pursuing" className="border-blue/15 bg-[linear-gradient(180deg,#fff,#fbfdff)]">
              <div className="min-w-0 rounded-[14px] border border-blue/12 bg-blue-soft/45 p-4">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-blue shadow-sm"><Sparkles size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">Review the qualification signals</p>
                    <p className="mt-1 text-[12.5px] leading-5 text-ink-2">Check scope, location, deadline and commercial fit before moving this opportunity into your active pipeline.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-blue px-4 text-[12.5px] font-semibold text-white shadow-[0_7px_18px_rgba(53,109,255,.18)]">Review with AI <ArrowUpRight size={14} /></button>
                      <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-line bg-white px-4 text-[12.5px] font-semibold text-ink">Mark pursuing</button>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <TenderMatchRow tender={tender} />
            <AiSummaryPanel tender={tender} amendments={amendments} />

            {/* Core facts, deliberately compact */}
            <Section eyebrow="Source record" title="Overview">
              <dl className="grid min-w-0 gap-x-8 sm:grid-cols-2">
                {([
                  ['Tender number', tender.tenderNumber],
                  ['Category', tender.categoryRaw ?? tender.category],
                  ['Location', tender.locationFull ?? tender.location],
                  ['Published', tender.publishedDate ? formatDate(tender.publishedDate) : 'Not stated'],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 items-start justify-between gap-4 border-b border-line py-3 first:pt-0 last:border-b-0 sm:nth-last-2:border-b-0">
                    <dt className="shrink-0 text-[12.5px] text-ink-2">{k}</dt>
                    <dd className="min-w-0 max-w-[62%] break-words text-right text-[12.5px] font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {tender.description && (
                <div className="mt-4 min-w-0 border-t border-line pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3">Description</p>
                  <p className="mt-2 whitespace-pre-line break-words text-[13px] leading-6 text-ink-2">{normaliseCase(tender.description)}</p>
                </div>
              )}
            </Section>

            {tender.contactInformation && (
              <Section eyebrow="Issuer" title="Contact">
                <div className="min-w-0 divide-y divide-line">
                  {tender.contactInformation.contactPerson && <div className="flex min-w-0 items-center gap-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-ink-3"><User size={15} /></span><span className="min-w-0 break-words text-[13px] font-semibold text-ink">{tender.contactInformation.contactPerson}</span></div>}
                  {tender.contactInformation.email && <a href={`mailto:${tender.contactInformation.email}`} className="flex min-w-0 items-center gap-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-ink-3"><Mail size={15} /></span><span className="min-w-0 truncate text-[13px] font-medium text-blue">{tender.contactInformation.email}</span></a>}
                  {tender.contactInformation.phone && <a href={`tel:${tender.contactInformation.phone.replace(/\s+/g, '')}`} className="flex min-w-0 items-center gap-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-ink-3"><Phone size={15} /></span><span className="min-w-0 break-words text-[13px] font-medium text-blue">{tender.contactInformation.phone}</span></a>}
                </div>
              </Section>
            )}
          </div>

          <aside className="min-w-0 space-y-3">
            {/* Lightweight readiness surface — future shared CRM data slots cleanly here */}
            <Section eyebrow="Submission readiness" title="Work to complete">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[26px] font-semibold tracking-[-.04em] text-navy">0%</p>
                  <p className="text-[11px] text-ink-3">No CRM requirements added yet</p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] border-line text-[11px] font-semibold text-ink-2">0 / 0</div>
              </div>
              <button type="button" className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[11px] border border-line text-[12px] font-semibold text-ink hover:bg-canvas"><CircleCheck size={15} /> Add requirements</button>
            </Section>

            <Section eyebrow="Your team" title="Keep the opportunity moving">
              <div className="flex min-w-0 -space-x-2">
                {['S','M','J'].map((initial) => <span key={initial} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-navy text-[10px] font-semibold text-white">{initial}</span>)}
                <button type="button" className="ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-canvas px-3 text-[10px] font-semibold text-ink-2"><span>+ Add</span></button>
              </div>
              <div className="mt-4 min-w-0 space-y-2">
                <div className="flex min-w-0 items-center gap-2.5 rounded-[11px] bg-canvas px-3 py-2.5"><Clock3 size={14} className="shrink-0 text-ink-3" /><span className="min-w-0 truncate text-[11.5px] text-ink-2">Deadline reminder</span><span className="ml-auto shrink-0 text-[10px] font-semibold text-ink">Set</span></div>
                <div className="flex min-w-0 items-center gap-2.5 rounded-[11px] bg-canvas px-3 py-2.5"><MessageSquare size={14} className="shrink-0 text-ink-3" /><span className="min-w-0 truncate text-[11.5px] text-ink-2">Tender conversation</span><span className="ml-auto shrink-0 text-[10px] font-semibold text-blue">Open</span></div>
              </div>
            </Section>

            <Section eyebrow="Timeline" title="Recent activity">
              <div className="min-w-0 space-y-4">
                <div className="flex min-w-0 gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue" /><div className="min-w-0"><p className="break-words text-[12px] font-medium text-ink">Tender added to TenderBase</p><p className="mt-0.5 text-[10.5px] text-ink-3">Today</p></div></div>
                <div className="flex min-w-0 gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-line" /><div className="min-w-0"><p className="break-words text-[12px] font-medium text-ink">Source record available</p><p className="mt-0.5 text-[10.5px] text-ink-3">Source verified</p></div></div>
              </div>
            </Section>
          </aside>
        </div>

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
          <Section eyebrow="Working files" title="Documents" count={tender.documents.length}>
            {tender.documents.length === 0 ? (
              <div className="rounded-[13px] border border-dashed border-line px-4 py-6 text-center"><FileText size={20} className="mx-auto text-ink-3" /><p className="mt-2 text-[12px] text-ink-3">No documents published for this tender.</p></div>
            ) : (
              <ul className="min-w-0 space-y-2">
                {tender.documents.map((d) => {
                  const size = formatBytes(d.sizeBytes);
                  return <li key={d.id} className="min-w-0"><a href={d.url} target="_blank" rel="noopener noreferrer" className="flex w-full min-w-0 items-center gap-3 rounded-[13px] border border-line px-3 py-3 transition-colors hover:bg-canvas"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-navy"><FileText size={16} /></span><span className="min-w-0 flex-1"><span className="block break-words text-[12.5px] font-semibold leading-5 text-ink">{d.name}</span><span className="mt-0.5 block break-words text-[10px] text-ink-3">{d.fileType}{size ? ` · ${size}` : ''}{d.isAddendum ? ' · Addendum' : ''}</span></span><Download size={16} className="shrink-0 text-ink-3" /></a></li>;
                })}
              </ul>
            )}
          </Section>

          <Section eyebrow="Change tracking" title="Amendments" count={amendments.length}>
            {amendments.length === 0 ? (
              <div className="rounded-[13px] border border-dashed border-line px-4 py-6 text-center"><Circle size={19} className="mx-auto text-ink-3" /><p className="mt-2 text-[12px] text-ink-3">No amendments detected.</p></div>
            ) : (
              <ul className="min-w-0 space-y-2">{amendments.map((a) => <li key={a.id} className="min-w-0 rounded-[13px] border border-warning/20 bg-warning/5 px-3.5 py-3"><p className="break-words text-[12.5px] font-semibold text-ink">{a.field} changed</p><p className="mt-1 break-words text-[11px] text-ink-2">{a.from ?? '—'} → <span className="font-semibold text-ink">{a.to ?? '—'}</span></p><p className="mt-1 text-[9.5px] text-ink-3">Detected {formatDate(a.detectedAt)}</p></li>)}</ul>
            )}
          </Section>
        </div>
      </div>

      {/* On mobile the global tab bar occupies the bottom safe area, so this action bar sits above it. */}
      <footer className="fixed inset-x-0 bottom-[calc(66px+env(safe-area-inset-bottom))] z-40 border-t border-line bg-white/94 px-4 pb-2.5 pt-2.5 backdrop-blur-xl md:bottom-0 md:left-[248px] md:pb-3">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 gap-2.5">
          {signedIn && <button type="button" onClick={() => setFollowOpen(true)} className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[12px] border border-line bg-white text-[13px] font-semibold text-ink transition-colors hover:bg-canvas"><Bell size={16} className="shrink-0" /> <span className="truncate">Follow</span></button>}
          <button type="button" onClick={() => toggleSaved(tender)} aria-pressed={saved} className={cn('flex h-12 min-w-0 flex-[1.35] items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold text-white transition-all active:scale-[.99]', saved ? 'bg-success' : 'bg-navy')}><Bookmark size={16} className="shrink-0" fill={saved ? 'currentColor' : 'none'} /><span className="truncate">{saved ? 'Saved to your workspace' : 'Save opportunity'}</span></button>
        </div>
      </footer>

      <FollowSheet open={followOpen} onClose={() => setFollowOpen(false)} tender={tender} saved={saved} onToggleSave={toggleSaved} />
    </main>
  );
}
