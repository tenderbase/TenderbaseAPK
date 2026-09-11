'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bell, Bookmark, Building2, CalendarPlus, Check, ChevronLeft, Download, ExternalLink, FileText, History, MapPin, MoreHorizontal, Share2, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import { StatusBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';
import { AiSummaryPanel } from '@/components/tender/AiSummaryPanel';
import { TenderMatchRow } from '@/components/tender/TenderMatchRow';
import { CalendarAction } from '@/components/tender/CalendarAction';
import { FollowSheet } from '@/components/tender/FollowSheet';
import { useSavedTenders } from '@/lib/saved-store';
import { formatValue, formatDate, daysUntil, getStatus } from '@/lib/format';
import type { DataSource } from '@/lib/tenders';
import type { TenderWithUserState } from '@/types/tender';

export interface Amendment { id: string; field: string; from: string | null; to: string | null; detectedAt: string; }
type Stage = 'Qualifying' | 'Pursuing' | 'Preparing' | 'Submitted';
const STAGES: Stage[] = ['Qualifying', 'Pursuing', 'Preparing', 'Submitted'];

function Section({ title, eyebrow, count, children, className }: { title: string; eyebrow?: string; count?: number; children: React.ReactNode; className?: string }) {
  return <section className={cn('min-w-0 rounded-[18px] border border-line bg-white p-4 sm:p-5', className)}>
    <div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0">{eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-ink-3">{eyebrow}</p>}<h2 className="mt-0.5 text-[17px] font-semibold tracking-[-.025em] text-ink">{title}</h2></div>{count !== undefined && <span className="shrink-0 text-[12px] text-ink-3">{count}</span>}</div>{children}
  </section>;
}

export function TenderDetailView({ tender, amendments, source, via }: { tender: TenderWithUserState; amendments: Amendment[]; source: DataSource; via?: 'server' | 'browser' }) {
  const router = useRouter();
  const { session, isSaved, toggleSaved } = useSavedTenders();
  const saved = isSaved(tender.id);
  const [followOpen, setFollowOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('Qualifying');
  const [aiOpen, setAiOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const remaining = tender.closingDate ? daysUntil(tender.closingDate) : null;
  const status = getStatus(tender);

  useEffect(() => { try { const v = localStorage.getItem(`tenderbase-stage-${tender.id}`); if (v && STAGES.includes(v as Stage)) setStage(v as Stage); } catch {} }, [tender.id]);
  function changeStage(next: Stage) { setStage(next); try { localStorage.setItem(`tenderbase-stage-${tender.id}`, next); } catch {} }
  async function share() {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: tender.title, url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch {}
  }

  return <main className="min-h-screen w-full min-w-0 bg-canvas pb-[180px] md:pb-28">
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/95 px-4 py-2.5 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className="tb-icon-button"><ChevronLeft size={21}/></button>
        <span className="hidden text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3 md:block">Tender workspace</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void share()} aria-label={copied ? 'Link copied' : 'Share tender'} className="tb-icon-button">{copied ? <Check size={18}/> : <Share2 size={18}/>}</button>
          <button type="button" onClick={() => toggleSaved(tender)} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save tender'} className={cn('tb-icon-button', saved && 'bg-navy text-white')}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'}/></button>
          <div className="relative hidden md:block"><button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen} aria-label="More actions" className="tb-icon-button"><MoreHorizontal size={18}/></button>{moreOpen && <div className="absolute right-0 top-12 z-40 w-52 rounded-[14px] border border-line bg-white p-1.5 shadow-xl"><button type="button" onClick={() => { setMoreOpen(false); void share(); }} className="w-full rounded-[10px] px-3 py-2.5 text-left text-[12px] font-semibold hover:bg-canvas">Copy / share link</button>{tender.sourceUrl && <a href={tender.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-[10px] px-3 py-2.5 text-[12px] font-semibold hover:bg-canvas">Open source</a>}</div>}</div>
        </div>
      </div>
    </header>

    <div className="mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-6">
      <div className="pt-3"><DataSourceNotice source={source} via={via}/></div>
      <section className="relative mt-3 min-w-0 overflow-hidden rounded-[24px] bg-navy px-5 py-6 text-white shadow-[0_18px_50px_rgba(9,27,49,.16)] sm:px-7 sm:py-7">
        <div className="relative min-w-0"><div className="flex flex-wrap gap-1.5"><StatusBadge status={status}/><CategoryBadge category={tender.category}/>{amendments.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold"><History size={11}/> Amended</span>}</div>
          <h1 className="mt-4 max-w-3xl break-words text-[25px] font-semibold leading-[1.15] tracking-[-.035em] sm:text-[32px]">{tender.title}</h1>
          <div className="mt-3 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/65"><span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words"><Building2 size={15} className="shrink-0"/>{tender.organisation}</span>{tender.location && <span className="inline-flex min-w-0 items-center gap-1.5 break-words"><MapPin size={15} className="shrink-0"/>{tender.location}</span>}</div>
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-[16px] border border-white/10 bg-white/[.055]"><div className="min-w-0 px-2.5 py-3.5 sm:px-4"><p className="truncate text-[9px] uppercase tracking-[.12em] text-white/45">Deadline</p><p className="mt-1.5 break-words text-[13px] font-semibold sm:text-[15px]">{tender.closingDate ? formatDate(tender.closingDate) : 'Not stated'}</p></div><div className="min-w-0 px-2.5 py-3.5 sm:px-4"><p className="truncate text-[9px] uppercase tracking-[.12em] text-white/45">Time left</p><p className="mt-1.5 text-[13px] font-semibold sm:text-[15px]">{remaining === null ? '—' : remaining < 0 ? 'Closed' : remaining === 0 ? 'Today' : `${remaining} days`}</p></div><div className="min-w-0 px-2.5 py-3.5 sm:px-4"><p className="truncate text-[9px] uppercase tracking-[.12em] text-white/45">Opportunity</p><p className="mt-1.5 break-words text-[12px] font-semibold sm:text-[15px]">{formatValue(tender.valueCents)}</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2"><CalendarAction tender={tender}/>{tender.sourceUrl && <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border border-white/12 bg-white/8 px-4 text-[13px] font-semibold">Open source <ExternalLink size={14}/></a>}</div>
        </div>
      </section>

      <Section eyebrow="Bid desk" title="Opportunity stage" className="mt-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft text-blue"><Target size={19}/></span><div className="min-w-0"><p className="text-[12px] text-ink-3">Current stage</p><p className="text-[15px] font-semibold text-ink">{stage}</p></div></div><select value={stage} onChange={e => changeStage(e.target.value as Stage)} aria-label="Change opportunity stage" className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[12px] font-semibold text-navy outline-none sm:w-48">{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="mt-4 grid grid-cols-4 gap-1.5">{STAGES.map((s, i) => <button key={s} type="button" onClick={() => changeStage(s)} className="min-w-0 text-left"><span className={cn('block h-1.5 rounded-full', STAGES.indexOf(stage) >= i ? 'bg-blue' : 'bg-line')}/><span className="mt-1 block truncate text-[9px] text-ink-3">{s}</span></button>)}</div>
      </Section>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]"><div className="min-w-0 space-y-3">
        <Section eyebrow="Next right move" title="Decide if this is worth pursuing" className="border-blue/15 bg-[linear-gradient(180deg,#fff,#fbfdff)]"><div className="rounded-[14px] border border-blue/12 bg-blue-soft/45 p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-blue"><Sparkles size={17}/></span><div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-ink">Review the qualification signals</p><p className="mt-1 text-[12.5px] leading-5 text-ink-2">Check scope, requirements, deadline and commercial fit before committing resources.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setAiOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-blue px-4 text-[12.5px] font-semibold text-white">Review with AI <ArrowUpRight size={14}/></button><button type="button" onClick={() => changeStage('Pursuing')} className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-line bg-white px-4 text-[12.5px] font-semibold text-ink">Mark pursuing</button></div></div></div></div></Section>
        <TenderMatchRow tender={tender}/>{aiOpen && <AiSummaryPanel tender={tender} amendments={amendments}/>} {!aiOpen && <button type="button" onClick={() => setAiOpen(true)} className="w-full rounded-[14px] border border-line bg-white px-4 py-3 text-left text-[12px] font-semibold text-blue hover:bg-blue-soft">Open AI analysis</button>}
        <Section eyebrow="Source record" title="Overview"><dl className="grid min-w-0 gap-x-8 sm:grid-cols-2">{([['Tender number', tender.tenderNumber],['Category', tender.categoryRaw ?? tender.category],['Location', tender.locationFull ?? tender.location],['Published', tender.publishedDate ? formatDate(tender.publishedDate) : 'Not stated']] as const).map(([k,v]) => <div key={k} className="flex min-w-0 items-start justify-between gap-4 border-b border-line py-3"><dt className="shrink-0 text-[12.5px] text-ink-2">{k}</dt><dd className="min-w-0 max-w-[62%] break-words text-right text-[12.5px] font-semibold text-ink">{v}</dd></div>)}</dl>{tender.description && <div className="mt-4 border-t border-line pt-4"><p className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3">Description</p><p className="mt-2 whitespace-pre-line break-words text-[13px] leading-6 text-ink-2">{tender.description}</p></div>}</Section>
        <Section eyebrow="Documents" title="Tender documents" count={tender.documents.length}>{tender.documents.length === 0 ? <p className="text-[12.5px] text-ink-3">No documents are available from the source record.</p> : <div className="space-y-2">{tender.documents.map(doc => <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-canvas p-3 hover:bg-white"><FileText size={17} className="shrink-0 text-ink-3"/><span className="min-w-0 flex-1 break-words text-[12px] font-semibold text-ink">{doc.name}</span><Download size={15} className="shrink-0 text-blue"/></a>)}</div>}</Section>
      </div><aside className="min-w-0 space-y-3"><Section eyebrow="Actions" title="Stay on top of this bid"><button type="button" onClick={() => setFollowOpen(true)} className="flex min-h-11 w-full items-center gap-3 rounded-[12px] border border-line px-3 text-left hover:bg-canvas"><Bell size={17} className="shrink-0 text-blue"/><span className="flex-1 text-[12.5px] font-semibold">{signedIn ? 'Follow deadline & updates' : 'Sign in to follow updates'}</span><ArrowUpRight size={14}/></button><div className="mt-2"><CalendarAction tender={tender}/></div></Section>{amendments.length > 0 && <Section eyebrow="Change tracking" title="Amendments" count={amendments.length}><div className="space-y-3">{amendments.map(a => <div key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0"><p className="text-[12px] font-semibold text-ink">{a.field}</p><p className="mt-1 break-words text-[11px] text-ink-3">{a.from ?? '—'} → {a.to ?? '—'}</p></div>)}</div></Section>}</aside></div>
    </div>
    <FollowSheet open={followOpen} onOpenChange={setFollowOpen} tender={tender}/>
  </main>;
}
