'use client';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function SearchBar({
  value = '',
  placeholder = 'Search tenders...',
  onChange,
  onClear,
  onFocus,
  readOnly,
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex h-[50px] items-center gap-2.5 rounded-md border border-line bg-white px-3.5',
        'shadow-card-sm focus-within:border-navy focus-within:ring-[3px] focus-within:ring-navy/[0.07]',
        className,
      )}
    >
      <Search size={19} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={onFocus}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-3"
        >
          <X size={11} strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  );
}
