'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Bottom sheet — the premium pattern for confirmations, quick actions and
 * (from U2) upgrade prompts. Slides up on mobile, centered dialog on desktop.
 *
 * Focus handling: focus moves to the panel on open and returns to the trigger
 * on close; Escape dismisses. Background scroll is locked while open.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      {/* Scrim */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/45 animate-fade-in-up motion-reduce:animate-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={cn(
          'relative z-10 max-h-[86dvh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] bg-white shadow-sheet outline-none',
          'animate-fade-in-up motion-reduce:animate-none',
          'md:max-w-md md:rounded-[20px]',
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3.5">
          <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-[16.5px] font-bold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
