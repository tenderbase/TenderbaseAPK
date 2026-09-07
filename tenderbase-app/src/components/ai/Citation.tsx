'use client';
import { FileText } from 'lucide-react';
import type { AiCitation } from '@/types/tender';

/** Inline numbered marker, e.g. the ¹ after a generated claim. */
export function Citation({ index, onClick }: { index: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View source ${index}`}
      className="ml-1 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[5px] bg-ai-bg px-1 align-[1px] text-[10px] font-bold text-ai"
    >
      {index}
    </button>
  );
}

/** The source list rendered beneath a summary. Never optional. */
export function SourceList({
  citations,
  onSelect,
}: {
  citations: AiCitation[];
  onSelect?: (c: AiCitation) => void;
}) {
  return (
    <ul className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
      {citations.map((c) => (
        <li key={c.index}>
          <button
            type="button"
            onClick={() => onSelect?.(c)}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[5px] bg-ai-bg px-1 text-[10px] font-bold text-ai">
              {c.index}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-ink">{c.documentName}</span>
              {c.pageRange && (
                <span className="mt-px block text-micro text-ink-3">{c.pageRange}</span>
              )}
            </span>
            <FileText size={16} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
