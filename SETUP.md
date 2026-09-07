# TenderBase — Install & Test

Complete guide to running and verifying the app on your machine.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 18.17+ (20 LTS recommended) | `node -v` |
| npm | 9+ | `npm -v` |

If you don't have Node, install the **LTS** build from [nodejs.org](https://nodejs.org)
(or use `nvm install 20`).

No database, Docker or API key is needed to run the app — it ships with
realistic South African fixture data in `src/lib/mock-data.ts`.

---

## 2. Live tender data

The app reads **real South African tenders** from the eTenders-backed API.
Put your key in `.env.local`:

```bash
cp .env.example .env.local
# then set TENDERBASE_API_KEY=<your key>
```

Without a key the app still runs — it falls back to sample data and shows a
notice saying so. See `API-INTEGRATION.md` for the full data-mapping notes.

Note: the upstream is on a free tier and sleeps when idle, so the **first**
request after a pause can take ~25 seconds.

## 3. AI features (optional)

Free Gemini key from https://aistudio.google.com/apikey, then in `.env.local`:

```bash
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

Summaries and risk warnings are generated from each tender's real PDF.
**The free tier on this project allows only 20 requests/day**, so results are
cached to disk for 7 days; without a key the AI screens show sample content.
See `AI-INTEGRATION.md`.

## 4. Install

Download and unzip `tenderbase-source.zip`, then:

```bash
cd tenderbaseapk
npm install
```

Takes about 20 seconds and installs 126 packages.

---

## 5. Run

```bash
npm run dev
```

Open **http://localhost:3000**.

To view it as a phone: open DevTools (`F12`) → click the device-toolbar icon
(`Ctrl/Cmd + Shift + M`) → choose **iPhone 14 Pro** or set a custom
**390 × 844** viewport. That is the size the screens were designed at.

Resize the window wider than **768 px** and the bottom tab bar becomes a left
sidebar and cards reflow into a 2-column grid — same components, no separate
desktop build.

---

## 6. Test

Four independent checks. Run them all with one command:

```bash
npm run verify     # typecheck + unit tests + production build
```

Or individually:

### a. Type safety
```bash
npm run typecheck
```
Runs `tsc --noEmit` in **strict** mode. Expected: no output, exit 0.

### b. Unit tests — business logic
```bash
npm test
```
Uses the built-in Node test runner (no Jest/Vitest to install). Covers the
rules most likely to cause real bugs:

```
✔ formatValue: millions / thousands / withheld
✔ getStatus is derived from the closing date
✔ status boundaries do not overlap
✔ daysUntil ignores time-of-day
✔ September abbreviates to Sep, not Sept (Intl regression)
✔ reference-code titles are replaced by the description
✔ ALL CAPS is normalised, mixed case untouched
✔ titles never exceed the card budget
✔ citation markers are sequential and resolve to a real source
✔ daily quota is distinguished from per-minute rate limiting
# pass 21  # fail 0
```

### c. Production build
```bash
npm run build
```
Expected: `✓ Compiled successfully`, 10 routes, ~111 kB first-load JS.

### d. Smoke test — every route renders correctly
With `npm run dev` running **in another terminal**:

```bash
npm run smoke
```

Checks all routes return the right status *and* the right content — including
that live data is actually flowing, that reference codes never surface as
titles, and that the API key never reaches the client:

```
  passed: 21   failed: 0
  ALL CHECKS PASSED
```

Point it at any environment: `./smoke-test.sh https://staging.tenderbase.co.za`

---

## 7. What to click through

The prototype flow, in order:

| Route | What to check |
|---|---|
| `/` | 955 live tenders, real municipalities, stat cards from live counts |
| `/search` | Type `security` — hits all 955 upstream, not just the loaded page |
| `/search?category=construction` | Quick-filter chips map to real API parameters |
| `/saved` | Tabs filter; red **"Closes in 2 days"** outranks the match badge |
| `/tenders/1066` | Real eTenders record: documents link to actual PDFs |
| `.../summary` | Numbered citations `¹²³` mapping to the **Sources** list |
| `.../match` | 79% ring, transparent score breakdown, **Before you bid** warning |
| `/alerts` · `/profile` · `/briefing` | Grouped notifications, settings rows, weekly digest |

**Deliberate behaviours, not bugs:**
- Bookmarks reset on reload — saving needs Supabase auth (`client_id`) first.
- Every tender shows **"Not disclosed"** for value: the eTenders feed publishes
  no monetary field, and inventing one would be dangerous.
- Some tenders show **"Location not specified"** — 59% of records have no
  province, and a wrong guess is worse than an honest gap.
- AI summaries come from the real tender PDFs via Gemini. If the daily quota
  is spent you get a metadata-only summary, clearly flagged in amber.
- The match score is a fixed rubric, not model output — only the
  "Before you bid" warnings are AI-generated.
- Deadlines shift with today's date because status is *computed*, never stored —
  so "Closes in 2 days" is always truthful.

---

## 8. Troubleshooting

**`Cannot find module './vendor-chunks/*.js'` or random 500s**
Running `npm run build` while `npm run dev` is live corrupts the shared
`.next` cache. Fix:
```bash
npm run clean && npm run dev
```

**Port 3000 already in use**
```bash
npm run dev -- -p 3001
```

**`next: not found`** — you skipped `npm install`, or you're in the wrong directory.

**Tailwind classes not applying** — restart the dev server; `tailwind.config.ts`
is only read at startup.

---

## 9. Connecting Supabase

```bash
cp .env.example .env.local
```

Fill in Supabase and TenderBase API credentials, then swap the mock imports for
the typed client — component props are already the right shape:

```diff
- import { MOCK_TENDERS } from '@/lib/mock-data';
+ import { tenderApi } from '@/lib/api';
+ const { results } = await tenderApi.search({ query });
```

`TENDERBASE_API_KEY` and `AI_PROVIDER_API_KEY` must stay server-side — they are
read only inside `/api/*` route handlers, never in a `'use client'` file. This
matters especially for the Android build, where the bundle is easily inspected.

---

## 10. Android APK (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init TenderBase co.za.tenderbase.app
```

In `next.config.mjs`, uncomment `output: 'export'` and `images.unoptimized`,
then:

```bash
npm run build
npx cap add android
npx cap sync
npx cap open android      # requires Android Studio
```

Static export cannot use dynamic server routes, so `/tenders/[id]` needs
`generateStaticParams()` or client-side fetching first. Safe-area insets and
`maximumScale: 1` (no zoom-jitter on input focus) are already configured.
