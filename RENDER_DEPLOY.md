# Deploying the TenderBase web service to Render

Install/runbook for the **`tenderbase-web`** Render service (the Next.js app).
It is a **separate service** from the existing `tenderbase-api` — add it beside
the API, never replace it.

Everything below is verified working locally. The only things that need a
human are the Render dashboard (GitHub connection) and the secret values.

## Already done (in the repo)

- `render.yaml` — Render Blueprint: Node runtime, `npm run build`,
  `npm start`, healthcheck `/login`, auto-deploy on push
- `start` script honours Render's injected `$PORT`
  (`next start -H 0.0.0.0 -p ${PORT:-3000}`)
- Verified: `/login` returns 200 (safe healthcheck — `/` 307-redirects to
  `/login` for signed-out users)
- Verified: prod build passes in a network-connected environment
  (note: in air-gapped sandboxes `next/font` fails to fetch Inter from
  Google Fonts at build time — Render's build runners are fine)

## Install

### 1. Connect GitHub

Log in at **render.com** (GitHub). Authorize access to
`tenderbase/tenderbaseapk`.

### 2. Create the service

**New → Blueprint →** repo `tenderbase/tenderbaseapk`, branch
`arena/01a07c2c-tenderbaseapk` (or `main` once merged).

Render reads `render.yaml` and pre-fills: Node runtime, build
`npm run build`, start `npm start`, healthcheck `/login`, auto-deploy.

<details>
<summary>Prefer not to use a Blueprint?</summary>

**New → Web Service** → same repo/branch. Render auto-detects Node from
`package.json`; set manually what the Blueprint would have set:

- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/login`
- Instance: free (or a paid plan — see "Gotchas")

</details>

### 3. Enter the secrets (dashboard only — never the repo)

| Variable | Source | Required |
|---|---|---|
| `TENDERBASE_API_KEY` | your tender API | yes |
| `TENDERBASE_ADMIN_SECRET` | generate your own | no (admin/sync endpoints) |
| `GEMINI_API_KEY` | aistudio.google.com/apikey | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | yes |

Pre-filled by the Blueprint (override in **Environment** if wrong):

- `TENDERBASE_API_URL=https://tenderbase-api.onrender.com/api/v1`
  (point it at the Railway `tenderbased-production` URL if the API lives
  there instead)
- `GEMINI_MODEL=gemini-2.5-flash`

**Do not set `NEXT_PUBLIC_DEV_AUTH_BYPASS`.** It is dev-gated and inert in
production builds, but leave it out.

### 4. Deploy

Build takes ~2–4 min; the `/login` healthcheck gates the deploy. On success
you get `https://tenderbase-web.onrender.com`
(custom domain: **Settings → Domain Names**).

### 5. Configure Google sign-in

Two different redirect URLs, easy to confuse:

- **Supabase** → Authentication → URL Configuration:
  - Site URL: `https://tenderbase-web.onrender.com`
  - Redirect URLs: add `https://tenderbase-web.onrender.com/auth/callback`
- **Google Cloud Console** → Authorized redirect URIs (unchanged):
  `https://<project-ref>.supabase.co/auth/v1/callback`

Google does not support wildcards. Until this is done, sign-in fails on the
deployed domain and the app is unusable in the APK, since production
enforces real auth.

### 6. Verify

Open the domain → sign in with Google → dashboard shows **live** tenders
(no "Showing sample data" banner).

### 7. Point the APK at it

```bash
TENDERBASE_APP_URL=https://tenderbase-web.onrender.com npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
```

## Gotchas

- **Free plan sleeps** after ~15 min idle → first request after a lull takes
  ~50 s. Upgrade the instance in the dashboard (or set `plan:` in
  `render.yaml`) to keep it awake.
- **AI cache is on local disk** and survives until the next redeploy/restart
  — enough to protect the Gemini free tier (~20 req/day); it simply
  re-caches after a deploy.
- **The upstream API also sleeps** (Render free tier) — the app's 45 s
  timeout plus the "tender service is waking up" fallback already handle it.
- **Cost.** Second always-on service; a small Next.js app on a paid
  instance is a few dollars a month.

## Reusable pattern for future web services

Any new Node/Next.js web service can reuse this exact shape:

1. App at repo root (or a dedicated folder) with `package.json`
2. `start` script bound to `0.0.0.0` and `${PORT:-3000}`
3. A stable **200** healthcheck endpoint that is *not* a redirect
4. `render.yaml` entry: `type: web`, `runtime: node`,
   `buildCommand: npm run build`, `startCommand: npm start`,
   `healthCheckPath`, `autoDeploy: true`, secrets as `sync: false`
   `envVars`
5. Secrets in the dashboard, public `NEXT_PUBLIC_*` vars in `envVars`
   too (Render injects both server-side and at build time)

Add a second `services:` entry in `render.yaml` for the next service and
re-deploy the Blueprint — Render provisions it beside the existing ones.
