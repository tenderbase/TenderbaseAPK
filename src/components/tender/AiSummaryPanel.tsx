'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CheckCircle2, Clock3, FileText, Lock, ShieldAlert, Sparkles, Target, Users, Zap, Crown } from 'lucide-react';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { quickSummaryBullets, noticeRiskFlags, type NoticeBulletIcon } from '@/lib/notice-analysis';
import type { TenderWithUserState } from '@/types/tender';

const ICONS: Record<NoticeBulletIcon, typeof Clock3> = { clock: Clock3, calendar: Clock3, pin: Clock3, file: FileText, tag: Clock3, mail: Clock3 };

type AiAnalysis = {
  decision: 'bid' | 'review' | 'skip';
  fitScore: number;
  whyItMatters: string;
  eligibility: string[];
  effort: string;
  risks: string[];
  nextActions: string[];
  buyerIntelligence: string[];
  relatedSignals: string[];
};

function tenderPayload(tender: TenderWithUserState) {
  return {
    id: tender.id, tenderNumber: tender.tenderNumber, title: tender.title, description: tender.description,
    organisation: tender.organisation, category: tender.category, categoryRaw: tender.categoryRaw,
    province: tender.province, location: tender.location, locationFull: tender.locationFull, valueCents: tender.valueCents,
    publishedDate: tender.publishedDate, closingDate: tender.closingDate, sourceUrl: tender.sourceUrl, cidbGrade: tender.cidbGrade,
    contactInformation: tender.contactInformation,
    documents: tender.documents.map((d) => ({ name: d.name, fileType: d.fileType, sizeBytes: d.sizeBytes, isAddendum: d.isAddendum })),
  };
}

function List({ items, tone = 'normal' }: { items: string[]; tone?: 'normal' | 'risk' }) {
  if (!items.length) return <p className="text-[12.5px] text-ink-3">No additional signals identified.</p>;
  return <ul className="space-y-2">{items.map((item, i) => <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-[12.5px] leading-[18px] text-ink-2"><span className={tone === 'risk' ? 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-urgent' : 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ai'} /><span>{item}</span></li>)}</ul>;
}

function DecisionBadge({ decision }: { decision: AiAnalysis['decision'] }) {
  const config = { bid: ['Bid', 'border-open/20 bg-open-bg text-open'], review: ['Review', 'border-soon/20 bg-soon-bg text-soon'], skip: ['Skip', 'border-urgent/20 bg-urgent-bg text-urgent'] }[decision];
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${config[1]}`}><Target size={11} />{config[0]}</span>;
}

export function AiSummaryPanel({ tender, amendments }: { tender: TenderWithUserState; amendments: unknown[] }) {
  const { session } = useSavedTenders();
  const { tier } = useTier();
  const { openUpgrade } = useUpgrade();
  const isPro = tier === 'pro';
  const signedIn = session.signedIn;
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bullets = useMemo(() => quickSummaryBullets(tender), [tender]);
  const flags = useMemo(() => noticeRiskFlags(tender, amendments.length), [tender, amendments.length]);

  useEffect(() => {
    if (!signedIn || !isPro) return;
    let cancelled = false;
    setLoading(true); setError('');
    fetch('/api/ai/tender', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'analysis', tender: tenderPayload(tender) }) })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data?.error || 'Tender Intelligence failed.'); return data; })
      .then((data) => { if (!cancelled) setAnalysis(data.analysis as AiAnalysis); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Tender Intelligence failed.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPro, signedIn, tender]);

  return (
    <section aria-label="Tender Intelligence" className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-ai-bg text-ai"><Sparkles size={16} /></span><div className="min-w-0"><h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Tender Intelligence</h2><p className="mt-0.5 text-[11.5px] leading-[16px] text-ink-3">Decision support from the tender notice and published data.</p></div></div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-pro-line bg-pro-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7a610f]"><Crown size={10} /> Pro</span>
      </header>

      <div className="border-t border-line px-4 py-3.5"><div className="mb-2.5 flex items-center justify-between gap-2"><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">At a glance</h3><span className="rounded-[5px] bg-canvas px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-2">verified notice facts</span></div><ul className="space-y-2">{bullets.map((b) => { const Icon = ICONS[b.icon]; return <li key={b.text} className="flex items-start gap-2.5"><span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-canvas text-ink-2"><Icon size={12.5} /></span><span className="text-[13px] leading-[18px] text-ink">{b.text}</span></li>; })}</ul></div>

      {!signedIn ? <div className="border-t border-line px-4 py-4"><Link href="/login" className="inline-flex items-center gap-2 rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">Sign in to use Tender Intelligence</Link></div> : !isPro ? <div className="border-t border-line px-4 py-4"><button type="button" onClick={() => openUpgrade('ai-deep')} className="flex w-full items-center justify-between rounded-[12px] border border-pro-line bg-pro-soft px-3.5 py-3 text-left"><span className="flex items-center gap-2 text-[13px] font-semibold text-[#7a610f]"><Lock size={13} /> Unlock Tender Intelligence</span><Crown size={15} /></button></div> : (
        <div className="border-t border-line px-4 py-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-2"><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Decision brief</h3><span className="text-[10px] font-medium text-ink-3">AI decision support</span></div>
          {loading && <div className="flex items-center gap-2 rounded-[10px] bg-canvas px-3 py-3 text-[12.5px] text-ink-3"><Sparkles size={14} className="text-ai" /> Building the opportunity brief…</div>}
          {error && <div className="rounded-[10px] border border-urgent/20 bg-urgent-bg px-3 py-3 text-[12px] leading-[17px] text-urgent">{error}</div>}
          {analysis && <div className="space-y-3">
            <div className="grid gap-3 rounded-[12px] border border-ai-line bg-ai-bg px-3.5 py-3 sm:grid-cols-[1fr_auto]"><div><p className="text-[13px] font-semibold text-ink">Should you pursue this?</p><p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">{analysis.whyItMatters}</p></div><div className="flex flex-col items-start gap-1.5 sm:items-end"><DecisionBadge decision={analysis.decision} /><span className="text-[10.5px] font-semibold text-ink-3">Fit {Math.max(0, Math.min(100, Math.round(analysis.fitScore)))} / 100</span></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><BadgeCheck size={14} className="text-open" /><p className="text-[12.5px] font-semibold text-ink">Eligibility gates</p></div><List items={analysis.eligibility} /></div><div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><Zap size={14} className="text-soon" /><p className="text-[12.5px] font-semibold text-ink">Effort estimate</p></div><p className="text-[12.5px] leading-[18px] text-ink-2">{analysis.effort}</p></div></div>
            <div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><ShieldAlert size={14} className="text-urgent" /><p className="text-[12.5px] font-semibold text-ink">Risk watch</p></div><List items={analysis.risks} tone="risk" /></div>
            <div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-open" /><p className="text-[12.5px] font-semibold text-ink">Next actions</p></div><List items={analysis.nextActions} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><Users size={14} className="text-ai" /><p className="text-[12.5px] font-semibold text-ink">Buyer intelligence</p></div><List items={analysis.buyerIntelligence} /></div><div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><Target size={14} className="text-ai" /><p className="text-[12.5px] font-semibold text-ink">Related signals</p></div><List items={analysis.relatedSignals} /></div></div>
          </div>}
          {!loading && !analysis && !error && <p className="text-[12.5px] text-ink-3">Tender Intelligence will appear here.</p>}
          {!!flags.length && <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-soon-bg px-3 py-2.5 text-[11.5px] leading-[16px] text-soon"><ShieldAlert size={13} className="mt-0.5 shrink-0" /> Notice-level warning signals are shown separately so AI recommendations do not hide source facts.</div>}
        </div>
      )}
      <footer className="border-t border-line px-4 py-2.5 text-[10.5px] leading-[15px] text-ink-3">AI is decision support, not a certification. Verify eligibility, requirements, addenda and submission rules against the official tender source before acting.</footer>
    </section>
  );
}
