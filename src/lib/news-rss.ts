import { createHash } from 'node:crypto';

/**
 * Tolerant RSS 2.0 / Atom parser for the curated SA sources.
 *
 * Pure module (no network, no React) so the real feed contract is covered
 * by plain-Node tests. Deliberately small: it handles the constructs the
 * registry's feeds use (CDATA, entities, RSS `<item>` and Atom `<entry>`,
 * `<link>` as text or as an `href` attribute) and ignores everything else.
 */

export interface ParsedFeedItem {
  title: string;
  /** Absolute story URL; null when the feed gives none. */
  url: string | null;
  /** ISO instant; null when unparseable/absent. */
  publishedAt: string | null;
  /** Plain-text summary (tags/CDATA stripped, trimmed). */
  dek: string;
}

export interface ParsedFeed {
  /** Channel/site title when present. */
  title: string | null;
  items: ParsedFeedItem[];
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return ENTITIES[body] ?? m;
  });
}

/** Removes a CDATA wrapper if present. */
function unwrapCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
}

function innerText(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function stripHtml(s: string): string {
  // Drop tags but keep paragraph breaks as spaces so words never fuse.
  const spaced = s.replace(/<\/(p|div|br|li|h\d)>/gi, ' ').replace(/<[^>]*>/g, '');
  return decodeEntities(spaced).replace(/\s+/g, ' ').trim();
}

function tryDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function firstTag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1].trim() : null;
}

function parseEntry(entry: string): ParsedFeedItem {
  const title = innerText(unwrapCdata(firstTag(entry, 'title') ?? '')) || '(untitled)';

  // RSS: <link>text</link> · Atom: <link href="…" rel="alternate"/>
  const links = [...entry.matchAll(/<link\b([^>]*)>([\s\S]*?)<\/link>|<link\b([^>]*)\/>/gi)];
  let url: string | null = null;
  for (const m of links) {
    const attrs = (m[1] ?? m[3] ?? '').trim();
    const href = attrs.match(/href\s*=\s*"([^"]+)"/i)?.[1];
    const text = innerText(m[2] ?? '');
    const candidate = (href ?? text).trim();
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      url = candidate;
      break;
    }
  }

  const pub =
    firstTag(entry, 'pubDate') ??
    firstTag(entry, 'published') ??
    firstTag(entry, 'updated') ??
    firstTag(entry, 'dc:date');
  const publishedAt = tryDate(pub);

  const desc = firstTag(entry, 'description') ?? firstTag(entry, 'summary') ?? firstTag(entry, 'content:encoded') ?? '';
  const dek = stripHtml(unwrapCdata(desc)).slice(0, 320);

  return { title, url, publishedAt, dek };
}

export function parseFeedXml(xml: string): ParsedFeed {
  const channelTitle = innerText(firstTag(xml, 'title') ?? '').slice(0, 120) || null;

  // Capture each <item> (RSS) or <entry> (Atom) as its own segment, then
  // stop at the next item boundary so descriptions can never bleed over.
  const rawItems = xml
    .split(/<item\b[\s>]/i)
    .slice(1)
    .map((seg) => seg.split(/<\/item>/i)[0]);
  const rawEntries = xml
    .split(/<entry\b[\s>]/i)
    .slice(1)
    .map((seg) => seg.split(/<\/entry>/i)[0]);
  const raw = rawItems.length > 0 ? rawItems : rawEntries;

  const items = raw
    .map((seg) => {
      const it = parseEntry(`<item>${seg}</item>`);
      return it;
    })
    .filter((it) => it.title !== '(untitled)' || it.url)
    .slice(0, 40);

  return { title: channelTitle, items };
}

/**
 * Stable story id across live fetches and fixtures: `<sourceId>:<hash>` so
 * bookmarks survive provenance switches. Uses the URL — unique per story.
 */
export function newsItemId(sourceId: string, url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 14);
  return `${sourceId}:${hash}`;
}
