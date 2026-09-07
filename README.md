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

`getStatus()` in `lib/format.ts` computes status from `closingDate` alone, so
the badge, the deadline pill and the accent bar can never disagree with each
other or go stale in cache.

---

## Data layer

`types/tender.ts` is the single source of truth. Note:

- **`valueCents: number | null`** — integer cents avoids float rounding on
  currency; `null` means the organisation withheld the value (common in SA
  tenders) and renders as "Not disclosed", never "R0".
- **`TenderWithUserState`** extends `Tender` with `isSaved`, so
  unauthenticated endpoints can return the base type safely.

`lib/api.ts` calls Next route handlers under `/api/*` rather than the upstream
API directly, keeping `TENDERBASE_API_KEY` off the device. Components currently read `lib/mock-data.ts`; swapping in `tenderApi` requires no prop changes.

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
- Status is never conveyed by colour alone — every badge has a text label.
- Tender titles wrap rather than truncate.
