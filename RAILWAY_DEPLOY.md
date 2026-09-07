# Deploying TenderBase to Railway

Everything below is verified working locally. The only blocker is Railway
authentication, which needs a browser and cannot be done from this sandbox.

## Already done

- `railway` CLI v5.49.3 installed
- Production build passes — 18 routes, middleware, dynamic SSR intact
- `start` script fixed to honour Railway's injected `$PORT`
- `railway.json` created (Nixpacks, healthcheck, restart policy)
- `.dockerignore` excludes `node_modules`, `.next`, `android`, `*.apk`
- Verified: prod server binds `PORT=4000`, `/login` returns 200
- Verified: the dev auth bypass is inert in production (`NODE_ENV` gated)

## Deploy

### 1. Log in (needs a browser)

```bash
railway login          # opens a browser
# headless alternative:
railway login --browserless
```

Or use a token from railway.app → Account → Tokens:

```bash
export RAILWAY_TOKEN=<your-token>
```

### 2. Create the service

```bash
cd ~/tenderbaseapk
railway init            # name it e.g. tenderbase-web
```

Note this is a **separate service** from your existing
`tenderbased-production` API. Add it to the same project if you want them
grouped; it must not replace the API.

### 3. Set environment variables

Set these on Railway, never in the repo:

```bash
railway variables --set TENDERBASE_API_URL=https://tenderbased-production.up.railway.app/api/v1
railway variables --set TENDERBASE_API_KEY=<key>
railway variables --set TENDERBASE_ADMIN_SECRET=<secret>
railway variables --set GEMINI_API_KEY=<key>
railway variables --set GEMINI_MODEL=<model>
railway variables --set NEXT_PUBLIC_SUPABASE_URL=<url>
railway variables --set NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

**Do not set `NEXT_PUBLIC_DEV_AUTH_BYPASS`.** It is ignored in production
builds, but leaving it out avoids any doubt.

If the API and web app share a Railway project, you can reference the API's
internal address instead of its public URL to keep traffic off the internet.

### 4. Deploy

```bash
railway up
railway domain          # generates the public URL
```

### 5. Point the APK at it

```bash
cd ~/tenderbaseapk
TENDERBASE_APP_URL=https://<your-domain> npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
```

Stop the dev server first — the sandbox has ~1.9GB RAM and cannot run both.

### 6. Google sign-in

Two different redirect URLs, easy to confuse:

- **Google Cloud Console** → Authorized redirect URIs →
  `https://<project-ref>.supabase.co/auth/v1/callback`
- **Supabase** → Authentication → URL Configuration → Redirect URLs →
  `https://<your-railway-domain>/auth/callback`

Google does not support wildcards. Until this is done, sign-in fails on the
deployed domain and the app is unusable in the APK, since production enforces
real auth.

## Notes

**Healthcheck is `/login`, not `/`.** In production `/` returns a 307 to
`/login` for signed-out users; a healthcheck on `/` could be read as a failure.
`/login` returns 200 and still exercises middleware and Supabase config.

**Cost.** This is a second always-on service. Unlike the Render free tier that
killed your syncs, Railway bills usage — a small Next app is typically a few
dollars a month.
