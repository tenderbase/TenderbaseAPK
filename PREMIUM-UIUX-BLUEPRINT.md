# TenderBase — Premium SaaS UI/UX Blueprint

**Status:** Design blueprint (v0.1) — no code to be written until approved screen-by-screen.
**Model:** Free to browse → sign in for Basic (free account) → Pro subscription unlocks all features.
**North star:** "Decision-grade tender intelligence, delivered like a premium product." Every pixel should make the user feel the data is worth paying for.

---

## 1. Commercial model & tier architecture

| Tier | Who | Cost | Core promise |
|---|---|---|---|
| **Free (Browse)** | Guests, no account | R0 | Full catalogue of live tenders — search, browse, view details & documents. See *what* exists. |
| **Basic** | Signed-in users | R0 | Personal workspace: business profile, AI matching preview, saved tenders & searches, in-app alerts, limited AI summaries, core news feeds. See *what matters to me*. |
| **Pro** | Subscribers | R249/mo or R1 999/yr (14-day trial; launch promo) | Everything unlocked: unlimited deep-AI summaries, full Today's Matches with reasons, push notifications & alert rules, all news feeds + AI relevance, exports, market insight. See *what to do about it*. |

Future tiers (roadmap only): **Team** (seats, shared saved lists, org analytics) and **Enterprise** (API, SSO, SLA).

### Entitlement matrix (single source of truth for UI gating)

| Feature | Free (guest) | Basic (account) | Pro (paid) |
|---|---|---|---|
| Search & browse full live catalogue | ✅ | ✅ | ✅ |
| Tender detail, documents, deadlines | ✅ | ✅ | ✅ |
| Business profile (company, sectors, provinces, CIDB, B-BBEE, tax) | — | ✅ (1 profile) | ✅ + completeness coaching |
| Saved tenders | — | 50 | Unlimited |
| Saved searches | — | 3 | Unlimited |
| AI **Quick summary** (title → bullet summary) | 2/month teaser | 10/month | Unlimited |
| AI **Deep summary** (requirements, eligibility flags, risk flags, benchmarks) | 🔒 | 🔒 (first one free as demo) | ✅ |
| **Today's Matches** (AI score vs business profile) | 🔒 teaser carousel | Top 3/day, no reason breakdown | Unlimited + match reasons + trend |
| In-app notifications (matched, closing soon, addenda) | — | ✅ | ✅ |
| Push notifications | — | Saved/closing only | Full rules engine, instant match push, quiet hours |
| Email digest | — | Weekly | Daily + Weekly, custom |
| News feed (RSS) | Business top stories | 3 categories | All categories + custom RSS + "relevant to me" AI ranking |
| Addenda / award-change watch | — | In-app | Push + email |
| Export (CSV / PDF shortlist, calendar .ics) | — | — | ✅ |
| Market pulse (volume by province/category, award insights) | — | 7-day view | Full history |
| Organisation watch (track issuers & competitors) | — | 1 | 10 |
| Deadline calendar sync | — | — | ✅ |
| Support | Help centre | Email | Priority chat |

**Rule:** nothing is *removed* between tiers — higher tiers add depth. Free never shows ads; Pro is sold on intelligence, not on removing pain.

---

## 2. Design principles

1. **Calm density, decision clarity.** One hero metric per card. Data first, chrome last.
2. **Intelligence is the product.** AI output always framed as *evidence + reasons* (score ring with chips, summary bullets with source lines), never a black box.
3. **Honest gating.** A locked feature is clearly labelled and one tap from unlock. No fake "loading", no silent truncation. Free quota meters are always visible before the limit.
4. **Time is the emotion.** Deadlines are the app's heartbeat: every surface speaks in "today / tomorrow / in X days", never cold dates alone.
5. **Mobile-first premium.** Thumb-zone actions, 44px targets, bottom sheets over modals, haptics on state changes.
6. **Consistency as luxury.** One radius scale, one elevation system, one motion curve, one component kit — no bespoke screens.

---

## 3. Visual identity system

### Palette (semantic tokens — maps to current Tailwind tokens)

| Token | Colour | Use |
|---|---|---|
| `ink` / `ink-2/3` | Deep navy-slate scale | Text hierarchy |
| `navy` (brand) | #16233F base | Primary actions, active states |
| `blue` | Electric SA-blue | Links, info, AI accents |
| `signal` (new) | Emerald #0E9F6E | Money/opportunity, "Live", savings, open tenders |
| `amber` | Deadline / closing soon | Urgency tier 2 |
| `red` | Urgent, cancellation, limit-hit | Urgency tier 1 |
| `gold` (new, sparse) | #C9A227 | **Pro** branding — badges, crowns, upgrade CTAs only |
| Surfaces | White → `canvas` → elevated cards | Layered quiet depth |
| Dark mode | Navy-900 bg, soft ink text | Free feature, first-class, auto by system |

Rule: gold means *money/premium*. Nothing else uses gold. Red is reserved for real urgency — never decoration.

### Type & shape
- Typeface: **Inter (or Geist)** variable — keep system-first for APK weight; display sizes tracking −0.03 to −0.05em.
- Scale: 10/11.5 micro → 13/14 body → 16–18 card titles → 22–28 screen titles → 34–40 hero numerals (score rings, stats).
- Radius: 8 (chips) · 12 (inputs) · 16 (cards) · 20 (sheets/dialogs) · full (pills). One elevation: hairline 1px border + 2-layer soft shadow; pressed = shadow-sm.

### Motion
- 150–200ms ease-out for state; 250–320ms spring for sheets/transitions; skeleton shimmer 1.2s loop.
- Haptic taps on toggle/match/save (Capacitor Haptics); `motion-reduce` respected everywhere.
- Number count-up animation for match scores & stats (300ms).

### Signature premium motifs
- **Score ring** (match %) — the TenderBase signature visual, appears in Matches, Detail, Profile.
- **"Reason chips"** — every AI judgement carries 2–5 labelled chips (*Location · Category · CIDB level · Keywords*).
- **Deadline language** — "Closes today · 16:00", "3 days left" — never "2026-09-21".
- **Live dot** on catalogue counts & feed freshness.
- Pro = crown mark in gold; Basic = none; plan chip in header shows current tier.

---

## 4. Information architecture

### Mobile bottom bar (5 slots — frequency-ranked)

**Guests:** Discover · (locked prompts) — effectively: Discover is home.
**Basic/Pro:** `Today` (matches + brief) · `Discover` (search/browse) · `Saved` (badge count) · `News` (feed) · `Alerts` (bell + unread badge)

- **Account is not a tab.** Avatar in Today's header + drawer ("More") for profile/company/preferences/subscription.
- **Pro hub** reachable everywhere: header crown on Discover/Detail, upgrade sheet from any lock, `+ Pro` pill next to plan chip.
- Back-stack: tabs never push; stack screens (detail, news article, alerts thread) slide in.

### Desktop/tablet (md+)
Left rail: logo · Today · Discover · Saved · News · Alerts · Pro hub (gold, separated) · bottom = plan chip + avatar. Rail collapses to icons at md. Content max-w keeps readable measure. Detail screen becomes 2-column: main content + sticky "decision panel" (score, deadline, actions, AI summary).

### Screen map
```
Onboarding (guest)          — welcome, plan select, Google sign-in
  └ Sign-up flow            — business mini-profile → plan → notifications opt-in
Today (signed-in home)      — morning brief, top matches, deadline radar, news snapshot
Discover                    — search + filters + facets + sort, results
Tender Detail               — hero meta, AI panel, requirements, documents, timeline, actions
Today's Matches (module)    — full ranked list w/ reasons (Pro), quality meter
Saved                       — tabs: Tenders / Searches / Documents / Organisations
News                        — feed w/ category rail, relevance toggle, article view, saved
Alerts                       — inbox grouped: Matches · Tenders · News · System
Account / Profile           — identity, business profile, preference matching
Business Profile            — completeness meter, sectors, provinces, CIDB/B-BBEE/tax
Pro Hub                     — plan comparison, billing, invoices, perks
Settings                    — notifications channels, quiet hours, security, dark mode
```

---

## 5. Screen-by-screen UI spec

### 5.1 Global chrome
- **Header:** contextual title; left = menu (drawer on mobile), right = alert bell (unread dot w/ count) + avatar → Account.
- **Plan chip:** small pill under avatar / in drawer: `Free · Basic · PRO` (gold crown for Pro). Tapping opens Pro Hub or upgrade sheet.
- **Drawer:** Account block (avatar, name, plan), nav groups, tier summary card at bottom for Basic users ("You're 2 steps from unlimited AI summaries").

### 5.2 Onboarding & sign-up (Basic/Pro decision moment #1)
Steps with progress bar + haptics:
1. **Welcome** — one-line value prop + hero score-ring demo animation + plan preview (Free/Basic/Pro).
2. **Google sign-in** (Basic starts here; guests can skip and browse).
3. **Business mini-profile** — 4 fields max (company name, sectors multi-select chips, provinces, CIDB range) + "AI uses this to match tenders — you can refine later". Show live example of a match appearing as they type. (Skip allowed → profile later, nudged.)
4. **Plan pick** — Basic vs Pro (14-day trial). Pro CTA gold; small "Start with Basic, upgrade anytime" text link.
5. **Notification opt-in** — explain value *before* the OS prompt: "Instant push when a tender matches you" → then system permission dialog. Basic gets closing-soon pushes only — copy is honest.
Post-signup: **Today screen first-run** with a 3-card "here's what changed" education overlay.

### 5.3 Today (personalised home, signed-in)
- **Header:** "Good morning, {first name}" + live date + bell + avatar + PRO chip.
- **Morning Brief card** (tap → full briefing): "3 matches · 2 closing this week · 5 saved update" + tiny news line.
- **Today's Matches preview** (the money module):
  - Basic: top 3 match cards w/ **score rings**, no reason chips, locked remainder row: "See all matches + why they match you — Unlock Pro".
  - Pro: up to 10, reason chips on, "match trend" sparkline vs last week.
- **Deadline radar:** saved tenders closing ≤7d in card list w/ countdowns (urgent red, soon amber).
- **News snapshot:** 2 stories "relevant to your sectors" → News.
- **Profile-quality strip** (until 100%): "Your match quality: 64% — add your CIDB grading to sharpen matches" → inline mini-form card (not a separate screen trip).
- Guests: replaced by **Discover-first hero** ("Search 400+ live tenders — no sign-up needed") + catalogue stats + top categories. No fake personalisation, ever.

### 5.4 Discover (search & browse)
- Existing search + quick filters stay; add **facet sheet** (category / province / status / value / closing window / issuing org).
- Result header: live total + "sorted by newest/closing" + view toggle (cards/compact).
- **Match filter chip for signed-in users:** "Matches me (12)" — instant profile relevance filter (Pro = full list, Basic = top 3 w/ upsell).
- **Pro ribbon** on cards that contain Pro-only depth (deep summary, award history) — gold "PRO" micro-badge on the card, not on the list itself.
- Free guest search keeps full results — never artificially thinned; search quality is the free hook.

### 5.5 Tender Detail — the AI showcase screen
Layout (mobile, top→bottom):
1. Sticky mini-bar: back · title · share · save · (Pro crown if unlocked content).
2. Hero: status + category badges, title, issuer, closing **countdown hero card** (navy panel as today: Closing date · Days left · Value) — add "Add to calendar" (Pro) + "View on eTenders".
3. **Match chip row** (signed-in): "92% match for Mkhize Solutions — 3 reasons" → expands reason chips (Pro) or locks (Basic).
4. **AI Summary panel** — THE module:
   - *Basic/Free quota states:* panel header with small meter ("2 of 10 left this month"); body shows first 3 bullet teasers then soft blur + centred lock: "Deep summary: requirements, risks & eligibility — Unlock Pro". "Unlock" → upgrade sheet. Ethics: label everything as preview; never fake-load.
   - *Pro:* **Quick summary** bullets → **Deep analysis** accordion: Key requirements · Eligibility flags (CIDB/B-BBEE/tax checks) · Risk flags (short window, vague scope, addenda history) · Suggested questions to ask issuer · Value context ("similar awards R2–5M").
   - **Ask a follow-up** input (Pro): "Does this need CIDB 7GB?" → answer with sources from the documents.
5. Requirements strip (dates, site briefings, delivery location), contact, documents (inline preview for PDFs), amendments timeline, award history (Pro).
6. Sticky bottom action: Save / Follow (bell — get addenda & deadline pushes) / Share.
7. Guests see the standard detail + an *unlocked* "AI summary" sample with watermark "Sample — sign in free for your own summaries" (never blur real browsing content — only AI depth is gated).

### 5.6 Saved hub
Tabs: **Tenders · Searches · Documents · Organisations** (each with count).
- Tenders: sort (closing first / recently saved), bulk "export shortlist" (Pro), empty state → "Discover tenders".
- Searches: saved query cards w/ match-count badge, toggle "notify me" (in-app Basic / push Pro), "run now".
- 50-cap meter for Basic with one-tap upgrade ("You've saved 48 of 50 — Pro is unlimited").
- Offline-ish: saved tenders cached locally (Supabase) so the tab is instant.

### 5.7 News feed (RSS) — new flagship surface
- **Category rail:** Business · Government · SARS & Tax · Construction · Technology · Finance · Custom (Pro) — horizontally paged, selected state.
- **Curated sources** (SA): SAnews.gov.za, National Treasury, SARS media, eTenders bulletins, EDD/DTIC, industry press — per-category source management (Pro: custom RSS via URL).
- **Card design:** source mark, headline, 2-line dek, time ("2h"), bookmark; tap → reader view (clean typography, no chrome).
- **"Relevant to me" toggle** (signed-in): AI re-ranks feed against profile sectors/provinces ("5 of 20 stories touch Construction in KZN") — Pro beyond 3 categories.
- **Cross-links:** a government story about a new infrastructure fund links to *matching tenders* ("6 tenders in this sector") — news and tenders talk to each other; this is a differentiator.
- **Daily News Brief** push/digest option (Pro).
- Guests: Business + Government top 20, no relevance toggle — enough to prove value.

### 5.8 Alerts centre (in-app notifications)
- **Tabs/grouping:** All · Matches · Tenders · News · System. Unread bubble per group.
- **Notification row:** icon by type (score-ring = match, bell = closing, file = addendum, newspaper = news, shield = system), title, description, relative time, channel glyph (in-app / push / email), deep-link chevron.
- **Priority top:** "Closing today" cluster is pinned & red-tinted — never lost in the list.
- Bulk actions: mark read, mute type, view all from this tender (thread).
- **Empty state (first sign-in):** explains what will appear with 3 illustrative *clearly labelled "example"* rows — then disappears; no permanent fake inbox.
- "Mark all as read" always works (this is a real action or hidden — no dead buttons).

### 5.9 Account / Profile
- Identity block (real from auth), plan chip, edit.
- Stats row **from real data**: saved count, active searches, matches this week.
- Business profile card: name, sectors chips, provinces, CIDB level, B-BBEE level, **completeness ring 0–100%** → tap opens Business Profile.
- Menu rows (only live routes or honest "Coming soon"): Company profile · Tender preferences · Business profile · Saved searches · Subscription & billing (Pro) · Notification settings · Security · Help.
- Sign-out.

### 5.10 Business Profile → match engine
- **Quality meter** ("Match quality 64%") with what's missing: CIDB grading (+12%), 2nd province (+8%), value range (+10%), B-BBEE (+6%) — each row has "+Add" inline.
- Fields validated against real formats (CSD, CIDB, SARS PIN, B-BBEE affidavit) with inline status chips (Valid / Expiring in 60d / Expired → renewal nudge — premium touch: expiry reminders as notifications).
- **Live-match preview** on the right/below: top 3 matching tenders update as the profile changes (the wow moment).

### 5.11 Pro Hub, pricing & paywall system
**Pro Hub (tab/route):**
- If Pro: benefits state — usage this month (summaries used, pushes sent), invoices, plan manage, cancel (with retention copy + downgrade date), perks (early access toggle).
- If not: value story with animated demo (blur → clear on hover/tap), **plan cards**, feature comparison, FAQ, "Start 14-day free trial" (gold), "Start Basic" text link.
- Pricing toggle **Monthly / Annual (save 33%)** with ZAR formatting.
- Trial state everywhere: crown chip shows "Trial · 9d left" with countdown → converts to upgrade.

**Upgrade sheet (bottom sheet, the universal gate):** icon, feature name, 1-line why-it-matters, price line, gold CTA "Unlock with Pro", "Not now". Deep links to the exact screen after upgrade.

### 5.12 Paywall moment map (contextual, honest, capped frequency)
| Moment | Trigger | Pattern |
|---|---|---|
| 4th Basic AI summary this month | meter hits 0 | Sheet w/ count-up "You used 10 of 10" |
| "See all matches" tap | Basic top-3 cap | Sheet (Today's Matches) |
| First reason-chip tap | Basic | Inline blur + lock |
| Enable push for instant matches | Basic | OS-prompt pre-copy + upgrade option |
| 48th saved tender | Basic cap | Meter card on Saved |
| 4th news category | Basic | Category lock chip |
| Add custom RSS | Basic | Lock chip |
| Export shortlist | Free/Basic | Sheet on action |
| Deep summary attempt | Free/Basic | Blurred panel + sheet |
| Trial expiry −3d | Pro trial | Push + banner (gold) |

Frequency rule: max 3 contextual prompts/day/tier-user; all dismissible; never interrupt search flow mid-typing.

---

## 6. Notification & push UX (channel design)

| Event | In-app | Push | Email |
|---|---|---|---|
| New tender matches profile (score ≥ threshold) | ✅ instant | Pro: instant, custom threshold | Pro daily |
| Saved tender closing ≤ 7/3/1 day | ✅ | ✅ (Basic+; Pro w/ time-of-day) | Weekly (Basic) |
| Addendum / document update on saved/followed | ✅ | Pro | Pro |
| Saved-search new results | ✅ | Pro | — |
| Daily News Brief | ✅ | Pro | Pro |
| Award/closed status change on followed | ✅ | Pro | — |
| Profile expiry (tax/CIDB) | ✅ | Pro | ✅ |
| Trial / billing | ✅ | ✅ | ✅ |
- **Permission UX:** first ask at onboarding with value copy; later re-ask only from Settings (never nag).
- **Quiet hours** + "digest instead" per channel (Pro).
- **Deep-link contract:** every notification opens the exact tender/article/saved-search.
- Android channels map 1:1 to these event types (user can mute per channel in OS).

---

## 7. States & feedback kit (design once, reuse everywhere)

- **Skeleton** (matching final layout, shimmer) for Today/Discover/News/Alerts.
- **Empty state** w/ real explanation + one action; demo-only "example" rows allowed *only* in onboarding, always labelled.
- **Error state**: "Couldn't reach the tender service" + retry + offline hint. Never silently serve stale data — a notice banner is shown when data is cached/fallback.
- **Quota state**: meters before limit, sheet at limit.
- **Network change**: offline banner; saved & profile still usable (local cache).
- **Toast/haptics**: save, unsave, copy, summary generated, settings saved.
- **Trial countdown** banner (gold) on Today 3 days before expiry.

---

## 8. New feature ideas worth the roadmap (with tier)

1. **"Ask TenderBase" chat** on any tender or profile (Pro) — follow-up questions grounded in the tender docs.
2. **Bid-readiness checklist** per tender: required docs vs my profile (tax clearance, CIDB, B-BBEE) → auto-generated "packet" (Pro).
3. **Organisation & competitor watch**: track issuers, see their award cadence, get notified (Pro, 10 watchers).
4. **Market pulse**: charts of tender volume/value by category & province, award trends (Pro) — the "Bloomberg-lite" hook for agencies.
5. **Calendar sync**: one-tap .ics per tender + "closing week" feed (Pro).
6. **Team workspaces** (Team tier): shared saved lists, colleague @mentions in notes, roles.
7. **Document OCR/extract**: search inside PDFs of followed tenders (Pro, later).
8. **Weekly PDF report** email (Pro).
9. **Value benchmarks** on detail: distribution of recent award values for similar tenders (Pro).
10. **Tender "health score"**: red flags summary (vague scope, repeated addenda, short window) — sells the AI in one glance (Pro).
11. **Multi-profile matching** for consultancies (Team): one account, several business profiles.
12. **Personalisation opt-in wizard** re-run: "My needs changed" → 1-minute re-profile flow that visibly reshapes Matches.

---

## 9. Design QA checklist (built into every screen review)

- [ ] Tier state defined for Free/Basic/Pro + guest vs signed-in
- [ ] Loading / empty / error / offline / quota states exist
- [ ] No dead buttons (handler or honest "Soon")
- [ ] Deadline shown in human time language; date TZ-correct
- [ ] Touch targets ≥44px; thumb-zone for primary actions; safe-area insets
- [ ] Keyboard/AT: labels, focus rings, aria-pressed/expanded; drawer traps focus
- [ ] Dark mode parity; motion-reduce respected
- [ ] Copy reviewed for honesty (no fake data, no fake loading); gold only for Pro
- [ ] Upgrade prompts: within frequency cap, dismissible, deep-link returns

---

## 10. Delivery roadmap (UI-first — wire code only after each approval)

| Phase | UI deliverables (static screens in app, mock data allowed, labelled) |
|---|---|
| **U1 Design system & shell** | Tokens/palette (incl. signal+gold, dark mode), type scale, component kit updates (chip, card, sheet, meter, score ring, skeleton, PRO badge), nav restructure (Today/Discover/Saved/News/Alerts), drawer w/ plan chip |
| **U2 Tier & entitlement chrome** | Upgrade sheet, lock/blur kit, quota meters, plan chip states, Pro Hub shell, paywall moment placements |
| **U3 Today + Matches UI** | Home redesign, score rings, reason chips, morning brief card, profile-quality strip, guest-home variant |
| **U4 Tender detail AI module** | AI panel (quick/deep/ask), sample-vs-live states, follow-up UI, calendar & follow actions |
| **U5 News feed** | Category rail, source mgmt, article view, bookmarking, relevant-to-me toggle, cross-link cards |
| **U6 Alerts centre + push UX** | Inbox groups, thread view, channel prefs UI, quiet hours, permission-flow copy, empty states |
| **U7 Saved + profile upgrades** | Saved hub tabs & caps, business profile quality meter + live preview, expiry chips |
| **U8 Pricing, billing & onboarding** | Full onboarding flow, pricing screen, plan management, invoices, trial countdown states |

Each phase = reviewable screens in the running app (fixtures mode), no backend wiring yet. Then we wire: entitlements → auth/profile → AI → notifications → news → billing.
