# DayLedger iPhone PWA setup

DayLedger is configured to install from Safari as a Home Screen web app. The production site must be served over HTTPS; Cloudflare Pages and Netlify both provide automatic HTTPS for deployed sites. Localhost can be used for development.

## Install on iPhone

1. Open the deployed HTTPS site in Safari on the iPhone.
2. Tap **Share**, then **Add to Home Screen**.
3. Turn on **Open as Web App**, then tap **Add**.

Apple's current instructions are available in [Safari's iPhone user guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27).

## What is included

- A web app manifest with standalone display mode and install icons.
- iPhone home screen icon and status bar metadata.
- A service worker that caches the app shell and static build assets for repeat visits.
- Cache exclusions for API requests so authenticated and personal data are not stored by the service worker.

The app can show its cached interface when offline, but account sign-in and data synchronization still require an internet connection.

## Publish updates

The service worker cache version is in `public/sw.js`. Bump `CACHE_NAME` when changing the service worker's caching behavior. The worker removes older DayLedger PWA caches after a new version activates.

## Origin Isolation Note (`pages.dev` vs. `netlify.app`)

A Cloudflare Pages address (`https://<project-name>.pages.dev`) is a completely separate origin from a Netlify address (`https://<site-name>.netlify.app`) under the browser's Same-Origin Policy:
- **Service Worker & Cache**: The service worker (`sw.js`) and CacheStorage (`dayledger-pwa-v1`) are strictly isolated to the originating host. Visiting the Cloudflare Pages URL registers an independent service worker and creates a separate cache on the `pages.dev` origin.
- **Client-Side Storage**: Web storage (`localStorage` auth tokens, theme preferences, and cached session data) is also strictly partitioned per-origin. Existing users switching from Netlify to Cloudflare Pages will simply sign in anew on the `pages.dev` domain; account data synchronizes immediately from the shared Render backend API.
