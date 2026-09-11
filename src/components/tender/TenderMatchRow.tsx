'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, Crown, FileText, Lock, SlidersHorizontal, Sparkles, WalletCards } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReasonChip } from '@/components/tender/MatchCard';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { useMatchContext } from '@/lib/use-match-context';
import { matchReadiness, scoreTender } from '@/lib/matches';
import { getCommercialAnalysis } from '@/lib/opportunities/score';
import type { TenderWithUserState } from '@/types/tender';

/**
 * Tender-detail Pro Analyst foundation.
 *
 * Phase 1 deliberately separates:
 * - Fit Score: company/tender fit signals only.
 * - Commercial Intelligence: value/document state only.
 *
 * eTenders commonly does not disclose tender amounts as a standard field, so
 * null value is a normal state and never reduces the Fit Score. Document-level
 * commercial analysis arrives in the deeper AI/document-intelligence phase.
 */
export function TenderMatchRow({ tender }: { tender: TenderWithUserState }) {
  const { session } = useSavedTenders();
  const { can } = useTier();
  const { openUpgrade } = useUpgrade();
  const [open, setOpen] = useState(false);

  const signedIn = session.signedIn;
  const ctx = useMatchContext(signedIn);
  const loaded = !ctx.loading;

  const scored = useMemo(() => {
    if (!signedIn || !loaded) return null;
    return scoreTender(tender, { profile: ctx.profile, preferences: ctx.preferences });
  }, [signedIn, loaded, ctx.profile, ctx.preferences, tender]);

  const commercial = useMemo(() => getCommercialAnalysis(tender), [tender]);

  if (!signedIn) return null;

  if (!loaded) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-white p-3.5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
      </div>
    );
  }

  const showReasons = can('matches-reasons');
  const companyName = ctx.profile?.tradingName?.trim() || ctx.profile?.legalName?.trim() || 'your business';

  if (!scored || scored.reasons.length === 0) {
    const readiness = matchReadiness({ profile: ctx.profile, preferences: ctx.preferences });
    const links: { href: string; text: string }[] = [];
    if (readiness.missing.includes('profile')) links.push({ href: '/profile/company', text: 'add your company location' });
    if (readiness.missing.includes('preferences')) links.push({ href: '/profile/preferences', text: 'pick your categories & provinces' });
    return (
      <div className="mt-4 rounded-lg border border-line bg-white px-3.5 py-3">
        <p className="flex items-start gap-2 text-[13px] leading-[19px] text-ink-2">
          <SlidersHorizontal size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
          <span>{links.length > 0 ? <>No match score yet — {links.map((l, i) => <span key={l.href}>{i > 0 && ' or '}<Link href={l.href} className="font-semibold text-blue underline-offset-2 hover:underline">{l.text}</Link></span>)}, and this tender will be scored for your business.</> : <>No match signals for this tender — it sits outside your categories, provinces and issuer watch. <Link href="/profile/preferences" className="font-semibold text-blue underline-offset-2 hover:underline">Tune preferences</Link></>}</span>
        </p>
      </div>
    );
  }

  const { score, reasons } = scored;

  return (
    <section aria-label={`${score}% match for this tender`} className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <ScoreRing score={score} size={40} strokeWidth={3.5} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-bold tracking-[-0.02em] text-ink">{score}% match <Sparkles size={14} strokeWidth={2.1} className="text-ai" aria-hidden /></span>
          <span className="mt-0.5 block truncate text-caption text-ink-2">for {companyName} · {reasons.length} {reasons.length === 1 ? 'reason' : 'reasons'}</span>
        </span>
        <ChevronDown size={17} strokeWidth={2.1} className={cn('shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>

      <div className="border-t border-line px-3.5 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[11px] bg-canvas px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[.08em] text-ink-3">Analyst view</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{score >= 80 ? 'Strong fit' : score >= 50 ? 'Worth qualifying' : 'Review carefully'}</p>
            <p className="mt-0.5 text-[10.5px] text-ink-3">Fit score is independent of tender value.</p>
          </div>
          <div className="rounded-[11px] bg-canvas px-3 py-2.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.08em] text-ink-3"><WalletCards size={11} /> Commercial intelligence</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{commercial.valueStatus === 'published' ? 'Value published' : 'Value not disclosed'}</p>
            <p className="mt-0.5 text-[10.5px] text-ink-3">No penalty. Analyse the pack for commercial signals.</p>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-3.5 py-3">
          {showReasons ? <><p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">Matched on</p><div className="flex flex-wrap gap-1.5">{reasons.map((r) => <ReasonChip key={`${r.kind}:${r.label}`} reason={r} />)}</div></> : <button type="button" onClick={() => openUpgrade('matches-reasons', { why: 'See exactly why this tender scored for your business — category, province and more.' })} className="flex items-center gap-1.5 text-caption font-semibold text-[#7a610f]"><Lock size={12} strokeWidth={2.2} aria-hidden />Why this match?<Crown size={12} strokeWidth={2.2} /></button>}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-[10px] border border-line px-3 py-2.5"><FileText size={14} className="mt-0.5 shrink-0 text-ink-3" /><div><p className="text-[11.5px] font-semibold text-ink">Document readiness</p><p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">{tender.documents.length ? `${tender.documents.length} document${tender.documents.length === 1 ? '' : 's'} available for deeper analysis.` : 'No tender documents attached yet.'}</p></div></div>
            <div className="flex items-start gap-2 rounded-[10px] border border-warning/20 bg-warning/5 px-3 py-2.5"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" /><div><p className="text-[11.5px] font-semibold text-ink">Qualification watch</p><p className="mt-0.5 text-[10.5px] leading-4 text-ink-2">CIDB, B-BBEE, tax and mandatory submission requirements need document verification.</p></div></div>
          </div>
        </div>
      )}
    </section>
  );
}
