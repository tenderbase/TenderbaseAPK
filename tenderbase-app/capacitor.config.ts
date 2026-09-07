import type { CapacitorConfig } from '@capacitor/cli';

/**
 * TenderBase Android shell.
 *
 * ARCHITECTURE (option A — hosted backend):
 * This APK does NOT bundle the app. It is a thin WebView pointing at a hosted
 * Next.js deployment. That is deliberate:
 *
 *   - The Next server keeps running, so `src/app/api/*` route handlers,
 *     `src/middleware.ts` and every `server-only` module still work.
 *   - TENDERBASE_API_KEY and GEMINI_API_KEY stay on the server and are NEVER
 *     shipped inside the APK. An APK is a zip file; anything bundled in it is
 *     extractable. This is the whole reason for choosing option A.
 *   - Shipping a fix = redeploying the web app. No new APK, no store review.
 *
 * Set TENDERBASE_APP_URL at build time to point the shell at your deployment:
 *   TENDERBASE_APP_URL=https://tenderbase.vercel.app npx cap sync android
 */
const appUrl =
  process.env.TENDERBASE_APP_URL ?? 'https://tenderbase.vercel.app';

const config: CapacitorConfig = {
  appId: 'za.co.tenderbase.app',
  appName: 'TenderBase',
  // Required by the CLI even in server-URL mode; holds only the offline page.
  webDir: 'capacitor-www',
  server: {
    url: appUrl,
    // Plain http:// is rejected by Android unless cleartext is allowed. We
    // require HTTPS instead of enabling cleartext — keeps the token in the
    // Supabase auth cookie off the wire in the clear.
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    // Show the native crash/offline page rather than Chrome's dinosaur when
    // the deployment is unreachable.
    allowMixedContent: false,
  },
};

export default config;
