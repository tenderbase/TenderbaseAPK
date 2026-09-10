/**
 * Server bootstrap hook (Next `instrumentation.ts`).
 *
 * Why a keep-alive exists: the ingestion API also runs on Render's free tier,
 * which spins a service down after ~15 minutes without requests. Waking it
 * takes longer than this app's whole 20 s upstream timeout, so the first
 * server-side fetch after an idle period lost the race every time — the UI
 * then rode the browser-direct fallback and bannered "our server could not
 * reach it from here". Pinging `/stats` every ten minutes keeps the upstream
 * warm (and its own dataset loaded), so the normal server path succeeds and
 * the fallback notice becomes the rarity it should be.
 *
 * Render's free allowance (~750 h/month) fits exactly one always-on service;
 * this keeps precisely that one service awake, and nothing else.
 *
 * Guards: nodejs runtime only, production only (dev/test get no background
 * traffic), and `TENDERBASE_KEEPALIVE_DISABLED=true` turns it off for anyone
 * running a production build somewhere egress is not wanted.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.TENDERBASE_KEEPALIVE_DISABLED === 'true') return;

  const base = (
    process.env.TENDERBASE_API_URL ?? 'https://tenderbase-api-rqrh.onrender.com'
  ).replace(/\/$/, '');
  const PING_INTERVAL_MS = 10 * 60 * 1000;
  const PING_TIMEOUT_MS = 20_000;

  let inFlight = false;
  const ping = async (): Promise<void> => {
    if (inFlight) return; // a slow wake-up must not stack pings
    inFlight = true;
    try {
      const res = await fetch(`${base}/stats`, {
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        cache: 'no-store',
      });
      // 200 keeps it warm; a 502 means it was mid-wake — which is exactly the
      // request that starts the wake, so log and move on. Anything else is
      // worth a warning: a wrong TENDERBASE_API_URL (e.g. still pointing at
      // the retired service, whose /stats 404s) shows up here first, long
      // before a user reports an empty catalogue.
      if (!res.ok) {
        console.warn(
          `[keepalive] tender API ping: HTTP ${res.status} — is TENDERBASE_API_URL pointing at the live ingestion API?`,
        );
        return;
      }
      try {
        const body = (await res.json()) as { stats?: { totalTenders?: unknown } };
        const total = body?.stats?.totalTenders;
        console.log(
          `[keepalive] tender API ping: 200, dataset totalTenders=${typeof total === 'number' ? total : 'unknown'}`,
        );
        if (total === 0) {
          console.warn('[keepalive] upstream reports an EMPTY dataset — check TENDERBASE_API_URL.');
        }
      } catch {
        console.log('[keepalive] tender API ping: 200 (body was not JSON)');
      }
    } catch (e) {
      console.warn(
        '[keepalive] tender API ping failed:',
        e instanceof Error ? e.message : e,
      );
    } finally {
      inFlight = false;
    }
  };

  // First ping shortly after boot (the deploy itself may have woken the API;
  // this refreshes that warmth and the timer holds it from here).
  const first = setTimeout(ping, 15_000);
  first.unref?.();
  const timer = setInterval(ping, PING_INTERVAL_MS);
  timer.unref?.(); // never hold the process open just to ping
}
