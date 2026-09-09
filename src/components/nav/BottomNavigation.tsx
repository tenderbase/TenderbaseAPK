'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, Bell, Newspaper, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSavedTenders } from '@/lib/saved-store';

// Blueprint §4 IA: Today · Discover · Saved · News · Alerts. Profile lives
// in the drawer (mobile) and in the pinned desktop row below — not a tab.
const ITEMS = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/alerts', label: 'Alerts', icon: Bell },
] as const;

/**
 * Persistent tab bar on mobile. On desktop (md+) it becomes a left sidebar —
 * same routes, same icons, one coherent system.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const { saved, session } = useSavedTenders();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  // U1: an unread-alerts engine doesn't exist yet, so no fake badge. Saved
  // count is real and lives on the Saved tab icon — a genuinely useful badge.
  const savedCount = saved.length;

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
              {label === 'Saved' && savedCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-lg border-2 border-white bg-navy px-1 text-[9.5px] font-bold text-white">
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
            </span>
            <span className={cn('text-[10.5px] md:text-body', active && 'font-semibold')}>{label}</span>
          </Link>
        );
      })}

      {/* Desktop-only account row — mobile reaches Profile via the drawer. */}
      <Link
        href={session.signedIn ? '/profile' : '/login'}
        className="mt-auto hidden items-center gap-3 rounded-md border-t border-line px-3 pb-1 pt-4 md:flex"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[12.5px] font-bold text-white">
          {session.signedIn ? (session.initials ?? 'U') : <User size={16} strokeWidth={2} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {session.signedIn ? (session.name ?? 'Profile') : 'Sign in free'}
          </span>
          <span className="block truncate text-[11px] text-ink-3">
            {session.signedIn ? 'View profile' : 'Save tenders & get matched'}
          </span>
        </span>
      </Link>
    </nav>
  );
}
