'use client';

import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Switch row and segmented control.
 *
 * Both render real form controls (checkbox / radiogroup) so they are
 * keyboard-operable and announced correctly, with the visual treatment on top.
 */

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  disabled = false,
  /** Shown instead of the switch when disabled — explains why. */
  unavailableNote,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: LucideIcon;
  disabled?: boolean;
  unavailableNote?: string;
}) {
  const id = useId();

  return (
    <div className={cn('flex items-center gap-3 py-3', disabled && 'opacity-60')}>
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink-2">
          <Icon size={17} strokeWidth={1.9} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={cn('block text-[14.5px] font-medium text-ink', !disabled && 'cursor-pointer')}>
          {label}
        </label>
        {(description || unavailableNote) && (
          <p className="mt-0.5 text-[12px] leading-[1.4] text-ink-2">
            {disabled && unavailableNote ? unavailableNote : description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative box-border block h-[30px] w-[50px] shrink-0 overflow-hidden rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2',
          'motion-reduce:transition-none',
          disabled ? 'cursor-not-allowed bg-line' : checked ? 'bg-navy' : 'bg-ink-3/35',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 motion-reduce:transition-none',
            checked ? 'translate-x-[20px]' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[11px] bg-canvas p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-[8px] px-2 py-2 text-[12.5px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
              'motion-reduce:transition-none',
              active ? 'bg-white text-navy shadow-card-sm font-semibold' : 'text-ink-2',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
