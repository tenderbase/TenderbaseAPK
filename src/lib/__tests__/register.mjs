/**
 * Registers the `@/*` resolver for `node --test`. See `resolver.mjs`.
 *
 * `npm test` also passes `--conditions=react-server`, which resolves the
 * `server-only` marker package to its empty implementation instead of the one
 * that throws. Without it, importing `lib/tenders.ts` or `lib/tender-api.server.ts`
 * outside a Server Component aborts the run — and those are exactly the modules
 * worth testing.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./resolver.mjs', pathToFileURL(import.meta.filename));
