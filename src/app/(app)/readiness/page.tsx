import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Tender Readiness · TenderBase' };

const CONTROLS = [
  { title: 'CSD supplier profile', text: 'Keep your registration status and business details current.', href: '/profile/company' },
  { title: 'Tax Compliance Status', text: 'Track the status date and remember to verify current TCS before submission.', href: '/profile/company' },
  { title: 'B-BBEE evidence', text: 'Record your current level/evidence date and compare tender-specific preference requirements.', href: '/profile/company' },
  { title: 'CIDB registration', text: 'For construction businesses, compare grade/classes against tender requirements.', href: '/profile/company' },
  { title: 'Sector registrations', text: 'Track licences, registrations and renewal dates relevant to your work.', href: '/profile/company' },
  { title: 'Business information', text: 'Keep company, contact and operating-area information consistent.', href: '/profile/company' },
];

export default function ReadinessPage() {
  return (
    <main className="tb-page pb-24">
      <header className="tb-content pt-6 sm:pt-8">
        <p className="tb-eyebrow">Before the opportunity</p>
        <h1 className="mt-1.5 text-h1 font-semibold text-navy">Tender readiness</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-ink-2">Know what could block a bid before you invest time in it. TenderBase stores readiness status and dates rather than requiring a sensitive document vault.</p>
      </header>

      <section className="tb-content mt-6 grid gap-3 sm:grid-cols-3">
        <Summary icon={<ShieldCheck size={18}/>} title="Can we bid?" text="Eligibility and readiness" />
        <Summary icon={<ClipboardCheck size={18}/>} title="What is missing?" text="Open readiness actions" />
        <Summary icon={<RefreshCw size={18}/>} title="What needs refresh?" text="Time-sensitive checks" />
      </section>

      <section className="tb-content mt-8">
        <div className="tb-card overflow-hidden">
          <div className="border-b border-line bg-canvas px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-navy"><Building2 size={16}/></span><div><h2 className="text-[14px] font-semibold text-ink">Business readiness controls</h2><p className="mt-0.5 text-[11px] text-ink-3">Complete the structured profile first. Tender-specific checks appear on each opportunity.</p></div></div></div>
          <div className="divide-y divide-line">
            {CONTROLS.map((item) => <Link key={item.title} href={item.href} className="flex items-center gap-3 px-5 py-4 hover:bg-canvas"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-3"><FileCheck2 size={15}/></span><span className="min-w-0 flex-1"><b className="block text-[12.5px] text-ink">{item.title}</b><small className="mt-0.5 block text-[11px] leading-5 text-ink-3">{item.text}</small></span><ChevronRight size={16} className="shrink-0 text-ink-3"/></Link>)}
          </div>
        </div>
      </section>

      <section className="tb-content mt-6 rounded-[14px] border border-line bg-canvas p-4">
        <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-navy"/><div><h2 className="text-[13px] font-semibold text-ink">How TenderBase handles compliance</h2><p className="mt-1 text-[11.5px] leading-5 text-ink-2">The official tender and issuing authority remain the source of truth. TenderBase can flag missing or stale readiness information, but it does not certify compliance or replace verification.</p><Link href="/search" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy">Find opportunities <ArrowRight size={13}/></Link></div></div>
      </section>
    </main>
  );
}

function Summary({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="tb-card p-4"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-canvas text-navy">{icon}</span><h2 className="mt-3 text-[13px] font-semibold text-ink">{title}</h2><p className="mt-1 text-[11px] text-ink-3">{text}</p></div>; }
