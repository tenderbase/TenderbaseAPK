import { Skeleton } from '@/components/ui/Skeleton';

/** Route-level loading state for the dashboard. */
export default function DashboardLoading() {
  return (
    <main className="px-5 pt-4">
      <div className="flex items-center gap-2.5">
        <div className="h-[38px] w-[38px] rounded-[10px] bg-canvas md:hidden" aria-hidden />
        <div className="flex-1">
          <div className="h-3 w-28 rounded bg-canvas" aria-hidden />
          <div className="mt-1.5 h-5 w-48 rounded-md bg-canvas" aria-hidden />
        </div>
      </div>
      <div className="mt-4 flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-[14px] border border-line bg-white p-3">
            <div className="h-[30px] w-[30px] rounded-[9px] bg-canvas" aria-hidden />
            <div className="mt-2.5 h-6 w-12 rounded-md bg-canvas" aria-hidden />
            <div className="mt-1 h-3 w-16 rounded bg-canvas" aria-hidden />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-3.5">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-3 h-[24px] w-28" />
          </div>
        ))}
      </div>
    </main>
  );
}
