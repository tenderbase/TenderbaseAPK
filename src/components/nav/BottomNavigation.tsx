'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, KanbanSquare, MoreHorizontal, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSavedTenders } from '@/lib/saved-store';
import { useDrawer } from '@/components/nav/DrawerProvider';
import { useAlerts } from '@/lib/alerts-store';

const ITEMS = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/saved', label: 'Saved', icon: Bookmark },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const { toggle, isOpen } = useDrawer();
  const { saved, session } = useSavedTenders();
  const { unread: unreadAlerts } = useAlerts();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/90 bg-white/95 px-2 pt-1.5 shadow-nav backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:left-0 md:w-[248px] md:border-r md:border-t-0 md:bg-white md:px-3 md:py-5 md:shadow-none md:backdrop-blur-0"
    >
      <div className="hidden px-3 pb-8 md:block">
        <div className="text-[20px] font-semibold tracking-[-0.04em] text-navy">Tender<span className="font-normal text-ink-2">Base</span></div>
        <div className="mt-1 text-[11px] font-medium tracking-[0.08em] text-ink-3">TENDER CRM</div>
      </div>

      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 md:max-w-none md:flex-col md:gap-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const count = label === 'Saved' ? saved.length : null;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-[10px] font-medium transition-all duration-200 active:scale-[.97]',
                'md:min-h-12 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:text-body',
                active ? 'bg-blue-soft text-navy' : 'text-ink-3 hover:bg-canvas hover:text-ink',
              )}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {count !== null && count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[9px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className={cn(active && 'font-semibold')}>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={toggle}
          aria-label={isOpen ? 'Close menu' : 'Open more menu'}
          aria-expanded={isOpen}
          className={cn(
            'relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-[10px] font-medium text-ink-3 transition-all duration-200 active:scale-[.97] hover:bg-canvas hover:text-ink',
            'md:min-h-12 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:text-body',
            isOpen && 'bg-blue-soft text-navy',
          )}
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            {isOpen ? <X size={21} strokeWidth={2} aria-hidden /> : <MoreHorizontal size={21} strokeWidth={1.8} aria-hidden />}
            {!isOpen && unreadAlerts > 0 && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-urgent" aria-hidden />}
          </span>
          <span>{isOpen ? 'Close' : 'More'}</span>
        </button>
      </div>

      <Link href={session.signedIn ? '/profile' : '/login'} className="mt-auto hidden items-center gap-3 rounded-lg border-t border-line px-3 pb-1 pt-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">
          {session.signedIn ? (session.initials ?? 'U') : <User size={16} strokeWidth={2} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{session.signedIn ? (session.name ?? 'Profile') : 'Sign in'}</span>
          <span className="block truncate text-[11px] text-ink-3">{session.signedIn ? 'Account & company' : 'Save tenders & get matched'}</span>
        </span>
      </Link>
    </nav>
  );
}
