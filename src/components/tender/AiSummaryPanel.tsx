'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, Clock3, FileText, Lock, MessageSquareText, Send, Sparkles, ShieldAlert, Crown } from 'lucide-react';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { quickSummaryBullets, noticeRiskFlags, type NoticeBulletIcon } from '@/lib/notice-analysis';
import type { TenderWithUserState } from '@/types/tender';

const ICONS: Record<NoticeBulletIcon, typeof Clock3> = {
  clock: Clock3,
  calendar: Clock3,
  pin: Clock3,
  file: FileText,
  tag: Clock3,
  mail: Clock3,
};

type AiAnalysis = {
  executiveSummary: string;
  requirements: string[];
  eligibility: string[];
  risks: string[];
  recommendation: string;
  questions: string[];
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function tenderPayload(tender: TenderWithUserState) {
  return {
    id: tender.id,
    tenderNumber: tender.tenderNumber,
    title: tender.title,
    description: tender.description,
    organisation: tender.organisation,
    category: tender.category,
    categoryRaw: tender.categoryRaw,
    province: tender.province,
    location: tender.location,
    locationFull: tender.locationFull,
    valueCents: tender.valueCents,
    publishedDate: tender.publishedDate,
    closingDate: tender.closingDate,
    sourceUrl: tender.sourceUrl,
    cidbGrade: tender.cidbGrade,
    contactInformation: tender.contactInformation,
    documents: tender.documents.map((d) => ({
      name: d.name,
      fileType: d.fileType,
      sizeBytes: d.sizeBytes,
      isAddendum: d.isAddendum,
    })),
  };
}

function List({ items, tone = 'normal' }: { items: string[]; tone?: 'normal' | 'risk' }) {
  if (!items.length) return <p className="text-[12.5px] text-ink-3">No additional signals identified.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-[12.5px] leading-[18px] text-ink-2">
          <span className={tone === 'risk' ? 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-urgent' : 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ai'} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AiSummaryPanel({ tender, amendments }: { tender: TenderWithUserState; amendments: unknown[] }) {
  const { session } = useSavedTenders();
  const { tier, can } = useTier();
  const { openUpgrade } = useUpgrade();
  const isPro = tier === 'pro';
  const signedIn = session.signedIn;
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);

  const bullets = useMemo(() => quickSummaryBullets(tender), [tender]);
  const flags = useMemo(() => noticeRiskFlags(tender, amendments.length), [tender, amendments.length]);

  useEffect(() => {
    if (!signedIn || !isPro) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch('/api/ai/tender', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'analysis', tender: tenderPayload(tender) }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'AI analysis failed.');
        return data;
      })
      .then((data) => {
        if (!cancelled) setAnalysis(data.analysis as AiAnalysis);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'AI analysis failed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isPro, signedIn, tender]);

  const askFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setQuestion('');
    setAsking(true);
    setError('');
    const nextChat = [...chat, { role: 'user' as const, content: q }];
    setChat(nextChat);
    try {
      const response = await fetch('/api/ai/tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'followup', tender: tenderPayload(tender), question: q, history: nextChat }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'AI follow-up failed.');
      setChat([...nextChat, { role: 'assistant', content: data.answer || 'I could not produce an answer.' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI follow-up failed.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <section aria-label="AI summary" className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-ai-bg text-ai"><Sparkles size={16} /></span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">TenderBase AI</h2>
            <p className="mt-0.5 text-[11.5px] leading-[16px] text-ink-3">Powered by Gemini — grounded in this tender&apos;s published data.</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-pro-line bg-pro-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7a610f]"><Crown size={10} /> Pro AI</span>
      </header>

      <div className="border-t border-line px-4 py-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Quick summary</h3>
          <span className="rounded-[5px] bg-canvas px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-2">notice facts</span>
        </div>
        <ul className="space-y-2">
          {bullets.map((b) => {
            const Icon = ICONS[b.icon];
            return <li key={b.text} className="flex items-start gap-2.5"><span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-canvas text-ink-2"><Icon size={12.5} /></span><span className="text-[13px] leading-[18px] text-ink">{b.text}</span></li>;
          })}
        </ul>
      </div>

      {!signedIn ? (
        <div className="border-t border-line px-4 py-4">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">Sign in to use TenderBase AI</Link>
        </div>
      ) : !isPro ? (
        <div className="border-t border-line px-4 py-4">
          <button type="button" onClick={() => openUpgrade('ai-deep')} className="flex w-full items-center justify-between rounded-[12px] border border-pro-line bg-pro-soft px-3.5 py-3 text-left">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#7a610f]"><Lock size={13} /> Unlock live Gemini analysis</span><Crown size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="border-t border-line px-4 py-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2"><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">AI decision brief</h3><span className="text-[10px] font-medium text-ink-3">Gemini 3.8 Flash</span></div>
            {loading && <div className="rounded-[10px] bg-canvas px-3 py-3 text-[12.5px] text-ink-3">Analysing this opportunity…</div>}
            {error && <div className="rounded-[10px] border border-urgent/20 bg-urgent-bg px-3 py-3 text-[12px] leading-[17px] text-urgent">{error}</div>}
            {analysis && (
              <div className="space-y-3">
                <div className="rounded-[12px] border border-ai-line bg-ai-bg px-3.5 py-3"><p className="text-[13px] font-semibold text-ink">Bottom line</p><p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">{analysis.executiveSummary}</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><FileText size={14} className="text-ai" /><p className="text-[12.5px] font-semibold text-ink">Requirements</p></div><List items={analysis.requirements} /></div>
                  <div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><BadgeCheck size={14} className="text-open" /><p className="text-[12.5px] font-semibold text-ink">Eligibility</p></div><List items={analysis.eligibility} /></div>
                </div>
                <div className="rounded-[10px] border border-line p-3"><div className="mb-2 flex items-center gap-2"><ShieldAlert size={14} className="text-urgent" /><p className="text-[12.5px] font-semibold text-ink">Risks to check</p></div><List items={analysis.risks} tone="risk" /></div>
                <div className="rounded-[10px] border border-line p-3"><p className="text-[12.5px] font-semibold text-ink">Recommendation</p><p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">{analysis.recommendation}</p></div>
                {!!analysis.questions?.length && <div className="rounded-[10px] border border-line p-3"><p className="mb-2 text-[12.5px] font-semibold text-ink">Questions to resolve</p><List items={analysis.questions} /></div>}
              </div>
            )}
            {!loading && !analysis && !error && <p className="text-[12.5px] text-ink-3">Live analysis will appear here.</p>}
            {!!flags.length && <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-soon-bg px-3 py-2.5 text-[11.5px] leading-[16px] text-soon"><ShieldAlert size={13} className="mt-0.5 shrink-0" /> Notice-level warning signals are also shown below for transparency.</div>}
          </div>

          <div className="border-t border-line px-4 py-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2"><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Ask TenderBase AI</h3><span className="text-[10px] text-ink-3">Grounded to this tender</span></div>
            {chat.length > 0 && <div className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-[10px] bg-canvas p-2.5">{chat.map((m, i) => <div key={i} className={m.role === 'user' ? 'ml-5 rounded-[9px] bg-navy px-3 py-2 text-[12px] leading-[17px] text-white' : 'mr-5 rounded-[9px] bg-white px-3 py-2 text-[12px] leading-[17px] text-ink-2 shadow-sm'}>{m.content}</div>)}</div>}
            <form onSubmit={askFollowup} className="flex items-end gap-2 rounded-[12px] border border-line bg-canvas p-2">
              <MessageSquareText size={16} className="mb-2 ml-1 shrink-0 text-ai" />
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What could disqualify us?" rows={2} className="min-h-[42px] flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-ink outline-none placeholder:text-ink-3" disabled={asking} />
              <button type="submit" disabled={!question.trim() || asking} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-navy text-white disabled:opacity-40" aria-label="Ask AI"><Send size={15} /></button>
            </form>
            {asking && <p className="mt-1.5 text-[10.5px] text-ink-3">Gemini is thinking…</p>}
          </div>
        </>
      )}

      <footer className="border-t border-line px-4 py-2.5 text-[10.5px] leading-[15px] text-ink-3">
        AI can make mistakes. Treat generated recommendations as decision support and verify against the official tender documents before submitting.
      </footer>
    </section>
  );
}
