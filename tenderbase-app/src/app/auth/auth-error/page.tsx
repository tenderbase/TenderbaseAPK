import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export const metadata = { title: 'Sign-in problem · TenderBase' };

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-urgent-bg text-urgent">
        <AlertCircle size={24} strokeWidth={1.9} aria-hidden />
      </span>
      <h1 className="mt-4 text-[24px] font-bold tracking-[-0.03em]">Sign-in didn&apos;t complete</h1>
      <p className="mt-2 text-[14.5px] leading-[1.5] text-ink-2">
        We couldn&apos;t finish signing you in. This usually means the callback URL
        isn&apos;t allowlisted in Supabase, or the link had already been used.
      </p>
      {searchParams.reason && (
        <p className="mt-3 rounded-[10px] bg-canvas px-3 py-2 font-mono text-[11.5px] leading-[1.45] text-ink-2">
          {searchParams.reason}
        </p>
      )}
      <Link
        href="/login"
        className="mt-6 flex h-[52px] items-center justify-center rounded-[12px] bg-navy text-[16px] font-semibold text-white"
      >
        Back to sign in
      </Link>
    </main>
  );
}
