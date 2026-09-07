'use client';
import { Sparkles, Clock, FileText, Flag, Bell, Settings, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';

type Tone = 'new' | 'soon' | 'update' | 'muted';

interface Notification {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  group: 'Today' | 'Yesterday' | 'Earlier';
}

const TONES: Record<Tone, string> = {
  new: 'bg-blue-soft text-blue',
  soon: 'bg-soon-bg text-soon',
  update: 'bg-open-bg text-open',
  muted: 'bg-canvas text-ink-3',
};

const NOTIFICATIONS: Notification[] = [
  { id: '1', icon: Sparkles, tone: 'new', title: 'New 94% match for your profile', description: 'IT equipment tender published by eThekwini Municipality.', time: '2h ago', unread: true, group: 'Today' },
  { id: '2', icon: Clock, tone: 'soon', title: 'Closing soon', description: 'Security Services tender closes in 2 days.', time: '5h ago', unread: true, group: 'Today' },
  { id: '3', icon: FileText, tone: 'update', title: 'Saved tender updated', description: 'Documents have been updated for Supply and Delivery of Computer Equipment.', time: 'Yesterday', unread: false, group: 'Yesterday' },
  { id: '4', icon: Sparkles, tone: 'new', title: '6 new tenders in KwaZulu-Natal', description: 'Matching Construction and Supply & Delivery.', time: 'Yesterday', unread: false, group: 'Yesterday' },
  { id: '5', icon: Flag, tone: 'muted', title: 'Tender closed', description: 'Fleet Maintenance Services has closed.', time: '28 Aug', unread: false, group: 'Earlier' },
];

const GROUPS = ['Today', 'Yesterday', 'Earlier'] as const;

function NotificationItem({ n }: { n: Notification }) {
  const Icon = n.icon;
  return (
    <li
      className={cn(
        'flex items-start gap-2.5 rounded-[14px] p-3',
        n.unread ? 'border border-line bg-white shadow-card-sm' : 'border border-transparent',
      )}
    >
      <span className={cn('flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]', TONES[n.tone])}>
        <Icon size={17} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('text-body tracking-[-0.015em]', n.unread ? 'font-semibold' : 'font-medium')}>
            {n.title}
          </span>
          <span className="shrink-0 text-micro text-ink-3">{n.time}</span>
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-[18px] text-ink-2">{n.description}</span>
      </span>
      {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue" aria-label="Unread" />}
    </li>
  );
}

export default function AlertsPage() {
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Alerts</h1>
          </div>
            {unread > 0 && (
              <span className="rounded-lg bg-urgent px-1.5 py-0.5 text-micro font-bold text-white">
                {unread} new
              </span>
            )}
          </div>
          <button className="text-[13.5px] font-semibold text-blue">Mark all as read</button>
        </div>
      </header>

      <div className="px-5">
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[13px] bg-blue-soft p-3">
          <Bell size={19} strokeWidth={2} className="shrink-0 text-blue" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-meta font-semibold text-navy">Monitoring 5 categories</p>
            <p className="text-[11.5px] text-blue">AI matching across KwaZulu-Natal and Gauteng</p>
          </div>
          <ChevronRight size={16} strokeWidth={2.3} className="text-navy" aria-hidden />
        </div>

        {GROUPS.map((g) => {
          const items = NOTIFICATIONS.filter((n) => n.group === g);
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-1.5 mt-3 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
                {g}
              </h2>
              <ul className="space-y-1.5">
                {items.map((n) => (
                  <NotificationItem key={n.id} n={n} />
                ))}
              </ul>
            </section>
          );
        })}

        <button className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] border border-line bg-white text-body font-semibold text-navy">
          <Settings size={18} strokeWidth={2} aria-hidden />
          Manage alert preferences
        </button>
      </div>
    </main>
  );
}
