'use client';

import { useId } from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Form primitives for the company profile.
 *
 * Read and edit modes share one component so the two states can never drift
 * apart. Errors are wired with aria-describedby and aria-invalid rather than
 * relying on colour alone.
 */

interface BaseProps {
  label: string;
  /** Rendered under the field when there is no error. */
  hint?: string;
  error?: string;
  required?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="py-2.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-urgent">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'mt-1.5 h-11 w-full rounded-[10px] border bg-white px-3 text-[15px] text-ink',
          'outline-none placeholder:text-ink-3/70',
          // 16px+ font on mobile prevents iOS zooming on focus.
          'focus:border-navy focus:ring-2 focus:ring-navy/12',
          error ? 'border-urgent' : 'border-line',
        )}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  required,
  placeholder = 'Select…',
}: BaseProps & {
  value: T | null;
  onChange: (v: T | null) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="py-2.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-urgent">*</span>}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value === null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return onChange(null);
            const match = options.find((o) => String(o.value) === raw);
            onChange(match ? match.value : null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full appearance-none rounded-[10px] border bg-white px-3 pr-9 text-[15px] text-ink',
            'outline-none focus:border-navy focus:ring-2 focus:ring-navy/12',
            error ? 'border-urgent' : 'border-line',
            value === null && 'text-ink-3/70',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={17}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
}: BaseProps & { value: string | null; onChange: (v: string | null) => void }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="py-2.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-urgent">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'mt-1.5 h-11 w-full rounded-[10px] border bg-white px-3 text-[15px] text-ink',
          'outline-none focus:border-navy focus:ring-2 focus:ring-navy/12',
          error ? 'border-urgent' : 'border-line',
        )}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-urgent">
        <AlertCircle size={12} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-[11.5px] text-ink-3">
        {hint}
      </p>
    );
  }
  return null;
}

/** Read-only key/value row, used when the screen is not in edit mode. */
export function ReadRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | null;
  tone?: 'default' | 'open' | 'soon' | 'urgent';
}) {
  const empty = !value || !value.trim();
  const toneClass =
    tone === 'open'
      ? 'text-open'
      : tone === 'soon'
        ? 'text-soon'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink';

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-[13.5px] text-ink-2">{label}</dt>
      <dd
        className={cn(
          'text-right text-[13.5px] font-semibold',
          empty ? 'text-soon' : toneClass,
        )}
      >
        {empty ? 'Not provided' : value}
      </dd>
    </div>
  );
}

export function SavedToast({ show }: { show: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[92px] z-40 flex justify-center px-5',
        'transition-all duration-200 motion-reduce:transition-none',
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <span className="flex items-center gap-2 rounded-full bg-navy px-3.5 py-2 text-[13px] font-medium text-white shadow-primary">
        <Check size={15} strokeWidth={2.4} aria-hidden />
        Company profile saved
      </span>
    </div>
  );
}
