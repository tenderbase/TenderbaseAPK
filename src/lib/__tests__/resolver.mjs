/**
 * Node module-resolution hook for the bare test runner.
 *
 * `node --test` cannot resolve the `@/*` path alias that `tsconfig.json` gives
 * the app, which is why the older test files hand-mirrored pure logic from
 * `src/lib/*.ts` in JavaScript. That mirror drifts: it is a copy of the source
 * that nothing forces anyone to update, so a bug fixed in `adapt.ts` could
 * leave the test asserting the old behaviour — and pass.
 *
 * Node 22 strips TypeScript types natively, so the real modules can be imported
 * directly once `@/` resolves. This hook does that and nothing else.
 *
 * Registered by `register.mjs` via the `--import` flag in `npm test`.
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = path.resolve(process.cwd(), 'src');

function resolveAlias(specifier) {
  const base = path.join(SRC, specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    path.join(base, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  throw new Error(`Test resolver: cannot find a module for "${specifier}" (tried ${candidates.join(', ')})`);
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    // No `format` on purpose. Returning `format: 'module'` makes Node treat a
    // .ts file as plain JavaScript and skip type stripping, which fails on the
    // first `import type {`. Omitting it lets Node pick `module-typescript`
    // from the extension.
    return { url: resolveAlias(specifier), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
