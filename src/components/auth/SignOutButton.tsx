'use client';

import { useTransition } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { signOut } from '@/app/auth/actions';

/** Sign out row. Uses a transition so the row can show progress. */
export function SignOutButton() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() => start(() => { void signOut(); })}
      disabled={pending}
      className="flex w-full items-center gap-3 py-3.5 text-left disabled:opacity-60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-urgent-bg text-urgent">
        {pending
          ? <Loader2 size={17} strokeWidth={1.9} className="animate-spin" aria-hidden />
          : <LogOut size={17} strokeWidth={1.9} aria-hidden />}
      </span>
      <span className="flex-1 text-[14.5px] font-medium text-urgent">
        {pending ? 'Signing out…' : 'Sign Out'}
      </span>
    </button>
  );
}
