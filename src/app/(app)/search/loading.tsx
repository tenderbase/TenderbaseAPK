import { CardSkeleton } from '@/components/ui/Skeleton';

/** Route-level loading state for /search — skeletons, never a blank flash. */
export default function SearchLoading() {
  return (
    <main>
      <header className="sticky top-0 z-30 border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-[38px] w-[38px] rounded-[10px] bg-canvas md:hidden" aria-hidden />
          <div className="h-[24px] w-32 rounded-md bg-canvas" aria-hidden />
        </div>
        <div className="h-[50px] rounded-md bg-canvas" aria-hidden />
        <div className="mt-3 flex gap-2">
          <div className="h-9 flex-1 rounded-[10px] bg-canvas" aria-hidden />
          <div className="h-9 flex-1 rounded-[10px] bg-canvas" aria-hidden />
        </div>
      </header>
      <div className="px-5 pt-3.5">
        <div className="mb-3 h-4 w-40 rounded-md bg-canvas" aria-hidden />
        <CardSkeleton count={6} />
      </div>
    </main>
  );
}
