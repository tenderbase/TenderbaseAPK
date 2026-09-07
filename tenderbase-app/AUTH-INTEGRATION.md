# Authentication

Google sign-in via Supabase Auth. Built and wired; **one dashboard setting is still
outstanding** — see "Action required" below.

---

## ⚠️ Action required — `redirect_uri_mismatch`

Clicking **Continue with Google** currently reaches Google and is rejected with:

```
redirect_uri_mismatch
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
```

This is a Google Cloud Console setting, not an app bug. The app correctly asks
Supabase to start the flow, and Supabase correctly redirects to Google with your
client ID — Google just doesn't yet trust the URL Supabase wants to return to.

**Fix (1 minute):**

1. Open **https://console.cloud.google.com** → **APIs & Services → Credentials**
2. Click your **TenderBase Web** OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add exactly:

   ```
   https://kdszzyqptqehuciskjio.supabase.co/auth/v1/callback
   ```

4. Under **Authorized JavaScript origins**, add:

   ```
   http://localhost:3000
   ```

5. Save. Google can take a few minutes to propagate.

Then confirm in **Supabase → Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs** includes: `http://localhost:3000/auth/callback`

### The two callback URLs

The most common mistake. They are different and both are required:

| Registered in | URL | Purpose |
|---|---|---|
| Google Cloud Console | `https://kdszzyqptqehuciskjio.supabase.co/auth/v1/callback` | Where Google returns the user to **Supabase** |
| Supabase dashboard | `http://localhost:3000/auth/callback` | Where Supabase returns the user to **your app** |

---

## How the flow works

```
/saved (signed out)
  → middleware redirects to /login?next=%2Fsaved
  → user clicks "Continue with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → accounts.google.com  (user consents)
  → https://<project>.supabase.co/auth/v1/callback   (Supabase mints a session)
  → http://localhost:3000/auth/callback?code=...&next=%2Fsaved
  → exchangeCodeForSession(code) sets the cookie
  → redirect to /saved
```

## Files

| Path | Role |
|---|---|
| `src/middleware.ts` | Runs on every request; refreshes the session cookie and enforces access |
| `src/lib/supabase-middleware.ts` | The `updateSession` logic and the protected-route list |
| `src/lib/supabase.ts` | Browser client |
| `src/lib/supabase-server.ts` | Server client + `getUser()` |
| `src/lib/supabase-config.ts` | Detects whether real credentials exist |
| `src/app/(auth)/login/` | Sign-in screen |
| `src/app/auth/callback/route.ts` | Exchanges the OAuth code for a session |
| `src/app/auth/auth-error/page.tsx` | Human-readable failure page |
| `src/app/auth/actions.ts` | `signOut()` server action |
| `src/components/auth/SignOutButton.tsx` | Sign-out row on the profile screen |

> **`src/middleware.ts`, not `middleware.ts`.** This project uses a `src/`
> directory, so Next.js only picks the file up inside `src/`. Placed at the repo
> root it is silently ignored and every route is public — which is exactly what
> happened during the build, caught only because the smoke test checked for the
> redirect.

## Design decisions

**`getUser()`, never `getSession()`, for authorisation.** `getSession()` trusts
the cookie as-is; `getUser()` revalidates against the auth server. Only the
latter is safe for deciding what a user may see.

**Redirects are validated.** `/auth/callback?next=...` only accepts paths
starting with a single `/`. Without that check the callback is an open redirect,
and it is especially dangerous here because the user has just authenticated.

**The app runs without credentials.** `isSupabaseConfigured` recognises the
`.env.example` placeholders, so a fresh clone boots and the login screen explains
what's missing rather than throwing.

**Failures are explained, not swallowed.** Google reports denied consent and
misconfiguration as query params; the callback route forwards those to
`/auth/auth-error`, which shows the underlying reason.

## Identity

The profile screen shows the real Google account — display name, email and
avatar — falling back to initials when there's no photo, and down a chain of
`full_name` → `name` → the email local part for the name, since Google is
inconsistent about which it returns.

Note the **company profile** (Mkhize Solutions) is separate business data and is
still seeded from a demo record in `localStorage`. Linking it to the signed-in
user is the next step.

## Test coverage gap

Adding auth removed **38 smoke assertions** that checked rendered content on the
dashboard, search, tender detail, company profile and preferences screens. They
now redirect to `/login`, so they cannot pass without a session, and this script
cannot mint one without a `service_role` key.

Replaced with 14 assertions covering route protection, the public routes, and
that no secrets appear in the HTML. Total: **21/21 passing**.

To restore the lost coverage, create a test user and seed its session cookie
into the script. That is worth doing before the next feature lands on those
screens.

## Still to do

- Migrate the company profile and preferences from `localStorage` into Postgres
  behind RLS, keyed to `auth.uid()`
- A `profiles` table + trigger to capture new users on first sign-in
- Capacitor: native OAuth uses a custom-scheme redirect and needs separate
  Android and iOS OAuth clients
- Before real users: publish the Google consent screen (currently in Testing
  mode, so only listed test users can sign in)
