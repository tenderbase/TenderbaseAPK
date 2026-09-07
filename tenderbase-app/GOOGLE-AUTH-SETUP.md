# Google Sign-In — setup steps

You need to create two free accounts and paste **two values** back to me. Budget about 10 minutes.

Nothing here costs money. Supabase's free tier covers auth for 50,000 monthly active users, and Google OAuth is free at any volume.

---

## The one thing that confuses everyone

There are **two different callback URLs** in this process, and they are not interchangeable. Mixing them up is the single most common reason Google sign-in fails.

| Where you paste it | What the URL is | Belongs to |
|---|---|---|
| **Google Cloud Console** | `https://YOUR-PROJECT.supabase.co/auth/v1/callback` | Supabase |
| **Supabase dashboard** | `http://localhost:3000/auth/callback` | Your app |

Google talks to Supabase. Supabase talks to your app. Each service needs to know where the *next* one lives.

---

## Part 1 — Create the Supabase project (~4 min)

1. Go to **https://supabase.com** → sign in with GitHub.
2. **New project.**
   - **Name:** `tenderbase`
   - **Database password:** click Generate, then save it in your password manager. You won't need it for auth, but you cannot retrieve it later.
   - **Region:** choose the closest one. There is no South African region — **Southeast Asia (Singapore)** and **Europe (Frankfurt)** are the usual picks for ZA traffic. Frankfurt is generally the better latency bet.
3. Wait ~2 minutes while it provisions.
4. Go to **Project Settings** (gear, bottom left) → **API**, and copy these two values:

   - **Project URL** — looks like `https://abcdefghijk.supabase.co`
   - **anon public** key — a long string starting `eyJ...`

> **On the anon key:** it is safe to expose in the app. It only grants what your Row Level Security policies allow, which is why RLS matters when we add data tables.
>
> On the same page you'll see a **service_role** key. **Never send me that one** and never put it in the app — it bypasses all security rules.

---

## Part 2 — Create the Google OAuth client (~5 min)

5. Go to **https://console.cloud.google.com** → create a project called `TenderBase`.

6. **APIs & Services → OAuth consent screen:**
   - **User type:** External → Create
   - **App name:** `TenderBase`
   - **User support email:** your email
   - **Developer contact:** your email
   - Save and continue through the remaining steps. **Do not add any scopes** — the default sign-in scopes are all we need, and adding more can trigger a paid Google security review.
   - You can leave the app in **Testing** mode for now. Add your own Gmail address under **Test users** so you can sign in. Publishing is only needed before real customers use it.

7. **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - **Application type:** Web application
   - **Name:** `TenderBase Web`

   - Under **Authorized JavaScript origins**, add:
     ```
     http://localhost:3000
     ```

   - Under **Authorized redirect URIs**, add your **Supabase** callback — take the Project URL from step 4 and append `/auth/v1/callback`:
     ```
     https://YOUR-PROJECT.supabase.co/auth/v1/callback
     ```
     It must match character for character, including `https://` and the full `/auth/v1/callback` path.

8. Click Create. Copy the **Client ID** and **Client secret**.

---

## Part 3 — Connect the two (~1 min)

9. Back in **Supabase → Authentication → Sign In / Providers → Google:**
   - Toggle **Enable Sign in with Google** on
   - Paste the **Client ID** and **Client secret** from step 8
   - Save

10. **Supabase → Authentication → URL Configuration:**
    - **Site URL:** `http://localhost:3000`
    - Under **Redirect URLs**, add:
      ```
      http://localhost:3000/auth/callback
      ```

    Note this is *your app's* callback, not the Supabase one from step 7.

---

## What to send me

Just these two, from step 4:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

The Google client ID and secret stay in the Supabase dashboard — the app never sees them, so I don't need them.

**Do not send** the service_role key or your database password.

---

## Then I'll build

- `/login` screen matching mockup `03.png`, Google button only
- `/auth/callback` route to exchange the code for a session
- Middleware protecting the app routes, redirecting signed-out users to login
- Session-aware header and a working Sign Out
- Migrating the company profile and preferences out of `localStorage` into Postgres behind RLS, so data follows the user across devices

---

## A note on the preview URL

While you're testing in the Arena preview rather than on your own machine, the app runs on a URL like `https://3000-xxxxx.e2b.app` instead of `localhost:3000`. If you want sign-in to work there too, add that origin and its `/auth/callback` path in the same two places above. Tell me and I'll give you the exact current URL.

For Capacitor later, the native app uses a custom scheme redirect rather than a web URL, and needs separate Android and iOS OAuth clients. That's a later step and doesn't affect anything here.
