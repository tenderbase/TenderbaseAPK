'use client';

import { Menu } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDrawer } from '@/components/nav/DrawerProvider';

/**
 * Opens the navigation drawer. Sized to the 38px header control rhythm used
 * by the other icon buttons, with a 44px tap target via padding.
 */
export function MenuButton({ className }: { className?: string }) {
  const { open, isOpen } = useDrawer();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={cn(
        'flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink',
        'active:bg-line',
        className,
      )}
    >
      <Menu size={21} strokeWidth={1.9} aria-hidden />
    </button>
  );
}
