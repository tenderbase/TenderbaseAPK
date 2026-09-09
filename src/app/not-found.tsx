import Link from 'next/link';

/** Generic 404 for unknown routes — never claims the page was a tender. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">404</p>
      <h1 className="mt-2 text-h2">Page not found</h1>
      <p className="mt-2 text-body text-ink-2">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white"
        >
          Back home
        </Link>
        <Link
          href="/search"
          className="inline-flex h-[52px] items-center rounded-md border border-line bg-white px-6 font-semibold text-ink"
        >
          Search tenders
        </Link>
      </div>
    </main>
  );
}
