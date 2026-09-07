import { Info } from 'lucide-react';

/**
 * Required on every surface that renders generated content.
 * Kept as a component so the wording can never drift between screens.
 */
export function AiDisclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-canvas p-3">
      <Info size={15} strokeWidth={2} className="mt-px shrink-0 text-ink-3" aria-hidden />
      <p className="text-[11.5px] leading-[17px] text-ink-2">
        {children ??
          'AI output is generated from the official tender documents and may contain errors. Always verify against the source documents before submitting a bid.'}
      </p>
    </div>
  );
}
