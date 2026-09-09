'use client';

import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Check } from 'lucide-react';
import { useTier } from '@/lib/tier-store';
import { TIER_META, type Tier } from '@/types/tier';
import { cn } from '@/lib/cn';

const ORDER: Tier[] = ['free', 'basic', 'pro'];

/**
 * Dev-only tier preview switcher (blueprint: "stubbed Basic/Pro toggle in dev
 * for previewing both"). Hard-gated on NODE_ENV !== 'production' the same way
 * the auth bypass is — it never ships in a production build, because the
 * bundler replaces NODE_ENV at build time.
 */
export function TierPreview() {
  const { tier, setTier, trial, startTrial } = useTier();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside tap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div ref={ref} className="fixed bottom-[84px] right-4 z-[60] md:bottom-5">
      {open && (
        <div className="mb-2 w-56 overflow-hidden rounded-[14px] border border-line bg-white shadow-card animate-fade-in-up motion-reduce:animate-none">
          <div className="border-b border-line bg-canvas px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-2">
              <FlaskConical size={12} strokeWidth={2.2} className="text-blue" aria-hidden />
              Tier preview (dev)
            </p>
          </div>
          {ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTier(t);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2.5 text-left text-[13.5px]',
                t === tier ? 'bg-blue-soft font-semibold text-navy' : 'text-ink hover:bg-canvas',
              )}
            >
              <span>
                {TIER_META[t].label}
                {t === 'pro' && trial.active && (
                  <span className="ml-1.5 text-[11px] font-semibold text-soon">trial</span>
                )}
              </span>
              {t === tier && <Check size={15} strokeWidth={2.4} aria-hidden />}
            </button>
          ))}
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                startTrial();
                setOpen(false);
              }}
              className="w-full rounded-md bg-pro px-2 py-1.5 text-[12.5px] font-bold text-[#3d3205]"
            >
              Start 14-day trial
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-blue bg-white px-3 text-[12px] font-bold text-blue shadow-card-sm"
      >
        <FlaskConical size={13} strokeWidth={2.2} aria-hidden />
        {tier === 'pro' ? 'PRO' : TIER_META[tier].label}
        {tier === 'pro' && trial.active ? ` · ${trial.daysLeft}d` : ''}
      </button>
    </div>
  );
}
