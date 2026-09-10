# TenderBase — Billing, Trials & Onboarding (U8)

How Pro is sold, what the server owns, and what to do before money can move.

This is the release note for the U8 arc: PayFast integration, server-verified
entitlement, embedded checkout, cancellation, and the first-run Basic/Pro
decision. Companion docs: `AUTH-INTEGRATION.md` (Google sign-in),
`SETUP.md` (running and testing), `.env.example` (every env var).

---

## 1. What ships

| Phase | Commit | What it added |
|---|---|---|
| U8-A | `2dd4a80` | PayFast signing/ITN core (`lib/payfast.ts`), billing tables (`0006`), checkout + ITN routes |
| U8-B | `04ca45d` | Server-verified entitlement: the subscription row is the truth (`lib/entitlement.ts`), one trial per account (`0007`) |
| U8-C | `c25f295` | Embedded PayFast checkout, plan management screen (`/pro/plan`), cancellation via the Recurring Billing API |
| U8-D | `a583c28` | First-run Basic/Pro decision (`/welcome`, `0008`) |
| U8-E | this release | Verification pass, cookie-grant hole closed, this document |

**The one-line model:** Pro comes from `billing_subscriptions` (or an unexpired
trial on that row) and from nothing else. The browser can ask, never grant.

- Free = guest. Basic = signed-in, free. Pro = paid or trialling.
- Browsing the full tender catalogue is free at every tier — Pro sells depth
  (AI summaries, all matches, push, all news), never access.

---

## 2. Before it can move money

### 2.1 Run the migrations

Supabase → SQL Editor, in order. All are safe to re-run.

| File | Why |
|---|---|
| `0003_saved_searches.sql` | account-tenanted saved searches |
| `0004_news_bookmarks.sql` | account-tenanted news bookmarks |
| `0005_alert_settings.sql` | per-account alert switches |
| `0006_billing.sql` | `billing_payments`, `billing_subscriptions` — **read-own RLS, no client write policy** |
| `0007_billing_trials.sql` | `trial_ends_at` / `trial_used_at`, `'trialing'` status |
| `0008_onboarding.sql` | `user_onboarding` — the first-run choice (needs `0001` for its trigger function) |

Nothing breaks if they are missing: every billing surface reports
"not configured" and the plan screen says payments are off. That is the
designed behaviour, not a fallback to paper over.

### 2.2 Environment variables

```bash
PAYFAST_MERCHANT_ID=10000100          # PayFast dashboard → Settings
PAYFAST_MERCHANT_KEY=46f0cd694581a    # (sandbox: sandbox.payfast.co.za)
PAYFAST_PASSPHRASE=<your salt>        # REQUIRED — see below
PAYFAST_SANDBOX=true                  # false in production
SUPABASE_SERVICE_ROLE_KEY=<key>       # ONLY writer of billing rows; server-side
NEXT_PUBLIC_SITE_URL=https://your-domain.example  # return/cancel/notify origin
```

- **The passphrase is not optional.** PayFast requires it for subscription
  payment signatures *and* for every Recurring Billing API call (cancellation).
  Set it in the PayFast dashboard and here, or signatures and ITNs will be
  rejected.
- **`SUPABASE_SERVICE_ROLE_KEY` is the only billing writer.** RLS grants
  authenticated users `select` on their own rows and nothing else — there is no
  insert/update/delete policy on either billing table. A client cannot fabricate
  a subscription, a payment or a trial.
- `notify_url` is sent per transaction, so there is nothing to configure in the
  PayFast dashboard for ITNs.

### 2.3 Sandbox test drive

1. Set `PAYFAST_SANDBOX=true` and the sandbox merchant credentials.
2. Sign in, open **Pro**, subscribe to monthly Pro; pay with PayFast's sandbox
   card. The modal opens inside the app; if its script is blocked the browser
   falls back to the hosted PayFast page.
3. Watch the ITN land: `POST /api/billing/itn` returns 200 only after the
   signature, merchant, amount-vs-our-own-row, status and a server-to-server
   `/eng/query/validate` confirmation all pass. Anything else gets a non-200 so
   PayFast retries (400 is never returned for a valid-looking payment).
4. Pro unlocks on the next render; `/pro/plan` shows the invoice row.
5. Cancel from `/pro/plan`: PayFast is called first, and `cancel_at_period_end`
   is only recorded once PayFast answers `true`. Pro continues to the end of the
   paid period.

Local ITNs need a public URL — use a tunnel (ngrok/Expose) and put it in
`NEXT_PUBLIC_SITE_URL`.

---

## 3. What a customer can do

| Flow | Where | Notes |
|---|---|---|
| First-run choice | `/welcome` (after sign-in) | Basic is one tap; Pro offers the trial, then checkout, or says plainly that nothing can be sold on this deployment |
| Start the trial | `/welcome`, Pro screen, any locked feature | One per account, ever. Server-written; browser cannot grant or extend it |
| Subscribe | Pro pricing card, `/pro/plan` | Embedded PayFast modal; hosted form as fallback |
| Cancel | `/pro/plan` | Stops future debits at PayFast; access runs to period end |
| End the trial early | Pro screen, `/pro/plan` | Immediate drop to Basic |
| Invoices | `/pro/plan` | Read with the user's own client, so RLS scopes every row |

Locked features never dead-end: the upgrade sheet explains, prices, offers the
trial and links to the plan screen.

---

## 4. Invariants (what a reviewer should be able to falsify)

1. **No client-supplied money.** Routes read a plan *id*. Amounts, frequency and
   currency come from `PLANS` in `lib/payfast.ts`, on the server.
2. **The signing key never leaves the server.** Both checkout paths are built
   server-side (`lib/billing.server.ts`); the browser receives a form or a
   payment identifier.
3. **The cookie tier is preview-only.** `previewGrantAllowed()` — the cookie is
   consulted only where no account store exists or a dev auth bypass is on. On a
   configured deployment a signed-out visitor is `guest`, so `tb_tier=pro` typed
   into devtools unlocks nothing (`/api/news` rail 403, custom feed 403).
   *(Found and fixed during the U8-E verification pass.)*
4. **One trial per account.** `trial_used_at` is checked and written server-side;
   the API refuses with 409 for a used trial or an existing subscription.
5. **No fabricated subscriptions.** A missing table, a missing row, a failed
   lookup or an RLS denial all resolve to Basic.
6. **Nothing claims success early.** After payment the client shows
   "confirming payment", refreshes the server, and lets the ITN be what unlocks
   Pro.
7. **Unconfigured means unconfigured.** `POST /api/billing/{checkout,onsite,cancel}`
   → 503 `billing_not_configured`; `POST /api/billing/trial` → 401 without a
   session; the UI says payments are off instead of showing a dead button.
8. **The ITN source check is advisory.** PayFast's four hosts are resolved and
   compared, and a mismatch is logged — never a rejection, because signature,
   our own amount row and PayFast's confirmation are what decide, and a proxied
   IP must not bin a real payment.

---

## 5. Verifying a release

```bash
npm ci
npm run typecheck      # tsc --noEmit
npm run test           # 233 unit tests, no network
npm run build          # production build; /pro/plan and 5 billing routes listed
npm run smoke          # 28 route/API checks against a running dev server
```

The unit suite covers the parts a sandbox cannot fake: signature generation
(payment and API formats), PHP-style urlencoding, field order, the ITN
accept/reject matrix, amount parsing, period maths, entitlement derivation and
the offer matrix. The smoke suite covers routes, live-data honesty and the
first-run screen.

**What this cannot prove without credentials:** a real card payment, a real
ITN delivery, and a real cancellation. Those need a sandbox PayFast account and
a public tunnel; the code paths are covered by unit tests and review, not by a
live transaction.

---

## 6. Deliberately not built (yet)

- **PayFast Subscriptions API beyond cancel** — pause/unpause/update are
  implemented in neither UI nor server. Cancellation is the promise we make.
- **Billing for Basic** — Basic is the signed-in free tier by design.
- **Invoice PDFs** — PayFast emails the receipt; our list is our own record.
- **Downstream renewal ITNs** — a renewal ITN is matched by `token` and recorded;
  a failed payment does not yet email the customer.
- **Card capture in our own UI** — PayFast's modal renders the card form; we
  never touch card data.
