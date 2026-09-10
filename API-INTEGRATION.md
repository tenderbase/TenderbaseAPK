# Live API Integration

The app reads real South African tenders from the **TenderBase Ingestion API**
at `https://tenderbase-api-rqrh.onrender.com`, which ingests and normalises the
National Treasury **eTenders OCDS** feed.

As of 2026-09-08 it serves **411 tenders** (396 active, 9 complete,
3 cancelled) across **10 provinces** and **62 categories**.

> **This replaced a different service.** The previous integration pointed at
> `tenderbased-production.up.railway.app/api/v1`, a snake_case API behind an
> `X-API-Key`. That service is retired and nothing in `src/` references it —
> `npm test` fails if a reference comes back. The two APIs share almost no
> surface: different host, no `/api/v1` prefix, no key, camelCase payloads,
> different endpoints, different filter vocabulary.

---

## 1. Setup

```bash
cp .env.example .env.local
npm install && npm run dev
```

```bash
TENDERBASE_API_URL=https://tenderbase-api-rqrh.onrender.com   # optional; this is the default
```

**No API key.** Every endpoint was verified unauthenticated. `TENDERBASE_API_KEY`
is still read and sent as `X-API-Key` *if* it is set, so that turning auth on
upstream later is an environment change rather than a code change — but nothing
requires it, and no screen is gated on it any more.

`src/lib/tender-api.server.ts` still imports `server-only`. That is no longer
about protecting a key; it keeps upstream concerns out of the client bundle and
out of the Capacitor APK, and it makes `TENDERBASE_ADMIN_SECRET` (used by the
Supabase admin paths) unreachable from a `'use client'` file.

Optional:

| Variable | Effect |
|---|---|
| `TENDERBASE_FIXTURES_ONLY=true` | Skip the network entirely and serve `src/lib/fixtures`. For CI, offline dev and sandboxes with no egress. |
| `TENDERBASE_API_TIMEOUT_MS` | Default `20000`. Render's free tier cold-starts; raise it if you see spurious timeouts. |

---

## 2. Architecture

```
Browser / APK
    │  (relative URLs only)
    ▼
Next.js server  ── src/app/api/*              route handlers (proxy)
    │            ── src/lib/tenders.ts         data access + fixture fallback
    │            ── src/lib/adapt.ts           anti-corruption layer
    ▼            ── src/lib/tender-api.server.ts
tenderbase-api-rqrh.onrender.com
    ▼
National Treasury eTenders (OCDS)
```

Screens are **server components** that call `src/lib/tenders.ts` directly, so
the first paint already contains data. The `/api/*` handlers exist for
client-side and native consumers.

| File | Responsibility |
|---|---|
| `src/types/api.ts` | Wire types — camelCase, exactly what the service returns |
| `src/lib/tender-api.server.ts` | HTTP, timeouts, ISR caching, typed errors |
| `src/lib/adapt.ts` | Upstream → domain model. Every messy-data defence lives here |
| `src/lib/tenders.ts` | What screens call. Query translation + fixture fallback |
| `src/lib/fixtures/tender-api.ts` | Verbatim captures used offline and by the tests |
| `src/app/api/*` | JSON proxy for client-side consumers |

Keeping `adapt.ts` as a hard boundary means an upstream field rename touches one
file, not thirty components.

---

## 3. Establishing the contract

`/docs/json` returns an OpenAPI document with **`"paths": {}`** — the Swagger UI
literally says "No operations defined in spec!". There is no schema to generate
types from, so the contract below was established by probing the live service,
and every claim is reproducible.

The most useful trick: `/tenders` validates its query with Zod and returns the
whole enum on a bad value.

```bash
curl -s 'https://tenderbase-api-rqrh.onrender.com/tenders?sort=nope'
# {"error":"Invalid query",
#  "issues":["sort: Invalid enum value. Expected 'latest' | 'closing' |
#             'closing_desc' | 'published_asc', received 'nope'"]}
```

Sending deliberately invalid values for ~22 candidate parameter names revealed
which are type-checked at all:

```bash
curl -s '.../tenders?page=x&limit=x&status=x&province=x&closingWithin=x&closingBefore=x'
# {"error":"Invalid query",
#  "issues":["page: Expected number, received nan",
#            "limit: Expected number, received nan",
#            "closingBefore: Invalid datetime"]}
```

`status`, `province` and `closingWithin` produced no issue — the first two are
unvalidated strings, and the third does not exist.

### Endpoints

| Endpoint | Returns |
|---|---|
| `GET /tenders` | `{ results[], total, page, totalPages, source }` |
| `GET /tenders/{id}` | `{ tender, source }` — note the envelope |
| `GET /categories` | `{ categories: [{category, count}], total, source }` — 62 |
| `GET /provinces` | `{ provinces: [{province, count}], total, source }` — 10 |
| `GET /stats` | `{ stats: {…}, source }` |
| `GET /health` | liveness probe |

There is **no** `/tenders/search`, `/tenders/latest`, `/tenders/closing-soon` or
`/tenders/facets`. Search is the `q` param; "latest" is `sort=latest`; "closing
soon" is `sort=closing` plus a date bracket (see 4.2).

### Query parameters for `/tenders`

| Param | Type | Verified |
|---|---|---|
| `page`, `limit` | number | validated; non-numeric is a 400 |
| `q` | string | full-text; matches `description`, case-insensitive |
| `province` | string | exact display name. `Gauteng` → 96 of 411 |
| `category` | string | exact upstream name. `Construction` → 18 of 411 |
| `status` | string | `active` → 396, `complete` → 9, `cancelled` → 3 |
| `sort` | enum | `latest` \| `closing` \| `closing_desc` \| `published_asc` |
| `closingBefore`, `closingAfter`, `publishedAfter` | datetime | validated ISO |

**Silently ignored** (verified: the total stays at 411):
`closingWithin`, `hasDocuments`, `has_documents`, `organisation`, `municipality`,
`search`, `closing_within`. Unknown keys are dropped rather than rejected —
`?definitelyNotAParam=1` returns the full dataset. That is the dangerous
property: **a misspelled filter looks like it worked** and quietly returns
everything. `buildApiQuery()` in `tenders.ts` is the only place params are
emitted, and a test asserts no ignored name is ever sent.

### Sort semantics

`sort=closing` is **ascending over every record including long-closed ones**, so
the first page is nothing but expired tenders. A "closing soon" query must
combine it with `closingAfter=<now>`:

```bash
curl -s '.../tenders?sort=closing&closingAfter=2026-09-08T22:00:00Z&limit=3'
```

---

## 4. Data-quality problems found, and how they're handled

### 4.1 `title` is a reference code — still the biggest issue

```json
{ "title": "NB096",
  "description": "Request for quotation : Physical security at Lilani Hot springs in KZN" }
```

All eight sampled records put a code in `title` (`RFQ12214 RE-ISSUE`,
`ZNQ59/26/27`, `ORTIA8286/2026/RFP`, `SPU/B/WKLF/032/26`…). `deriveTitle()`
detects code-shaped strings and uses the description instead.

Two feed quirks make that non-trivial, both handled:

- **The description repeats the code.** Record 169397's description *starts*
  with `SPU/B/WKLF/032/26: SUPPLY, DELIVER AND INSTALLATION…`, so the derived
  title would lead with the code we just rejected. `stripLeadingReference()`
  removes it.
- **Boilerplate prefixes.** `Request for quotation : Stationery` becomes
  `Stationery`. The threshold for accepting a derived subject is deliberately
  low (>3 chars) because that record's entire subject is one word — an earlier
  >10 threshold silently fell back to showing `NB050/2026`.

### 4.2 ALL-CAPS text, and flattened proper nouns

Descriptions arrive shouted. Sentence-casing them naively destroys place names:
`…DESIGN OF FURNITURE AT KING PHALO AIRPORT` → `…at king phalo airport`.
`toSentenceCase()` restores SA procurement acronyms (SITA, RFB, DOD, SAAF,
CIDB, B-BBEE, SBD, NEC3…) *and* a gazetteer of place names and organisations
drawn from the live feed (King Phalo, O.R. Tambo, eThekwini, Pietermaritzburg,
Qumbu, Artscape…). Mixed-case text is left alone — this feed is not uniformly
shouted, unlike the previous one.

### 4.3 No monetary value anywhere

`valueCents` is `null` on every record. It is **passed through, never
fabricated** — the UI renders `null` as "Not disclosed". Fabricating an amount
next to a real tender would be the single most dangerous thing this app could
do. Consequently `sort=value_desc` degrades to `latest` rather than sending a
value the API ignores.

### 4.4 Category taxonomy: 62 → 13

Upstream publishes 62 normalised categories; the app's design system has 13
badge groups. `deriveCategory()` maps between them in two layers:

1. **Exact overrides** for the whole current vocabulary. The `Services:` /
   `Supplies:` / `Disposals:` prefixes are eTenders bucket names that keywords
   cannot recover (`Supplies: Medical` → Healthcare, not Supply & Delivery).
2. **Keyword rules** for anything new, so an added upstream category degrades
   to a sensible group instead of silently becoming `Other`.

One bucket is genuinely ambiguous and is split by subject text rather than
guessed:

```
Services: Functional (Including Cleaning and Security Services)   → 18 records
```

Record 169450 is *physical security* and carries it; another might be cleaning.
`deriveCategory(category, subject)` reads the tender's own text, so 169450 maps
to Security.

The verbatim upstream name is preserved as `categoryRaw` — that is what the API
filters on and what the detail screen shows.

### 4.5 Province is now reliable

Unlike the previous feed (59% null), this one populates `province` with the
exact display name, and the 10 values match our `PROVINCES` enum precisely —
including `National` (45 records), which is a real scope rather than an unknown.
It is preserved as `National`, not discarded.

### 4.6 `location` is a raw address, too long for a card

```
King Shaka International Airport - La Mercy - Durban - 4000
191 Prince Alfred Street - Pietermaritzburg - Pietermaritzburg - 3201
DITHOLO WWTW-25'19'56.01"s,28'19.06.99"E - HAMMANSKRAAL - PRETORIA - 0002
```

`deriveCity()` splits on ` - `, drops the trailing postal code and takes the
last remaining segment (the city/metro), then title-cases it. Cards get
`Durban, KwaZulu-Natal`; the detail screen keeps the verbatim string as
`locationFull`. A GPS-coordinate segment is detected and rejected rather than
rendered as a city.

### 4.7 Documents: MIME strings and zero sizes

`fileType` is an uppercased MIME type — `APPLICATION/PDF`,
`APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDDOCUMENT`. The UI wants
`PDF` / `DOCX`, so `deriveFileType()` maps known MIME types and falls back to
the filename extension.

`sizeBytes` is `0` on every document. It is left as `0` rather than invented;
the detail view already suppresses the size line when falsy.

Filenames arrive clean now (the previous feed sent
`Download?blobName=…&downloadedFileName=X.pdf` fragments), so the URL-fragment
decoding is gone.

### 4.8 Contact details exist now

The previous feed had none, so the adapter hardcoded `contactInformation: null`
and the detail screen had no contact section. This one supplies them twice —
nested under `contactInformation` and repeated as flat `contactName` /
`contactEmail` / `contactPhone`. `adaptContact()` prefers nested, falls back to
flat, and returns `null` (not a row of empty strings) when there is genuinely
nobody to contact. The detail screen renders the section only when present, with
`mailto:` and `tel:` links.

### 4.9 `status` can contradict the closing date

`status` is a lifecycle state (`active` / `complete` / `cancelled`), and the
sample contains `complete` records. A **cancelled tender whose closing date is
still in the future** would render as "Open" under pure date derivation — and a
bidder would spend real money preparing a response to it.

`getStatus()` therefore takes both inputs: `cancelled` → `cancelled`,
`complete` → `closed`, otherwise derive from `closingDate`. `cancelled` is a new
`TenderStatus` with its own badge, and `formatDeadline()` reports "Cancelled"
instead of a countdown. An unrecognised lifecycle value degrades to date
derivation rather than throwing.

### 4.10 `Intl` renders "Sept", not "Sep"

Node's full-ICU gives `Sept` for **both** `en-GB` and `en-ZA`; browser Chromium
gives `Sep`. Once dates format on the server this is a hydration mismatch.
`format.ts` uses hardcoded month tables — the only way to keep server and client
byte-identical. Regression-tested.

---

## 5. Graceful degradation

`tenders.ts` falls back to `src/lib/fixtures/tender-api.ts` when the service is
unreachable, and the UI **says so** via `DataSourceNotice`.

The fallback is **real data**: verbatim payloads captured from the live API on
2026-09-08, run through the same `adapt.ts` code path as live rows. Not
invented fixtures — a synthetic sample would hide exactly the mapping bugs the
adapter exists to handle. `fixturePage()` even applies the current query,
province, category and status filters to the captures, so search and chips still
behave offline.

| Condition | Behaviour |
|---|---|
| Network error / DNS / no egress | Fixtures + "Could not reach the tender service. Showing 8 tenders captured from the live API on 2026-09-08." |
| Cold start / timeout (>20s) | Fixtures + "The tender service is still waking up…" |
| 400 invalid query | Fixtures + the upstream `issues[]` verbatim, so the bug is visible |
| 200 with the wrong envelope (`results[]` / `tender{}` / `categories[]` missing) | Rejected as an upstream error — never served as a confident live-empty catalogue. This is how a stale `TENDERBASE_API_URL` (still pointing at the retired host) surfaces. |
| 404 on detail | Real Next.js `notFound()` → 404 page, but only when `/stats` proves the upstream holds the live dataset — otherwise the browser resolves the id directly instead of a false 404 |
| `TENDERBASE_FIXTURES_ONLY=true` | Fixtures immediately, no network attempt |
| Any of the above, but the **browser** can reach the API | Live rows, labelled "fetched directly from the tender service in your browser" (see §5.1) |

Responses are cached with ISR (`revalidate: 300`; categories/provinces `86400`).

### 5.1 Browser-direct fallback

A fixture or outage state means *our server* could not reach the API — it does
not mean the API is down, and on some networks it is not even our server's
network that matters: sandboxed preview hosts and corporate proxies allowlist
egress per host, while the end user's browser can reach anything.

The ingestion API is public, keyless and sends `Access-Control-Allow-Origin: *`,
so when the server answer is `fixture` or `error` the app retries the **same
query** from the browser against `NEXT_PUBLIC_TENDERBASE_API_URL` (defaults to
`TENDERBASE_API_URL`):

- `lib/tender-query.ts` — the query translation both paths share, so the retry
  asks for exactly what the server would have asked for. A test asserts the two
  URLs are identical in shape.
- `lib/tender-direct.ts` — the browser client. 15s timeout (shorter than the
  server's 20s, so the waits are not stacked), no credentials, failures mapped
  to `UPSTREAM_TIMEOUT` / `NETWORK_ERROR` / `HTTP_ERROR`.
- `lib/api.ts` — transparent retry for client-side callers (`tenderApi.list`,
  `getById`, `facets`, `stats`). If the retry fails, the server's original
  answer is returned unchanged: an outage is never dressed up as success.
- Dashboard, search and the tender detail page resolve their server-rendered
  props the same way. Detail is the important one: without it, every row from a
  browser-fetched list would 404, because the server holds no copy of that id.

Provenance travels with the data (`via: 'browser'`), and `DataSourceNotice`
renders an informational line instead of staying silent — live data must never
be silently relabelled, and the direct path must never be mistaken for a
server fetch. Disable with `NEXT_PUBLIC_TENDERBASE_DIRECT_FALLBACK=false`.

This is a fallback, not the primary path: when the server can reach the API
(normal deployments) nothing changes, ISR still does the caching, and the
browser makes no extra request.

Refresh the captures after an upstream change:

```bash
BASE=https://tenderbase-api-rqrh.onrender.com
curl -s "$BASE/tenders?limit=8"   > /tmp/tenders.json
curl -s "$BASE/categories"        > /tmp/categories.json
curl -s "$BASE/provinces"         > /tmp/provinces.json
curl -s "$BASE/stats"             > /tmp/stats.json
# then update src/lib/fixtures/tender-api.ts
```

---

## 6. Verifying

```bash
npm test          # 251 tests
npm run typecheck
npm run build
./smoke-test.sh   # route + integration assertions against a running server
```

The tests import the **real** TypeScript modules. `npm test` registers a small
resolver (`src/lib/__tests__/resolver.mjs`) so the `@/*` alias works under
`node --test`, and passes `--conditions=react-server` so the `server-only`
marker resolves to its empty implementation instead of throwing.

That replaced hand-copied mirrors of the source, which had already drifted:
`format.test.mjs` asserted `getStatus(iso, now)` while the module took
`getStatus(tender, now)`, so it was testing a signature nothing in the app
calls. A mirror is a copy nothing forces anyone to update.

Coverage that matters here:

- all 62 upstream categories map to a valid app `Category`
- every reference-code title in the sample is replaced, none leaks a code
- province/category/status filters use exact names — and the **old slugs return
  zero rows**, which is the bug this rewiring fixed
- `closingAfter=now` is always sent with `sort=closing`
- no ignored param (`closingWithin`, `hasDocuments`, …) is ever emitted
- the retired Railway host appears nowhere in `src/`

Check the raw upstream directly:

```bash
curl -s 'https://tenderbase-api-rqrh.onrender.com/tenders?province=KwaZulu-Natal&limit=2' | jq
curl -s 'https://tenderbase-api-rqrh.onrender.com/stats' | jq
```

---

## 7. Not yet wired

- **Saved tenders.** The API returns `isSaved: false` for everything — it has no
  concept of our Supabase user. `adaptTenderWithState()` accepts a state
  override so the Supabase layer can fill it in, but `/saved` still renders the
  synthetic fixtures in `lib/mock-data.ts` and bookmark toggles are local
  component state. This is the last consumer of that file.
- **Preferences → query.** `toQueryParams()` pushes only `province` and
  `closingAfter`. It cannot push `category`: our 13-value taxonomy is a
  *grouping* of 62 upstream names and `/tenders` accepts exactly one. Sending
  `IT & Technology` matches zero rows. Fixing this properly means storing
  upstream category names in preferences (a Supabase migration).
- **`requireDocuments`.** No documents filter exists upstream; it is applied
  client-side and documented as such in the UI.
- **Alerts and the weekly briefing** still render hardcoded arrays — this API
  has no notification or AI layer.
- **Push notifications / saved searches.** Not offered by this service.
