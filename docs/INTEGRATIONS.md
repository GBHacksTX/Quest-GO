# Integration readiness

Updated October 25, 2026. The local MVP uses direct accounts and browser cookies. No authentication API key, OAuth provider or paid email service is required.

| Integration | Current implementation and verification |
| --- | --- |
| Accounts | Email/password registration, cookie login, logout and one-time recovery codes work locally. Tests cover password hashing, wrong credentials, duplicate emails, separate users, revoked/expired sessions, recovery rotation and request limits. Google, Facebook, OAuth routes and Auth.js have been removed. |
| Local storage | `QUESTGO_STORAGE=sqlite` stores real accounts in `accounts.sqlite` and samples in `demo.sqlite`. Both persist under `.questgo/` or `QUESTGO_DATA_DIR`. No account data is sent to the configured remote database in this mode. |
| Optional PostgreSQL | Explicitly select `QUESTGO_STORAGE=postgres` and configure `DATABASE_URL`. Disposable PostgreSQL 17 checks verify migrations, existing-data preservation, password accounts, recovery and the quest/photo lifecycle. The supplied remote connection still times out and has not been modified. |
| Meta AI | Arjit Magar's shared generator and image judge are integrated. Request format re-checked against Meta's docs on October 25, 2026 (`/v1/chat/completions`, `muse-spark-1.3`, data-URL images, `choices[0].message.content`). Quest writing now also runs when venue lookup fails. Without a key, two-player photo checks are simulated and labelled. A real vision request passed earlier; the current `.env` has no key. |
| Nearby venues | OpenStreetMap Overpass/Nominatim provide places, source links and directions. Fixture checks pass; public calls have timed out here. A labelled free activity preserves the shared flow. |
| ESP32 | Per-device Wi-Fi credentials, claims, heartbeats and encounter routes are implemented. Teammate firmware and two physical devices still need a real encounter check. |
| Hosting | Production build and local Node runtime work. A persistent data directory and HTTPS are required for a hosted account deployment. NorthMark deployment and physical-device checks are not claimed complete. |

## Environment

Keep existing `.env` values private and intact. The current template uses `QUESTGO_STORAGE=sqlite`. `DATABASE_URL` is optional and read only when PostgreSQL is explicitly selected. `QUESTGO_DATA_DIR` can point to a persistent directory. `AUTH_URL` is the actual app origin; it is not a Google callback setting. Optional `AUTH_SECRET` signs demo cookies only.

`META_AI_API_KEY` remains the server-side key for generation and photo checks. Meta defaults to `https://api.meta.ai/v1` and `muse-spark-1.3`; optional overrides are `META_AI_BASE_URL`, `META_AI_MODEL` and `META_AI_VISION_MODEL`. Main-app live validation ignores `MUSE_MOCK`. The [Meta API reference](https://dev.meta.ai/docs/api-reference) and [image guide](https://dev.meta.ai/docs/image-understanding) document the request format.

`npx tsx scripts/check-meta.ts` checks the real vision API with an unrelated generated color swatch. `QUESTGO_TEST_META=true` adds real rejection checks to the browser/API suite. Real photo checks send the submitted image and its saved criteria to Meta; the upload interface explains this.

## Venue services

[Overpass](https://dev.overpass-api.de/overpass-doc/en/criteria/per_tag.html) supplies venue identities and coordinates. AI cannot replace those fields. Prices, opening hours and access must be checked with the venue. Purchases and bookings happen externally.

Manual area lookup uses Nominatim with a User-Agent, caching and at least 1.1 seconds between requests, following its [public usage policy](https://operations.osmfoundation.org/policies/nominatim/). Browser coordinates bypass geocoding. `QUESTGO_GEOCODER_URL` and `QUESTGO_OVERPASS_URL` can select other services. The public endpoints and in-process limits suit a small single-instance demonstration.

## Verification

Twenty automated tests, nine desktop/mobile/API scenarios, TypeScript, the production build and disposable PostgreSQL checks pass. Browser checks include real local account creation, recovery-code acknowledgement, login/logout, account isolation and session replay rejection, alongside the complete saved demo quest with photos and streaks.

The local application is [localhost:3101/explore](http://localhost:3101/explore). See [DEMO.md](DEMO.md), [HARDWARE.md](HARDWARE.md), [DATABASE.md](DATABASE.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for the remaining handoffs. No remote push or hosted deployment has been performed.
