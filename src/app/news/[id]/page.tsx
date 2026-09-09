import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, Clock, ExternalLink } from 'lucide-react';
import { NewsBookmarkButton } from '@/components/news/NewsBookmarkButton';
import { getNewsItemById } from '@/lib/news.server';
import { getFacets } from '@/lib/tenders';
import { formatDate, formatRelative } from '@/lib/format';
import { pickCrossLink, storyCategory } from '@/lib/news-relevance';

export const revalidate = 300;

// Next 14 hands dynamic params over still percent-encoded ("a%3Ab"), so
// decode before lookups — ids are `<sourceId>:<hash>`.
function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const found = await getNewsItemById(decodeId(params.id));
  if (!found) return { title: 'Story not found · TenderBase' };
  return { title: `${found.item.title} · TenderBase News` };
}

/**
 * Reader view (blueprint §5.7): clean typography, no chrome. The story body
 * is whatever the source feed actually published (title, summary, source,
 * timestamp); reading the full piece happens on the publisher's site — the
 * app never fabricates article copy. Tenders cross-link cards ("N open
 * tenders in this sector") are real counts from the live catalogue.
 */
export default async function NewsArticlePage({ params }: { params: { id: string } }) {
  const found = await getNewsItemById(decodeId(params.id));
  if (!found) notFound();
  const { item, sourceName, sourceHomepage } = found;

  const category = storyCategory(`${item.title} ${item.dek}`.toLowerCase());
  let cross: { count: number; linkName: string } | null = null;
  try {
    const facets = await getFacets();
    if (category) {
      cross = pickCrossLink(category, facets.categories);
    }
  } catch {
    cross = null; // catalogue unreachable — cross-link simply doesn't render
  }

  return (
    <main>
      <header className="flex items-center justify-between bg-white px-4 py-2">
        <Link
          href="/news"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
          aria-label="Back to news"
        >
          <ArrowLeft size={20} strokeWidth={1.9} aria-hidden />
        </Link>
        <NewsBookmarkButton id={item.id} />
      </header>

      <article className="px-5 pb-24">
        <div className="flex items-center gap-2 pt-3 text-[11px] text-ink-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-canvas text-[10.5px] font-bold uppercase text-ink-2">
            {sourceName.slice(0, 2)}
          </span>
          <span className="font-semibold text-ink-2">{sourceName}</span>
          <span aria-hidden>·</span>
          {item.publishedAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} strokeWidth={2.1} aria-hidden />
              {formatRelative(item.publishedAt)}
            </span>
          ) : (
            'Date not published'
          )}
        </div>

        <h1 className="mt-3.5 text-[25px] font-bold leading-[32px] tracking-[-0.035em] text-ink">
          {item.title}
        </h1>

        <p className="mt-3 border-l-2 border-ai-line pl-3.5 text-[15.5px] leading-[24px] text-ink-2">
          {item.dek || 'The publisher did not include a summary in the feed.'}
        </p>

        <p className="mt-4 text-caption text-ink-3">
          Published {item.publishedAt ? formatDate(item.publishedAt) : 'at an unknown time'}
          {' · '}
          summary from the live feed.
        </p>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"
        >
          Read the full article on {sourceName}
          <ExternalLink size={15} strokeWidth={2.1} aria-hidden />
        </a>
        <p className="mt-2 text-center text-[10.5px] text-ink-3">
          Opens {sourceHomepage.replace(/^https?:\/\/(www\.)?/, '')} in a new tab
        </p>

        {cross && (
          <section className="mt-6 rounded-lg border border-blue-line bg-blue-soft p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <Building2 size={15} strokeWidth={1.9} className="text-blue" aria-hidden />
              Tenders in this space
            </h2>
            <p className="mt-1.5 text-[13px] leading-[19px] text-ink-2">
              {cross.count} open {cross.count === 1 ? 'tender' : 'tenders'} currently advertised in{' '}
              {category} — the news and the catalogue talking to each other.
            </p>
            <Link
              href={`/search?category=${encodeURIComponent(cross.linkName)}`}
              className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue"
            >
              Browse them
              <ArrowRight size={14} strokeWidth={2.3} aria-hidden />
            </Link>
          </section>
        )}
      </article>
    </main>
  );
}
