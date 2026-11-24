# Story Home iPhone app shell

A Capacitor 8 iOS app that loads the hosted site. It has its own `package.json`, so the website's dependencies and Vercel build don't change. The plan is in the Project store at `docs/iphone-app-plan.md`, step 2.

## What it does

- **Start URL:** `STORY_HOME_APP_URL` in `capacitor.config.ts` is the only place it lives. It is `https://www.storyhome.app`, which serves the same Vercel deployment as `storyhome-1-eqmg` (same deployment ID and ETag, checked Nov 24, 2026).
- **User agent:** `StoryHomeApp/1` is appended. Use it only to swap app-only behavior (print, download, camera). Never use it for access decisions.
- **Links** (`ios/App/App/StoryHomeBridgeViewController.swift`):
  - Story Home pages (the start host, and the bare domain without `www.`) stay in the app. That includes `target=_blank` and `window.open`.
  - Other `http(s)` links open in an in-app Safari sheet (`SFSafariViewController`, the same view `@capacitor/browser` uses).
  - `mailto:`, `tel:` and similar open the system app.
  - `about:blank` popups (the print reports) still do nothing. That is plan step 3.
- **Offline:** on a real network error, the shell shows the bundled `www/offline.html`. **Try again** (or the browser `online` event) reloads the page that failed. Other load errors are left to Capacitor.
- **Web view crash:** Capacitor reloads the page.
- **`Info.plist`:**
  - Purpose strings for camera, microphone, photo library and location (when in use).
  - `ITSAppUsesNonExemptEncryption = NO`.
  - iPhone only, portrait, dark appearance, light status bar.
- **Privacy manifest:** `ios/App/App/PrivacyInfo.xcprivacy` (no tracking). Keep its data types in step with the App Store Connect privacy answers.
- **Icon and launch image:** **placeholders.** The site has no logo file, so `scripts/render-placeholder-brand.py` draws the CSS wordmark. Replace them before App Store submission.

## Build

Builds run in GitHub Actions on `macos-26`, configured in `.github/workflows/ios-app.yml`:

- **On pull requests:** a simulator build, then `scripts/ci-simulator-smoke.sh`, which checks three things: the live site loads, the user-agent marker is sent, and the offline screen shows. Screenshots and logs go to the `ios-simulator-smoke` artifact. An unsigned device archive is also built.
- **TestFlight:** a manual run, a push to `main` touching `mobile/`, or a pushed `ios-testflight-*` tag. The run:
  1. registers the bundle ID through the App Store Connect API and checks that the app record exists (`scripts/asc-prepare.py`);
  2. archives the app unsigned;
  3. signs and uploads it with Apple's cloud-managed distribution certificate (`ios/ExportOptions.plist`).

  It needs these repository secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (Admin-role key) and `APPLE_TEAM_ID`. The build number is the workflow run number.

Locally (Linux is fine for everything except `xcodebuild`):

```bash
cd mobile && npm ci && npx cap sync ios
```

Never commit certificates, profiles, `.p8` keys or other signing material. The repo is public.

## Fixed values

- **Bundle ID:** `app.storyhome.mobile`. It is permanent once the App Store Connect record exists.
- **Display name:** Story Home.
