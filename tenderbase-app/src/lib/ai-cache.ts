import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * On-disk cache for AI results.
 *
 * The Gemini free tier on this project allows only **20 requests per day** for
 * gemini-2.5-flash (confirmed from the quota violation payload —
 * `GenerateRequestsPerDayPerProjectPerModel-FreeTier: 20`, well below the
 * numbers in Google's public docs). Without caching, ten page refreshes would
 * exhaust half a day's budget.
 *
 * Next's `revalidate` only caches the rendered route in memory and is lost on
 * restart, so results are persisted to disk keyed by tender id. Swap this for
 * Supabase or Redis in production — the interface is deliberately tiny.
 */

const CACHE_DIR = path.join(process.cwd(), '.ai-cache');

/** Tender documents are static once published; a week is safe. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Entry<T> {
  value: T;
  storedAt: number;
}

function keyToPath(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(keyToPath(key), 'utf8');
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.storedAt > TTL_MS) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const entry: Entry<T> = { value, storedAt: Date.now() };
    await fs.writeFile(keyToPath(key), JSON.stringify(entry), 'utf8');
  } catch (e) {
    // Caching is an optimisation — never fail a request because of it.
    console.error('[ai-cache] write failed:', e);
  }
}

/**
 * Wraps a generator with read-through caching.
 * `shouldCache` avoids persisting degraded/fallback results, so a transient
 * outage doesn't get frozen in for a week.
 */
export async function withCache<T>(
  key: string,
  generate: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  const hit = await readCache<T>(key);
  if (hit) return hit;

  const value = await generate();
  if (shouldCache(value)) await writeCache(key, value);
  return value;
}
