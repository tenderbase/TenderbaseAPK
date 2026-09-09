import Link from 'next/link';

/** 404 within /tenders/[id] — the copy matches why a tender is gone. */
export default function TenderNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">404</p>
      <h1 className="mt-2 text-h2">Tender not found</h1>
      <p className="mt-2 text-body text-ink-2">
        This tender may have closed or been removed by the issuing organisation.
      </p>
      <Link
        href="/search"
        className="mt-6 inline-flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white"
      >
        Back to search
      </Link>
    </main>
  );
}
