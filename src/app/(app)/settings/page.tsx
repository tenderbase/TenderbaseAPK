'use client';

import Link from 'next/link';
import { HelpCircle, ShieldCheck, ChevronRight, Bell, Building2, SlidersHorizontal } from 'lucide-react';
import { MenuButton } from '@/components/nav/MenuButton';

const faqs = [
  {
    q: 'How does TenderBase rank tenders?',
    a: 'TenderBase compares tender signals with your company profile and tender preferences. The Pro Fit Score is explainable and does not penalise an opportunity when the issuer has not disclosed a tender amount.',
  },
  {
    q: 'Why does a tender say “Value not disclosed”?',
    a: 'That is normal for many South African tenders. TenderBase shows the published amount when one exists and otherwise keeps the commercial value unknown rather than inventing an estimate.',
  },
  {
    q: 'How do I change my tender matches?',
    a: 'Open Tender preferences from your account menu and update your categories, locations and other matching criteria. Those settings feed the opportunity-ranking layer.',
  },
  {
    q: 'How do I control alerts?',
    a: 'Open Notification settings to turn in-app match, deadline and system alerts on or off. Your choices are applied immediately.',
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-canvas pb-28">
      <header className="border-b border-line bg-white px-5 pb-4 pt-2 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Help &amp; security</h1>
          </div>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-[18px] text-ink-2">
            Practical answers, account controls and the privacy information behind TenderBase.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-5 sm:px-6">
        <section id="help" className="scroll-mt-4 rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-soft text-blue">
              <HelpCircle size={18} aria-hidden />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Help centre</h2>
              <p className="mt-1 text-[12px] leading-[18px] text-ink-2">Quick answers to the questions that matter when evaluating and managing tenders.</p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-line rounded-[13px] border border-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-[13.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{faq.q}</span>
                  <ChevronRight size={16} className="shrink-0 text-ink-3 transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <p className="mt-2 pr-6 text-[12px] leading-[18px] text-ink-2">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="text-[16px] font-semibold text-ink">Account shortcuts</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <SettingLink href="/profile" icon={Building2} label="Profile" sub="Account details" />
            <SettingLink href="/profile/preferences" icon={SlidersHorizontal} label="Tender preferences" sub="Matching criteria" />
            <SettingLink href="/profile/notifications" icon={Bell} label="Notifications" sub="Alert controls" />
          </div>
        </section>

        <section id="privacy" className="scroll-mt-4 rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-open-bg text-open">
              <ShieldCheck size={18} aria-hidden />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Privacy &amp; security</h2>
              <p className="mt-1 text-[12px] leading-[18px] text-ink-2">TenderBase should only use account information for the features you have enabled.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <InfoRow title="Tender analysis" text="Tender facts and document evidence are kept separate from inferred analysis. Unknown information is not presented as verified." />
            <InfoRow title="Commercial values" text="Published tender values are shown when available. An undisclosed value is never fabricated or silently substituted with a user estimate." />
            <InfoRow title="Account controls" text="Use your profile and notification settings to control matching and alert behaviour. Sign out is available from the account menu." />
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingLink({ href, icon: Icon, label, sub }: { href: string; icon: typeof Building2; label: string; sub: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line px-3 py-3 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-ink-2"><Icon size={16} aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-ink">{label}</span><span className="mt-0.5 block truncate text-[11px] text-ink-3">{sub}</span></span>
      <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
    </Link>
  );
}

function InfoRow({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[12px] bg-canvas px-3.5 py-3"><p className="text-[12.5px] font-semibold text-ink">{title}</p><p className="mt-1 text-[11.5px] leading-[17px] text-ink-2">{text}</p></div>;
}
