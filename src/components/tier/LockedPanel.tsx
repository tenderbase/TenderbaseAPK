'use client';

import { Crown } from 'lucide-react';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import type { FeatureKey } from '@/types/tier';

/**
 * Blur + lock kit (blueprint §5.12): wrap premium content in this and it
 * renders blurred behind an honest lock overlay. Tapping the overlay opens
 * the Upgrade Sheet for the feature. Never fake-loads — the lock IS the state.
 */
export function LockedPanel({
  feature,
  label,
  reason,
  children,
}: {
  feature: FeatureKey;
  /** Short lock-line, e.g. "Deep analysis is Pro". */
  label?: string;
  reason?: string;
  children: React.ReactNode;
}) {
  const { openUpgrade } = useUpgrade();

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      <div
        aria-hidden
        className="pointer-events-none select-none blur-[7px]"
        style={{ filter: 'blur(7px)' }}
      >
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/40 p-5 text-center">
        <button
          type="button"
          onClick={() => openUpgrade(feature, reason ? { why: reason } : undefined)}
          className="group flex flex-col items-center gap-2 rounded-[16px] border border-pro-line bg-white/90 px-5 py-4 shadow-card-sm backdrop-blur transition-colors hover:bg-pro-soft"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pro-soft text-[#7a610f]">
            <Crown size={19} strokeWidth={2.1} aria-hidden />
          </span>
          <span className="text-[13.5px] font-semibold text-ink">{label ?? 'Unlock with Pro'}</span>
          {reason && <span className="max-w-[240px] text-[11.5px] leading-[1.4] text-ink-2">{reason}</span>}
        </button>
      </div>
    </div>
  );
}

/** Small inline "PRO" chip for content cards that contain Pro depth. */
export function ProRibbon({ label = 'Pro' }: { label?: string }) {
  return (
    <span className="inline-flex h-[18px] items-center gap-1 rounded-md bg-pro px-1.5 text-[9.5px] font-bold uppercase tracking-wide text-[#7a610f]">
      <Crown size={9} strokeWidth={2.4} aria-hidden />
      {label}
    </span>
  );
}
