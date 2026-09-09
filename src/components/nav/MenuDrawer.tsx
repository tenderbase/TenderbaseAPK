'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X, Home, Search, Bookmark, Bell, Newspaper, User, Sparkles, Building2,
  SlidersHorizontal, Crown, HelpCircle, ShieldCheck, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDrawer } from '@/components/nav/DrawerProvider';
import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { PlanChip } from '@/components/ui/PlanChip';

/**
 * Slide-in navigation drawer.
 *
 * Complements the tab bar rather than duplicating it: the five tabs stay the
 * primary destinations, and the drawer holds the long tail (account, settings,
 * support) that has no room in a five-slot bar.
 *
 * Every entry points at a route that exists. Items whose screens are not built
 * yet are rendered as disabled with a "Soon" chip — a dead link that looks
 * live is worse than an honest one.
 */

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  sub?: string;
  /** Route not implemented yet — shown, but not clickable. */
  soon?: boolean;
  badge?: number;
}

const PRIMARY: Item[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search tenders', icon: Search },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/alerts', label: 'Alerts', icon: Bell },
];

const INTELLIGENCE: Item[] = [
  { href: '/briefing', label: 'Weekly briefing', icon: Sparkles, sub: 'Digest of new matches' },
];

const ACCOUNT: Item[] = [
  { href: '/profile', label: 'Profile', icon: User },
  // No subtitle: the company name lives in the profile itself and would go
  // stale here the moment it is edited.
  { href: '/profile/company', label: 'Company profile', icon: Building2 },
  { href: '/profile/preferences', label: 'Tender preferences', icon: SlidersHorizontal },
  { href: '/pro', label: 'Subscription & Pro', icon: Crown },
];

const SUPPORT: Item[] = [
  { href: '/settings', label: 'Help centre', icon: HelpCircle, soon: true },
  { href: '/settings', label: 'Privacy & security', icon: ShieldCheck, soon: true },
];

export function MenuDrawer() {
  const { isOpen, close } = useDrawer();
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSavedTenders();
  const { tier, trial } = useTier();
  const { openUpgrade } = useUpgrade();
  const [signingOut, setSigningOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Close on navigation — otherwise the drawer stays open over the new screen.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock background scroll while open, and restore the exact previous value.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Focus management: move focus in on open, restore it on close.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // Wait for the panel to be painted before focusing.
      const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    previouslyFocused.current?.focus?.();
  }, [isOpen]);

  // Escape to dismiss, and trap Tab inside the panel while open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Scrim. aria-hidden because the close button already exposes dismissal. */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          'fixed inset-0 z-50 bg-navy-900/45 transition-opacity duration-200 motion-reduce:transition-none',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // inert would be ideal but isn't in the React 18 types; hiding from the
        // a11y tree while closed keeps links out of the tab order.
        aria-hidden={!isOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[302px] max-w-[86%] flex-col bg-white shadow-2xl',
          'transition-transform duration-250 ease-out motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between border-b border-line px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)]">
          <div className="min-w-0">
            <span className="block text-[19px] font-bold tracking-[-0.04em] text-navy">
              Tender<span className="font-medium text-ink-2">Base</span>
            </span>
            <span className="mt-0.5 block text-caption text-ink-3">
              South African tender intelligence
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="-mr-1.5 -mt-1 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink"
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Account card — real identity from the session, honest for guests */}
        <Link
          href={session.signedIn ? '/profile' : '/login'}
          tabIndex={isOpen ? undefined : -1}
          className="flex items-center gap-3 border-b border-line px-5 py-3.5"
        >
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-navy text-body-lg font-semibold text-white">
            {session.signedIn ? (session.initials ?? 'U') : <User size={20} strokeWidth={1.9} aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            {session.signedIn ? (
              <>
                <span className="block truncate text-[14.5px] font-semibold tracking-[-0.015em]">
                  {session.name ?? 'Your account'}
                </span>
                <span className="mt-px block truncate text-caption text-ink-3">
                  {session.email ?? 'Signed in'}
                </span>
              </>
            ) : (
              <>
                <span className="block truncate text-[14.5px] font-semibold tracking-[-0.015em]">
                  Sign in or create an account
                </span>
                <span className="mt-px block truncate text-caption text-ink-3">
                  Save tenders, manage preferences — free
                </span>
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {session.signedIn && <PlanChip tier={tier} />}
            <ChevronRight size={17} strokeWidth={2} className="text-ink-3" aria-hidden />
          </span>
        </Link>

        <nav aria-label="Drawer" className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <Section items={PRIMARY} isOpen={isOpen} isActive={isActive} />
          <Section title="Intelligence" items={INTELLIGENCE} isOpen={isOpen} isActive={isActive} />
          <Section title="Account" items={ACCOUNT} isOpen={isOpen} isActive={isActive} />
          <Section title="Support" items={SUPPORT} isOpen={isOpen} isActive={isActive} />
        </nav>

        <div className="border-t border-line px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
          {tier !== 'pro' && (
            <button
              type="button"
              tabIndex={isOpen ? undefined : -1}
              onClick={() =>
                openUpgrade('ai-deep', {
                  headline: 'Go Pro',
                  why: 'One subscription unlocks every Pro feature — deep AI, full matches, push and all news feeds.',
                  bullets: [
                    'Deep AI summaries & follow-ups on every tender',
                    "Full Today's Matches with reasons",
                    'Instant-match push + every news feed',
                  ],
                })
              }
              className="mb-2 flex w-full items-center gap-2.5 rounded-[11px] bg-pro px-3 py-2.5 text-left text-[#3d3205]"
            >
              <Crown size={17} strokeWidth={2.2} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold tracking-[-0.01em]">Go Pro</span>
                <span className="block text-[10.5px] font-medium opacity-80">
                  {tier === 'free' ? 'Free 14-day trial — no charge today' : 'Unlimited AI, matches & push'}
                </span>
              </span>
            </button>
          )}
          {tier === 'pro' && trial.active && (
            <Link
              href="/pro"
              tabIndex={isOpen ? undefined : -1}
              className="mb-2 flex w-full items-center gap-2.5 rounded-[11px] bg-pro-soft px-3 py-2.5 text-left text-[#7a610f]"
            >
              <Crown size={17} strokeWidth={2.2} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold tracking-[-0.01em]">Trial · {trial.daysLeft}d left</span>
                <span className="block text-[10.5px] font-medium opacity-80">Manage in Pro hub</span>
              </span>
            </Link>
          )}
          {session.signedIn && (
            <button
              type="button"
              tabIndex={isOpen ? undefined : -1}
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                try {
                  if (isSupabaseConfigured) await createClient().auth.signOut();
                } catch {
                  /* session is cleared optimistically by supabase-js */
                } finally {
                  setSigningOut(false);
                  close();
                  router.replace('/');
                }
              }}
              className="flex w-full items-center gap-3 rounded-[11px] px-2.5 py-2.5 text-left text-urgent disabled:opacity-50"
            >
              <LogOut size={19} strokeWidth={1.9} aria-hidden />
              <span className="text-[14.5px] font-semibold tracking-[-0.015em]">
                {signingOut ? 'Signing out…' : 'Sign out'}
              </span>
            </button>
          )}
          <p className="px-2.5 pb-0.5 pt-1 text-[10.5px] text-ink-3">TenderBase v1.4.2</p>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  items,
  isOpen,
  isActive,
}: {
  title?: string;
  items: Item[];
  isOpen: boolean;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="mb-1.5">
      {title && (
        <h2 className="mb-1 px-2.5 pt-2 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
          {title}
        </h2>
      )}
      <ul>
        {items.map(({ href, label, icon: Icon, sub, soon, badge }) => {
          const active = !soon && isActive(href);

          if (soon) {
            return (
              <li key={label}>
                <span
                  aria-disabled="true"
                  className="flex items-center gap-3 rounded-[11px] px-2.5 py-2.5 opacity-45"
                >
                  <Icon size={19} strokeWidth={1.8} className="shrink-0 text-ink-2" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] tracking-[-0.015em] text-ink">
                      {label}
                    </span>
                    {sub && <span className="mt-px block truncate text-caption text-ink-3">{sub}</span>}
                  </span>
                  <span className="shrink-0 rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
                    Soon
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={label}>
              <Link
                href={href}
                tabIndex={isOpen ? undefined : -1}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[11px] px-2.5 py-2.5',
                  active ? 'bg-blue-soft text-navy' : 'text-ink hover:bg-canvas',
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2.1 : 1.8}
                  className={cn('shrink-0', active ? 'text-navy' : 'text-ink-2')}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-[14.5px] tracking-[-0.015em]',
                      active && 'font-semibold',
                    )}
                  >
                    {label}
                  </span>
                  {sub && <span className="mt-px block truncate text-caption text-ink-3">{sub}</span>}
                </span>
                {badge ? (
                  <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-lg bg-urgent px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
