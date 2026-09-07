import { Sparkles } from 'lucide-react';

/** Shown while Gemini reads the tender PDF — this can take up to a minute. */
export default function Loading() {
  return (
    <main className="px-5 pt-16">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-[14px] bg-ai-bg text-ai">
          <Sparkles size={22} strokeWidth={2} aria-hidden />
        </span>
        <h1 className="mt-3.5 text-card-title font-semibold tracking-[-0.02em]">
          Reading the tender documents
        </h1>
        <p className="mt-1.5 max-w-[280px] text-meta text-ink-2">
          Extracting the requirements, dates and compliance rules. This usually takes under a minute.
        </p>
      </div>
      <div className="mt-7 space-y-2.5" aria-hidden>
        {[100, 92, 96, 74].map((w, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />
        ))}
      </div>
    </main>
  );
}
