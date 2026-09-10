# TenderBase Android APK

## Architecture: thin shell over a hosted backend

The APK is **not** a bundled copy of the app. It is a Capacitor WebView pointing
at a hosted Next.js deployment (`server.url` in `capacitor.config.ts`).

This was a deliberate choice. The alternative — `output: 'export'` — fails, and
would be wrong even if it worked:

```
Error: Page "/api/tenders/[id]" is missing "generateStaticParams()"
so it cannot be used with "output: export" config.
```

Four parts of the app need a running server:

| Part | Why |
|---|---|
| `src/app/api/*/route.ts` (4 handlers) | Server endpoints; nothing runs them on-device |
| `src/middleware.ts` | Unsupported in static export |
| `src/lib/*.server.ts` (`server-only`) | Upstream calls + `TENDERBASE_ADMIN_SECRET` |
| `/tenders/[id]` | Would need every tender pre-rendered at build time |

**The security point:** an APK is a zip file. Anything bundled inside it is
extractable with `unzip`. Because this shell only loads a URL, the API keys stay
on the server and never ship to a device. Verified after each build:

```bash
unzip -p app-debug.apk '*' | strings | grep -F 'tb_live_demo12345'   # no match
```

A second benefit: shipping a fix means redeploying the web app. No new APK, no
store review.

## Build

Prerequisites (already installed in this workspace):

- JDK 21 — `/usr/lib/jvm/java-21-openjdk-amd64` (Debian 13 has no JDK 17 package)
- Android SDK — `/home/user/android-sdk`, platform 34 + build-tools 34.0.0

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/home/user/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME

cd ~/tenderbaseapk

# Point the shell at your deployment, then sync
TENDERBASE_APP_URL=https://your-app.vercel.app npx cap sync android

cd android
./gradlew assembleDebug --no-daemon
# -> app/build/outputs/apk/debug/app-debug.apk
```

### Memory note

The sandbox has ~1.9GB RAM. The default Gradle daemon (`-Xmx1536m`) is
OOM-killed mid-compile — it dies with "daemon disappeared unexpectedly", which
looks like a crash but is the kernel. `android/gradle.properties` caps it:

```properties
org.gradle.jvmargs=-Xmx900m -XX:MaxMetaspaceSize=320m
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=1
```

Stop the Next dev server before building; both together will not fit.

## Current build

| | |
|---|---|
| Package | `za.co.tenderbase.app` |
| Label | TenderBase |
| Version | 1.0 (code 1) |
| min / target SDK | 22 / 34 |
| Size | 3.7 MB |
| Signing | **Debug key** — sideload only, not Play Store |
| Points at | `https://tenderbase.vercel.app` *(placeholder — not yet deployed)* |

## Remaining work

### 1. Deploy the Next app (required — the APK is blank until this exists)

The URL currently baked in is a placeholder. Deploy to Vercel or Railway, then
set these environment variables **on the host** (never in the repo):

```
TENDERBASE_API_URL=https://tenderbase-api-rqrh.onrender.com   # public, no key
TENDERBASE_ADMIN_SECRET=<secret>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

Do **not** set `NEXT_PUBLIC_DEV_AUTH_BYPASS` in production — it disables auth.

Then rebuild with the real URL:

```bash
TENDERBASE_APP_URL=https://<your-deployment> npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
```

### 2. Google sign-in redirect URIs

Add the deployment origin in two places, which are easy to confuse:

- **Google Cloud Console** → Authorized redirect URIs →
  `https://<project-ref>.supabase.co/auth/v1/callback`
- **Supabase** → Authentication → URL Configuration → Redirect URLs →
  `https://<your-deployment>/auth/callback`

Google does not support wildcards in redirect URIs.

### 3. Release signing (before any store upload)

```bash
keytool -genkey -v -keystore tenderbase-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias tenderbase
```

Keep the keystore out of git. Losing it means never updating the listing again.

### 4. App icon

Currently the default Capacitor icon. Replace the mipmaps in
`android/app/src/main/res/`, or generate them with `@capacitor/assets`.
