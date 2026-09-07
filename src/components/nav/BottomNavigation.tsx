'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, Bell, User } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

/**
 * Persistent tab bar on mobile. On desktop (md+) it becomes a left sidebar —
 * same routes, same icons, one coherent system.
 */
export function BottomNavigation({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white px-1.5 pt-2.5 shadow-nav',
        'pb-[env(safe-area-inset-bottom)]',
        'md:inset-y-0 md:right-auto md:left-0 md:w-60 md:flex-col md:gap-1 md:border-r md:border-t-0 md:p-4 md:shadow-none',
      )}
    >
      <span className="hidden px-3 pb-6 text-[19px] font-bold tracking-[-0.04em] text-navy md:block">
        Tender<span className="font-medium text-ink-2">Base</span>
      </span>

      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1.5 pb-2',
              'md:w-full md:flex-none md:flex-row md:gap-3 md:rounded-md md:px-3 md:py-2.5',
              active ? 'text-navy md:bg-blue-soft' : 'text-ink-3 md:hover:bg-canvas',
            )}
          >
            <span className="relative">
              <Icon size={23} strokeWidth={active ? 2 : 1.7} aria-hidden />
              {label === 'Alerts' && alertCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-lg border-2 border-white bg-urgent px-1 text-[9.5px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </span>
            <span className={cn('text-[10.5px] md:text-body', active && 'font-semibold')}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
