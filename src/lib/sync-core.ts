/**
 * Sync-merge core — pure, plain-Node, no React and no Supabase imports.
 *
 * The account-sync stores (saved searches, news bookmarks, alert settings)
 * all face the same reconciliation problem when a device signs in with rows
 * it wrote while signed out / on an older build:
 *
 *   1. rows that only exist locally must be pushed (first sync = device wins);
 *   2. rows that only exist remotely came from another device and must appear;
 *   3. the same id on both sides is one row — the local copy is authoritative
 *      for this device's writes, and we only push when it actually differs;
 *   4. deletes propagate only from the device that performs them (no
 *      tombstones yet) — documented, honest behaviour.
 *
 * Everything here is deterministic so the stores can be unit-tested without
 * a database.
 */

/** JSON.stringify with sorted keys — stable equality for payload comparison. */
export function stableJson(value: unknown): string {
  const seen = new Set<unknown>();
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v !== null && typeof v === 'object') {
      if (seen.has(v)) throw new Error('circular reference in stableJson');
      seen.add(v);
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sort((v as Record<string, unknown>)[k]);
      }
      seen.delete(v);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/**
 * Union of two id-keyed row sets.
 *
 * `merged`  — remote-only rows first (other devices' rows), then every local
 *             row (local wins id conflicts). Callers re-sort by their own
 *             ordering key (createdAt / savedAt).
 * `toUpsert` — local rows the server does not have, or has with different
 *             content. This is exactly what a first sync must push.
 */
export function mergeById<T>(
  local: T[],
  remote: T[],
  key: (row: T) => string,
): { merged: T[]; toUpsert: T[] } {
  const remoteByKey = new Map(remote.map((r) => [key(r), r]));
  const localByKey = new Map(local.map((l) => [key(l), l]));

  const merged: T[] = [];
  for (const r of remote) {
    const k = key(r);
    if (!localByKey.has(k)) merged.push(r); // rows from other devices
  }
  merged.push(...local); // local rows win id conflicts

  const toUpsert: T[] = [];
  for (const l of local) {
    const k = key(l);
    const r = remoteByKey.get(k);
    if (!r || stableJson(r) !== stableJson(l)) toUpsert.push(l);
  }
  return { merged, toUpsert };
}

/** Union of two string lists: local order first, remote-only appended. */
export function mergeUnique(local: string[], remote: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...local, ...remote]) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export interface SettingsReconcile<T extends string = string> {
  /** The list the store should adopt as its state. */
  adopt: T[] | null;
  /** True when the remote has no row and the local list must be pushed. */
  push: boolean;
}

/**
 * Whole-row reconciliation for single-row-per-user settings (alert mute
 * list). If the account already has a row, that row is the most recent
 * explicit state from any device, so it wins and nothing is pushed; only a
 * first-time sync (no remote row) pushes the local list.
 */
export function reconcileSettings<T extends string>(
  local: T[] | null,
  remote: T[] | null,
): SettingsReconcile<T> {
  if (remote !== null) return { adopt: remote, push: false };
  return { adopt: local, push: local !== null && local.length > 0 };
}
