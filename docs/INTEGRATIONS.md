# Integration readiness

Updated October 25, 2026. The complete demo runs without external credentials. Implemented integration code and externally verified connections are tracked separately.

| Integration | Implemented | Verification / remaining access |
| --- | --- | --- |
| PostgreSQL | Versioned migration, transactional repository, identity/device/session relationships. | Verified against a disposable local PostgreSQL 17 instance, including concurrent actions and database constraints. Tiger Data itself still needs `DATABASE_URL`. |
| Google and Facebook | Auth.js JWT sessions, provider account mapping, protected API and sign-out. | Real provider callbacks require both applications' credentials and a reachable callback origin. No real OAuth sign-in is claimed verified. |
| Nearby venues | OpenStreetMap Overpass lookup, geocoding, source links, directions, unknown-price handling and free fallback. | Fixture validation passes. Live public Overpass calls timed out in this environment; venue retrieval is not claimed externally verified. |
| Gemini | Server-side structured activity request with bounded time, duration validation and deterministic fallback. | Malformed-output and failure checks pass. A real generation needs `GEMINI_API_KEY` and an available model. |
| ESP32 | Per-device provisioning, private claims, authenticated heartbeat and encounter endpoints. | Sender-authentication checks pass. Teammate firmware and two physical devices still need connection and a real proximity check. |
| Hosting | Production build and local production runtime verified; Node deployment instructions and an optional Dockerfile are included. Docker itself is not installed here. | NorthMark target access and hosted HTTPS verification are still required. |

## Environment setup

A local `.env` has been created for the planning handoff. Provider credentials were left blank when the template was created; `AUTH_SECRET` was generated locally. The file is ignored by Git. `.env.example` remains the shareable template and contains no secrets. The matching integrations are implemented; adding values alone does not verify that the external accounts or callbacks work.

Enter credentials directly in `.env` on this computer rather than pasting them into chat. Do not overwrite the file if it already contains values. No external credentials are needed for the complete isolated demo.

| Variable | What belongs here | When it is needed |
| --- | --- | --- |
| `DATABASE_URL` | The development PostgreSQL connection string supplied by Tiger Data, including its required connection settings. | Connecting and testing real storage. |
| `AUTH_SECRET` | A locally generated random secret used by the authentication system. Already populated locally; no provider account is needed for this value. | Implementing real login. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | The client ID and secret for the project's Google OAuth application. | Verifying Google login and its callback URLs. |
| `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | The application ID and secret for the project's Meta/Facebook login application. | Verifying Facebook login and its callback URLs. Both login providers are required at launch. |
| `GEMINI_API_KEY` | A server-side key for the project's Gemini access. | Verifying actual Gemini activity generation. |

Collect values one integration at a time after the user-flow review. Public callback URLs and hosting settings depend on the eventual deployment target; the software will document exact values when that setup is implemented. Credentials for the web server's database and AI services do not belong in ESP32 firmware.

### Nearby venue data

The selected source is OpenStreetMap, queried through [Overpass](https://dev.overpass-api.de/overpass-doc/en/criteria/per_tag.html). It returns actual named places and coordinates; Gemini cannot replace these fields. The UI links to the source and credits OpenStreetMap contributors. Venue opening hours, availability, admission charges and menu prices are not verified; unknown prices are displayed as variable. A zero-spend preference uses outdoor activity near a park, with no paid entry required.

Manual area lookup uses Nominatim only on explicit saved-location requests, not autocomplete. Its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) limits the public service to one request per second and requires an identifying User-Agent. This single-instance MVP serializes geocoding with at least 1.1 seconds between requests, identifies itself, and caches repeated area coordinates. Browser coordinates bypass geocoding. Use a suitable hosted service or self-hosted endpoint before increasing traffic or running replicas. `QUESTGO_GEOCODER_URL` and `QUESTGO_OVERPASS_URL` allow replacement without changing application code.

Venue lookup has a ten-second timeout; geocoding and AI have their own bounded timeouts. A pending suggestion recovers to a free fallback after 30 seconds if work is interrupted. Both users see the same saved quest; generation cannot replace it once either participant has accepted. The selected Gemini model can be overridden with `GEMINI_MODEL`. No separate Maps or Places key is needed.

Optional settings: `AUTH_URL` is the canonical app origin; `QUESTGO_DEMO_ENABLED=false` disables demo creation and demo identity access. Keep the demo enabled for a local walkthrough. Public service endpoints and model names are configuration, not secrets.

### Hardware and hosting handoff

The user confirmed that a teammate supplies ESP32 firmware and the devices report over Wi-Fi. The implemented report format, private claim method and sender authentication are documented in [HARDWARE.md](HARDWARE.md); confirm the firmware uses this contract. Firmware implementation is outside the application's current ownership.

NorthMark hosting access is needed for the connected hosted demo, not for reviewing the UI. Define deployment variables once the actual hosting environment is known.

## Historical step 1 verification

- `npm run typecheck` passed.
- `npm run build` passed using Webpack; `/`, `/_not-found`, and `/icon.svg` prerendered successfully.
- The local development server started on `127.0.0.1:3001`.
- Browser navigation was denied by the browser approval gate. Desktop/mobile visual layout and live keyboard/click checks remain unverified; responsive styles and native button keyboard behavior are implemented.
- Turbopack failed to bind its worker port in the execution environment, including on an escalated attempt. The project uses the supported `--webpack` option for development and builds.

The historical browser restriction above was superseded by successful desktop/mobile Playwright checks during MVP implementation. Current validation is recorded in [DEMO.md](DEMO.md).

## Final local verification — October 25, 2026

- TypeScript and the optimized production build pass.
- Eleven automated domain/integration/storage tests pass.
- All six API/browser scenarios pass against the production server: independent identities, access protection, desktop/mobile completion and reload, passing without credit, failed-save recovery, and mobile sign-out.
- PostgreSQL 17 migration, real persistence, concurrent transitions, foreign keys and unique participation pass on a disposable local cluster, which is stopped after the check.
- Desktop/mobile screenshots are generated and visually inspected.
- The local production app is available on port 3101. Automatic Chrome opening was declined by the browser origin approval gate; the user can open the provided link directly. This does not change the already completed automated test results.
- No remote push or hosted deployment has been performed.

## Photo achievements and streak verification — October 25, 2026

Separate participant photo uploads, private image viewing, completed achievement galleries and the existing UTC streak system are implemented. Migration 002 stores photos in the same selected database, so this feature requires no additional service or API key. Live PostgreSQL must be migrated before updating a deployment; demo SQLite upgrades automatically.

Fourteen automated domain/integration/storage tests and all six API/browser scenarios pass against the updated production runtime. Tests cover each participant's own upload, completion blocked without a photo, immutable photos after confirmation, unauthorized image access, metadata stripping, upload retry, reload recovery, two-photo history, partial completion without streak credit and repeated completion without duplicate credit. The disposable PostgreSQL check verifies photos and migration idempotence. TypeScript and the production build pass. External integration blockers listed above remain unchanged.
