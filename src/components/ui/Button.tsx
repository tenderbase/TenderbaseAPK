'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white shadow-primary active:bg-navy-900',
  secondary: 'bg-white text-navy border-[1.5px] border-line active:bg-canvas',
  ghost: 'bg-blue-soft text-navy active:bg-blue-line',
  danger: 'bg-urgent-bg text-urgent active:bg-urgent/10',
};

/** Touch targets stay >=44px on mobile. */
const SIZES: Record<Size, string> = {
  md: 'h-[52px] text-[16px] px-5',
  sm: 'h-11 text-[14px] px-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = true, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
        'tracking-[-0.01em] transition-colors disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
});
