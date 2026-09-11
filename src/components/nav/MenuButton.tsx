'use client';

import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDrawer } from '@/components/nav/DrawerProvider';

/** Shared mobile menu control. The same control toggles open/closed state. */
export function MenuButton({ className }: { className?: string }) {
  const { toggle, isOpen } = useDrawer();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={cn(
        'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink',
        'transition-colors hover:bg-line active:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40',
        className,
      )}
    >
      {isOpen ? <X size={21} strokeWidth={2} aria-hidden /> : <Menu size={21} strokeWidth={1.9} aria-hidden />}
    </button>
  );
}
