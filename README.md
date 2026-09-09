# TenderBase

South African tender discovery and intelligence platform.
Mobile-first Next.js app, packaged for Android with Capacitor.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Supabase · lucide-react

```bash
npm install
cp .env.example .env.local   # fill in Supabase + TenderBase API keys
npm run dev                  # http://localhost:3000
npm run build && npm run typecheck
```

---

## Architecture

```
src/
├─ app/
│  ├─ layout.tsx              root: fonts, viewport, safe-area
│  └─ (app)/                  authenticated shell (tab bar / sidebar)
│     ├─ page.tsx             dashboard
│     ├─ search/ saved/ alerts/ profile/ briefing/
│     └─ tenders/[id]/        detail
├─ components/
│  ├─ ui/                     design-system primitives
│  ├─ tender/                 TenderCard, CompactTenderCard
│  └─ nav/                    BottomNavigation
├─ lib/                       cn · format · api · supabase · mock-data
└─ types/tender.ts            the API contract
```

### Design tokens

All colour, type, radius and shadow values live in `tailwind.config.ts`.
Never hardcode a hex value in a component.

Colour communicates **status**, not decoration:

| Token | Meaning |
|---|---|
| `navy` | brand, primary actions |
| `open` (green) | accepting submissions |
| `soon` (amber) | closing within 7 days |
| `urgent` (red) | closing within 2 days / expired |

### Status is derived, never stored

`getStatus()` in `lib/format.ts` computes status from `closingDate`, so the
badge, the deadline pill and the accent bar can never disagree with each other
or go stale in cache. The one override is an upstream `cancelled` lifecycle,
which outranks the date: see `API-INTEGRATION.md` §4.9.

---

## Data layer

Tenders come from the **TenderBase Ingestion API**
(`https://tenderbase-api-rqrh.onrender.com`) — a public, keyless service over
the National Treasury eTenders OCDS feed. See `API-INTEGRATION.md` for the full
contract, which was established by probing the live service because its
`/docs/json` ships an empty `paths: {}`.

```
src/lib/tender-api.server.ts   HTTP, timeouts, ISR, typed errors   (server-only)
src/lib/adapt.ts               upstream -> domain model            (pure)
src/lib/tenders.ts             what screens call, + offline fallback
src/lib/fixtures/tender-api.ts verbatim captures used offline and by tests
```

`types/tender.ts` is the domain model and the single source of truth for
components. `types/api.ts` is the wire contract; **nothing outside `adapt.ts`
may import it**. That boundary is what stops upstream churn from rippling
through thirty components.

Things worth knowing:

- **`valueCents: number | null`** — integer cents avoids float rounding on
  currency; `null` means the value was withheld and renders as "Not disclosed",
  never "R0". The feed carries no money at all, so it is always `null` and
  nothing fabricates one.
- **Two taxonomies.** Upstream publishes 62 categories; the design system has 13
  badge groups. `category` is the mapped group, `categoryRaw` the verbatim
  upstream name — which is what `?category=` filters on. Sending a group name
  matches zero rows.
- **Exact names, not slugs.** `province` and `category` are matched verbatim
  (`KwaZulu-Natal`, not `kwazulu-natal`). The API silently ignores unknown
  params, so a wrong value returns the *entire unfiltered dataset* rather than
  erroring.
- **Status is derived, with one override.** `getStatus()` computes from
  `closingDate`, except that an upstream `cancelled` lifecycle wins — a
  cancelled tender with a future closing date must not read as "Open".
- **`TenderWithUserState`** extends `Tender` with `isSaved`, so unauthenticated
  endpoints can return the base type safely. Upstream always says
  `isSaved: false`; the Supabase layer overrides it.

`lib/api.ts` calls Next route handlers under `/api/*` rather than the upstream
directly. When the service is unreachable the app falls back to real captured
payloads and **says so** via `DataSourceNotice` — never presented as live.

---

## Responsive strategy

One design system, two layouts — no separate desktop redesign:

- `BottomNavigation` is a fixed tab bar on mobile and a `md:` left sidebar.
- Card lists become 2-column grids at `md:`.
- Cards, badges and type scale are identical at both sizes.

## Capacitor (Android)

```bash
# next.config.mjs: uncomment `output: 'export'` and `images.unoptimized`
npm run build
npx cap add android && npx cap sync && npx cap open android
```

Static export requires replacing the dynamic `/tenders/[id]` routes with
client-side fetching, or pre-generating via `generateStaticParams`. Safe-area
insets and `maximumScale: 1` are already handled for the webview.

---

## Accessibility

- Touch targets ≥44px; bookmark buttons carry the tender title in their label.
- Tab bar uses `aria-current="page"`; tabs/toggles expose `aria-pressed`/`aria-selected`.
- Status is never conveyed by colour alone — every badge has a text label, and
  `cancelled` is distinct from `closed` because the two mean different things to
  a bidder.
- Tender titles wrap rather than truncate.
