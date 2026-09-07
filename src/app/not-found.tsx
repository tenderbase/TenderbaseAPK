import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <h1 className="text-h2">Tender not found</h1>
      <p className="mt-2 text-body text-ink-2">
        This tender may have closed or been removed by the issuing organisation.
      </p>
      <Link href="/search" className="mt-6 flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white">
        Back to search
      </Link>
    </main>
  );
}
