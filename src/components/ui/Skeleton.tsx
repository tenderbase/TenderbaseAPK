import { cn } from '@/lib/cn';

/**
 * Skeleton block for loading states. Shimmer sweeps the block on a loop;
 * motion-reduce disables the sweep via the global CSS kill-switch.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-[12px] bg-canvas',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent',
        'motion-reduce:after:animate-none',
        className,
      )}
    />
  );
}

/** A set of card-shaped skeletons for list screens. */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-line bg-white p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex gap-1.5">
                <Skeleton className="h-[22px] w-16 rounded-md" />
                <Skeleton className="h-[22px] w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-[34px] w-[34px] rounded-[9px]" />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            <Skeleton className="h-[24px] w-24 rounded-md" />
            <Skeleton className="h-[24px] w-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
