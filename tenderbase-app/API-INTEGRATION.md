# Live API Integration

The app now reads real South African tenders from the
**South African Tender API** (`https://tenderbase-api.onrender.com`), which
ingests and normalises the National Treasury **eTenders OCDS** feed.

At the time of writing it serves **955 live tenders** from a single source
(`eTenders`).

---

## 1. Setup

```bash
cp .env.example .env.local
```

```bash
TENDERBASE_API_URL=https://tenderbase-api.onrender.com/api/v1
TENDERBASE_API_KEY=<your key>
```

The key is sent as `X-API-Key`. **Never** prefix it with `NEXT_PUBLIC_` — that
would inline it into the client bundle, which for the Capacitor build means
shipping it inside the APK where anyone can unzip it.

Two safeguards enforce this:

- `src/lib/tender-api.server.ts` imports `server-only`, so importing it from a
  `'use client'` file is a **build error**, not a runtime surprise.
- `smoke-test.sh` asserts the key never appears in any client payload.

---

## 2. Architecture

```
Browser / APK
    │  (no key, relative URLs only)
    ▼
Next.js server  ── src/app/api/*        route handlers (proxy)
    │            ── src/lib/tenders.ts   data access + mock fallback
    │            ── src/lib/adapt.ts     anti-corruption layer
    ▼            ── src/lib/tender-api.server.ts   ← key lives here only
tenderbase-api.onrender.com/api/v1
    ▼
National Treasury eTenders (OCDS)
```

Screens are **server components** that call `src/lib/tenders.ts` directly, so
the first paint already contains data — no loading spinner, no client-side key.
The `/api/*` handlers exist for client-side and future native use.

| File | Responsibility |
|---|---|
| `src/types/api.ts` | Wire types, snake_case, mirroring the OpenAPI schema exactly |
| `src/lib/tender-api.server.ts` | HTTP, auth, timeouts, ISR caching, typed errors |
| `src/lib/adapt.ts` | Upstream → domain model. All messy-data defences live here |
| `src/lib/tenders.ts` | What screens call. Adds the mock fallback |
| `src/app/api/*` | Public JSON proxy for client-side consumers |

Keeping `adapt.ts` as a hard boundary means an upstream field rename touches
one file, not thirty components.

---

## 3. Endpoints used

| App surface | Endpoint |
|---|---|
| Dashboard — latest | `GET /tenders/latest?limit=8` |
| Dashboard — closing soon | `GET /tenders/closing-soon?hours=168` |
| Search + filters | `GET /tenders?search=&category=&province=&sort=&page=` |
| Tender detail | `GET /tenders/{id}` |
| Filter options | `GET /tenders/facets` |

Responses are cached with ISR (`revalidate: 300`, facets `3600`) so browsing
doesn't hammer the upstream and the free-tier instance stays responsive.

---

## 4. Data-quality problems found, and how they're handled

I profiled a 300-record sample before mapping anything. The live feed is
considerably messier than the schema implies.

### 4.1 `title` is usually a reference code — **the biggest issue**

~90% of records put a code in `title` and the real subject in `description`:

```json
{ "title": "20/2026 LLM",
  "description": "THE APPOINTMENT OF TWO (2) SERVICE PROVIDERS FOR THE CONSTRUCTION OF ROADS…" }
```

Rendering `title` verbatim gives a feed of `CS01/02/26`, `E3445GCDMWP`,
`RFQ 2027/65` — useless. `deriveTitle()` detects code-shaped strings and falls
back to the first sentence of the description, then truncates on a word
boundary so cards don't overflow.

### 4.2 ALL-CAPS text

Much of the feed shouts. `normaliseCase()` converts to sentence case while
restoring SA procurement acronyms (CIDB, B-BBEE, SBD, GRAP, ESKOM, POPIA…) and
leaves genuinely mixed-case text alone.

### 4.3 No monetary value **anywhere**

`TenderOut` has no `value`/`amount`/`budget` field — the eTenders feed simply
doesn't publish one. So:

- `valueCents` is always `null` → the UI shows **"Not disclosed"**.
- Sorting by value degrades to `newest` instead of erroring.
- The value range slider from the mockups is not wired up.

Fabricating an amount next to a real tender would be the single most dangerous
thing this app could do, so nothing invents one.

### 4.4 Province missing on 59% of records

`deriveProvince()` uses the explicit field, then falls back to recognising ~90
municipalities and metros (eThekwini → KwaZulu-Natal, Mbombela → Mpumalanga,
Sol Plaatje → Northern Cape). If nothing matches it returns `null` and the UI
says **"Location not specified"** — a wrong province is worse than a missing
one, because contractors filter on it.

`"National"` is treated as a scope, not a province.

### 4.5 Taxonomy mismatch

Upstream has 17 categories (`Civil Works`, `Supplies`, `Medical`, `Vehicles`,
`Training`…) that don't match the app's original 12. `CATEGORY_MAP` maps them
onto the design system's badges; unmapped values fall back to `Other`, which
was added to the domain enum along with the `National` province.

### 4.6 Document filenames are URL fragments

```
Download?blobName=4b612923-…&downloadedFileName=TENDER%20ADVERT%2020-2026.pdf
```

`cleanDocumentName()` extracts and decodes `downloadedFileName`, so the UI
shows `TENDER ADVERT 20-2026 CONSTRUCTION OF ROADS.pdf`.

### 4.7 `Intl` renders "Sept", not "Sep"

Node's full-ICU gives `Sept` for **both** `en-GB` and `en-ZA`; browser Chromium
gives `Sep`. Once dates began formatting on the server this became a real
hydration mismatch. `format.ts` now uses hardcoded month tables — the only way
to keep server and client byte-identical. There is a regression test for it.

### 4.8 Other upstream quirks

- `limit` is capped at **100** (422 above that) — clamped in the client.
- Valid `sort` values are only `newest|closing|updated|relevance`; anything
  else is a 400. `relevance` is downgraded to `newest` without a search term.
- `submission_method` is null on 100% of records — not surfaced.
- Contact details aren't in the feed — that section was removed rather than
  left as an empty shell.

---

## 5. Graceful degradation

`src/lib/tenders.ts` falls back to fixtures when the key is missing or upstream
fails, and the UI **says so** via `DataSourceNotice` rather than passing sample
data off as live:

| Condition | Behaviour |
|---|---|
| No `TENDERBASE_API_KEY` | Mock data + "TENDERBASE_API_KEY not set" |
| Cold start / timeout (>45s) | Mock data + "service is waking up" |
| 401 / 403 | Mock data + "rejected the API key" |
| 404 on detail | Real Next.js `notFound()` → 404 page |

The instance sleeps on Render's free tier, so **the first request after idle
can take ~25 seconds**. The client allows 45s before falling back.

---

## 6. Verifying

```bash
npm test          # 15 unit tests, incl. adapter tests on real payloads
npm run dev
./smoke-test.sh   # 21 assertions
```

The smoke test asserts the integration specifically:

```
Live data integration:
  ok    Live source reported            "source":"live"
  ok    Real organisations shown
  ok    Search hits full corpus
  ok    Category filter applies

Data-quality guarantees:
  ok    No raw reference-code titles
  ok    Absent value = Not disclosed
  ok    Dates use Sep not Sept
  ok    API key not leaked to client
```

Check the raw upstream directly:

```bash
curl -H "X-API-Key: $TENDERBASE_API_KEY" \
  "https://tenderbase-api.onrender.com/api/v1/tenders?limit=2" | jq
```

---

## 7. Not yet wired

These endpoints exist upstream but need Supabase auth first, since they're
per-user and keyed by `client_id`:

- `POST/GET /notifications/saved` — saved tenders (currently local state only)
- `POST /notifications/register-device` — FCM push, for the Capacitor build
- `GET/PUT /preferences` — category/province notification preferences
- `GET/POST /saved-searches` — saved searches with alerts

The AI screens (`/summary`, `/match`, `/briefing`) still use fixtures — this
API has no AI layer. Wiring them means running RAG over the document URLs the
feed provides, which is a separate service.
