'use client';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onSubmit?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function SearchBar({
  value = '',
  placeholder = 'Search tenders...',
  onChange,
  onClear,
  onFocus,
  onSubmit,
  readOnly,
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex h-[50px] items-center gap-2 rounded-md border border-line bg-white pl-3.5 pr-2',
        'shadow-card-sm focus-within:border-navy focus-within:ring-[3px] focus-within:ring-navy/[0.07]',
        className,
      )}
    >
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={onFocus}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-3 hover:text-ink"
        >
          <X size={11} strokeWidth={3} aria-hidden />
        </button>
      )}
      <button
        type={onSubmit ? 'submit' : 'button'}
        onClick={(e) => {
          if (onSubmit) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
        aria-label="Search"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-navy text-white transition-opacity active:opacity-85"
      >
        <Search size={17} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
