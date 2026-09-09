'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, Clock, Crown, Eye, FileText,
  HelpCircle, Lock, Mail, MapPin, MessageSquareText, ShieldAlert, Sparkles,
  Tag, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Meter } from '@/components/ui/Meter';
import { LockedPanel } from '@/components/tier/LockedPanel';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import {
  noticeRiskFlags,
  quickSummaryBullets,
  starterQuestions,
  type NoticeBulletIcon,
} from '@/lib/notice-analysis';
import type { Amendment } from '@/app/tenders/[id]/TenderDetailView';
import type { TenderWithUserState } from '@/types/tender';

const BULLET_ICONS: Record<NoticeBulletIcon, typeof Clock> = {
  clock: Clock,
  calendar: CalendarDays,
  pin: MapPin,
  file: FileText,
  tag: Tag,
  mail: Mail,
};

/** Muted tag for rows the real engine adds once it lands. */
function AiReleaseChip({ label = 'AI release' }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[5px] border border-line bg-canvas px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
      {label}
    </span>
  );
}

function Eyebrow({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">{children}</h3>
      {right}
    </div>
  );
}

function NoticeChip() {
  return (
    <span className="rounded-[5px] bg-canvas px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-2">
      from the notice
    </span>
  );
}

const FLAG_TONE = {
  red: 'bg-urgent-bg text-urgent',
  amber: 'bg-soon-bg text-soon',
  none: 'bg-open-bg text-open',
} as const;

/**
 * The AI Summary panel (blueprint §5.5.4) — THE tender-detail module.
 *
 * Honesty contract: the AI engine wires in a later phase, so nothing here is
 * invented. The quick summary is built from real notice fields; risk and
 * eligibility rows are true statements from the notice data; whatever the
 * engine will add later is shown as a muted, labelled "AI release" row.
 * Guests get the same real facts inside a watermarked sample frame
 * ("Sample — sign in free for your own summaries"); Basic gets the locked
 * deep panel plus the 1 free demo the entitlement model grants; Pro sees the
 * full layout inline. There is no fake loading and no fabricated analysis.
 */
export function AiSummaryPanel({
  tender,
  amendments,
}: {
  tender: TenderWithUserState;
  amendments: Amendment[];
}) {
  const { session } = useSavedTenders();
  const { tier, can, limit } = useTier();
  const { openUpgrade } = useUpgrade();
  const [demoOpen, setDemoOpen] = useState(false);

  const signedIn = session.signedIn;
  const isPro = tier === 'pro';
  const quickMax = limit('ai-quick') ?? 10;

  const bullets = useMemo(() => quickSummaryBullets(tender), [tender]);
  const flags = useMemo(
    () => noticeRiskFlags(tender, amendments.length),
    [tender, amendments.length],
  );

  return (
    <section aria-label="AI summary" className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
      {/* Panel head */}
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-ai-bg text-ai">
            <Sparkles size={16} strokeWidth={2.1} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">AI Summary</h2>
            <p className="mt-0.5 text-[11.5px] leading-[16px] text-ink-3">
              Facts from this published notice — document-level depth arrives with the AI release.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-ai-line bg-ai-bg px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ai">
          Preview
        </span>
      </header>

      {/* Quick summary — real notice facts, every line verifiable */}
      <div className="border-t border-line px-4 py-3.5">
        <Eyebrow right={<NoticeChip />}>Quick summary</Eyebrow>
        <ul className="space-y-2">
          {bullets.map((b) => {
            const Icon = BULLET_ICONS[b.icon];
            return (
              <li key={b.text} className="flex items-start gap-2.5">
                <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-canvas text-ink-2">
                  <Icon size={12.5} strokeWidth={2} aria-hidden />
                </span>
                <span className="text-[13px] leading-[18px] text-ink">{b.text}</span>
              </li>
            );
          })}
        </ul>

        {signedIn && !isPro && (
          <div className="mt-3.5">
            <Meter used={0} max={quickMax} label="AI quick summaries this month" />
            <p className="mt-1 text-[10.5px] leading-[14px] text-ink-3">
              Usage counts only once the AI release is live — Basic includes {quickMax} a month.
            </p>
          </div>
        )}

        {!signedIn && (
          <Link
            href="/login"
            className="mt-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-ai"
          >
            Sign in free for summaries on every tender
            <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
          </Link>
        )}
      </div>

      {/* Deep analysis */}
      <div className="border-t border-line px-4 pb-4 pt-3.5">
        <Eyebrow
          right={
            isPro ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-pro-line bg-pro-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7a610f]">
                <Crown size={10} strokeWidth={2.4} aria-hidden /> Pro
              </span>
            ) : !signedIn ? (
              <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                Sample
              </span>
            ) : undefined
          }
        >
          Deep analysis
        </Eyebrow>

        {isPro ? (
          <DeepAnalysisBody tender={tender} flags={flags} />
        ) : signedIn ? (
          <>
            <LockedPanel
              feature="ai-deep"
              label="Deep analysis is Pro"
              reason="Requirements, eligibility flags and risk — read any tender like an expert in 20 seconds."
            >
              <DeepAnalysisBody tender={tender} flags={flags} />
            </LockedPanel>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-white py-2.5 text-[13px] font-semibold text-ink"
            >
              <Eye size={14} strokeWidth={2.1} aria-hidden />
              Try the free deep-analysis demo
              <span className="rounded-[5px] bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-ink-3">
                1 included
              </span>
            </button>
          </>
        ) : (
          /* Guests: unlocked sample frame with the blueprint watermark line. */
          <div className="overflow-hidden rounded-lg border border-ai-line">
            <div className="flex items-center gap-2 bg-ai-bg px-3 py-2">
              <span className="rounded-[5px] bg-ai px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.08em] text-white">
                Sample
              </span>
              <p className="text-[11.5px] font-medium text-ink-2">
                Sample — sign in free for your own summaries
              </p>
            </div>
            <DeepAnalysisBody tender={tender} flags={flags} className="rounded-none border-0" />
          </div>
        )}

        <p className="mt-2.5 text-[10.5px] leading-[14px] text-ink-3">
          {!signedIn
            ? 'Browsing stays free forever — only AI depth sits behind Pro.'
            : isPro
              ? 'Nothing above is invented — notice facts today, live analysis with the AI release.'
              : 'Pro unlocks deep analysis and follow-ups on every tender.'}
        </p>
      </div>

      {/* Ask a follow-up */}
      <div className="border-t border-line px-4 py-3.5">
        {can('ask-followup') ? (
          <div>
            <div className="flex items-center gap-2.5 rounded-[12px] border border-line bg-canvas px-3.5 py-3">
              <MessageSquareText size={16} strokeWidth={1.9} className="shrink-0 text-ai" aria-hidden />
              <p className="flex-1 text-[13.5px] font-medium text-ink-3">
                Ask a follow-up about this tender
              </p>
              <AiReleaseChip />
            </div>
            <p className="mt-1.5 text-[11.5px] leading-[16px] text-ink-3">
              Answers grounded in this tender&apos;s documents — the input goes live with the AI
              release.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openUpgrade('ask-followup')}
            className="flex w-full items-center justify-between rounded-[12px] border border-pro-line bg-pro-soft px-3.5 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#7a610f]">
              <Lock size={13} strokeWidth={2.2} aria-hidden />
              Ask a follow-up — grounded answers
            </span>
            <Crown size={15} strokeWidth={2.2} className="shrink-0 text-[#7a610f]" aria-hidden />
          </button>
        )}
      </div>

      {/* Basic's free demo sheet — same layout, clearly labelled sample */}
      <BottomSheet open={demoOpen} onClose={() => setDemoOpen(false)} title="Deep analysis — your free demo">
        <div className="flex items-center gap-2">
          <span className="rounded-[5px] bg-ai px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.08em] text-white">
            Sample
          </span>
          <p className="text-[12px] font-medium text-ink-3">
            The full format — real notice facts shown exactly where live depth will land.
          </p>
        </div>
        <div className="mt-3">
          <DeepAnalysisBody tender={tender} flags={flags} />
        </div>
        <p className="mt-3 text-[11.5px] leading-[16px] text-ink-3">
          This is the one deep-analysis demo included with Basic. Per-tender analysis is generated
          from the documents once the AI release lands.
        </p>
        <button
          type="button"
          onClick={() => setDemoOpen(false)}
          className="mt-4 flex h-[50px] w-full items-center justify-center rounded-md bg-navy text-[15px] font-semibold text-white"
        >
          Got it
        </button>
      </BottomSheet>
    </section>
  );
}

/** The five deep-analysis sections. Content is true; future rows are tagged. */
function DeepAnalysisBody({
  tender,
  flags,
  className,
}: {
  tender: TenderWithUserState;
  flags: ReturnType<typeof noticeRiskFlags>;
  className?: string;
}) {
  const docNames = tender.documents.slice(0, 2).map((d) => d.name);
  const docLine =
    tender.documents.length === 0
      ? 'Nothing published yet — check back for the pack.'
      : `Documented in the pack — ${tender.documents.length} file${
          tender.documents.length === 1 ? '' : 's'
        }${docNames.length ? ` (${docNames.join(', ')}${tender.documents.length > 2 ? '…' : ''})` : ''}.`;

  const cidb = tender.cidbGrade?.trim();
  const issuerMail = tender.contactInformation?.email;

  return (
    <div className={cn('divide-y divide-line overflow-hidden rounded-lg border border-line bg-white', className)}>
      {/* Key requirements */}
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-ai-bg text-ai">
          <FileText size={14} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-ink">Key requirements</p>
          <p className="text-[12.5px] leading-[18px] text-ink-2">{docLine}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] leading-[17px] text-ink-3">
            <span>Distilled bullet-by-bullet: scope, deliverables, submission format.</span>
            <AiReleaseChip />
          </p>
        </div>
      </div>

      {/* Eligibility */}
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-ai-bg text-ai">
          <BadgeCheck size={14} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-ink">Eligibility</p>
          {cidb ? (
            <p className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-[6px] bg-open-bg px-2 py-0.5 text-[11.5px] font-semibold text-open">
                <Check size={11} strokeWidth={2.6} aria-hidden /> CIDB grading stated: {cidb}
              </span>
            </p>
          ) : (
            <p className="text-[12.5px] leading-[18px] text-ink-2">
              No CIDB grade published on this notice.
            </p>
          )}
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] leading-[17px] text-ink-3">
            <span>CIDB · B-BBEE · tax-clearance checks read from the pack.</span>
            <AiReleaseChip />
          </p>
        </div>
      </div>

      {/* Risk flags */}
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-ai-bg text-ai">
          <ShieldAlert size={14} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-ink">Risk flags</p>
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <span
                key={f.text}
                className={cn(
                  'inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold',
                  FLAG_TONE[f.severity],
                )}
              >
                {f.text}
              </span>
            ))}
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] leading-[17px] text-ink-3">
            <span>Document-level checks: scope gaps, vague wording, addenda history.</span>
            <AiReleaseChip />
          </p>
        </div>
      </div>

      {/* Suggested questions */}
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-ai-bg text-ai">
          <HelpCircle size={14} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-ink">Suggested questions for the issuer</p>
          <ul className="space-y-1">
            {starterQuestions().map((q) => (
              <li key={q} className="flex items-start gap-2 text-[12.5px] leading-[17px] text-ink-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
                {q}
              </li>
            ))}
          </ul>
          {issuerMail && (
            <a
              href={`mailto:${issuerMail}?subject=${encodeURIComponent(
                `Question about ${tender.tenderNumber}`,
              )}`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue"
            >
              <Mail size={13} strokeWidth={2} aria-hidden />
              Ask the issuer
            </a>
          )}
        </div>
      </div>

      {/* Value context */}
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-ai-bg text-ai">
          <TrendingUp size={14} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-ink">Value context</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] leading-[17px] text-ink-3">
            <span>Similar-award benchmarking for this category and province.</span>
            <AiReleaseChip />
          </p>
        </div>
      </div>
    </div>
  );
}
