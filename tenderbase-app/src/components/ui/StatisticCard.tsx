import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'navy' | 'amber' | 'green';

const TONES: Record<Tone, string> = {
  navy: 'bg-blue-soft text-blue',
  amber: 'bg-soon-bg text-soon',
  green: 'bg-open-bg text-open',
};

export function StatisticCard({
  label,
  value,
  icon: Icon,
  tone = 'navy',
  onClick,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex-1 rounded-[14px] border border-line bg-white p-3 text-left shadow-card-sm',
        onClick && 'active:bg-canvas',
      )}
    >
      <div className={cn('mb-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-[9px]', TONES[tone])}>
        <Icon size={17} strokeWidth={2} aria-hidden />
      </div>
      <div className="text-[23px] font-bold leading-none tracking-[-0.045em] text-ink">{value}</div>
      <div className="mt-1 text-[11.5px] font-medium text-ink-3">{label}</div>
    </Tag>
  );
}
