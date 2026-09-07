import 'server-only';

export interface PdfPage {
  page: number;
  text: string;
}

/** Fetches a source PDF. Guards against huge files and non-PDF responses. */
export async function fetchPdf(
  url: string,
  maxBytes = 20 * 1024 * 1024,
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > maxBytes) return null;

    const magic = new Uint8Array(buf.slice(0, 5));
    const isPdf = String.fromCharCode(...magic) === '%PDF-';
    return isPdf ? buf : null;
  } catch {
    return null;
  }
}

/** Extracts text per page, so citations can reference a real page number. */
export async function extractPdfPages(bytes: ArrayBuffer): Promise<PdfPage[]> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      const pages = (result.pages ?? []) as { num?: number; text?: string }[];

      if (pages.length > 0) {
        return pages
          .map((p, i) => ({ page: p.num ?? i + 1, text: (p.text ?? '').trim() }))
          .filter((p) => p.text.length > 0);
      }
      const all = (result.text ?? '').trim();
      return all ? [{ page: 1, text: all }] : [];
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    console.error('[pdf] extraction failed:', e);
    return [];
  }
}

/** Flattens pages into a token-budgeted, page-tagged prompt. */
export function buildPagedContext(pages: PdfPage[], maxChars = 120_000): string {
  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    const block = `\n\n[PAGE ${p.page}]\n${p.text}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join('');
}
