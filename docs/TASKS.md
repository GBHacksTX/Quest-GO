# QuestGo MVP implementation and status

## Working agreement

The user authorized full MVP implementation and local commits. Use a separate `feat/...` branch for each coherent feature, rebase a separate integration copy, squash merge locally into `main`, and retain the original feature branch unchanged. Never push to origin or another remote.

The product journey and concrete rules live in [PRODUCT.md](PRODUCT.md). This file tracks the work and evidence. The local MVP now uses direct password accounts and cookie sessions. OAuth has been removed. Hosted services and physical hardware remain separate verification work.

## 1. Set up the application

**Branch:** existing `feat/questgo-app-setup` (preserved).

**Work:** Next.js, TypeScript, Tailwind, local environment template, setup instructions and the illustrated landing page.

**Status:** Implemented. The landing page now leads to the working application at `/explore`.

## 2. Connect the database and define stored data

**Branch:** `feat/session-foundation`.

**Work:** Define users, devices, encounters, quests, shared sessions and participant progress. Add a versioned SQL migration and PostgreSQL read/write transactions. Use separate local SQLite files for accounts and the demo, with optional explicitly selected PostgreSQL.

**Status:** Implemented and tested against SQLite and a disposable PostgreSQL 17 instance. A connection string is configured; the remote connection currently times out. See [DATABASE.md](DATABASE.md).

## 3. Add sign-in and user identity

**Branch:** `feat/password-accounts` (replaces the older OAuth implementation).

**Work:** Direct email/password registration, browser session cookies, logout, recovery codes, protected API and isolated demo identities. No authentication API key, external identity provider or paid email service is used.

**Status:** Implemented and verified with local SQLite. Passwords use salted scrypt; session and recovery codes are hashed in new tables. Sessions expire/revoke server-side, logout blocks replay, and recovery rotates codes and revokes previous logins. Optional PostgreSQL account/recovery checks also pass.

## 4. Associate devices with users

**Branches:** `feat/authentication-and-api`, `feat/hardware-and-venues`.

**Work:** Private pairing codes, device-owner records, provisioning and a device setup screen. Public device IDs cannot claim another person's device.

**Status:** Implemented with claim/ownership checks. Real device provisioning requires the configured live database and firmware handoff. Ownership transfer is outside the MVP.

## 5. Record proximity encounters

**Branch:** `feat/hardware-and-venues`.

**Work:** Per-device Wi-Fi report authentication, heartbeat, freshness checks, availability checks, repeated/reversed report suppression, and one unresolved quest per person.

**Status:** Implemented; sender-authentication and domain checks pass. The firmware teammate still needs to connect actual ESP32s using [HARDWARE.md](HARDWARE.md). No physical detection is claimed verified.

## 6. Create and show one shared quest

**Branches:** `feat/session-foundation`, `feat/application-experience`.

**Work:** Persist one quest/session for an eligible pair. Show identical saved activity details to both people, with foreground polling and reload recovery. The first processed eligible pair is selected when several devices are nearby.

**Status:** Implemented. Two independent cookie identities see the same quest and session in API checks. Desktop and phone-sized browser checks recover saved progress after a reload.

## 7. Require mutual acceptance

**Branches:** `feat/session-foundation`, `feat/application-experience`.

**Work:** Explicit availability, Accept and Pass actions, waiting status, acceptance withdrawal and offer expiration. Start only after both accept.

**Status:** Implemented and verified, including nonparticipant rejection and neutral skip behavior. The phone layout places the offer summary and response controls before the longer activity details.

## 8. Require mutual completion

**Branches:** `feat/session-foundation`, `feat/application-experience`.

**Work:** Active activity, individual completion confirmation, partner waiting state, cancellation and a shared success screen. Repeated or simultaneous confirmations must not double-count.

**Status:** Implemented and verified through domain, database, API and browser checks.

## 9. Add preferences, real places and Meta AI

**Branches:** `feat/application-experience`, `feat/hardware-and-venues`.

**Work:** Normal/Work mode, interests, time, spending limit, browser location/manual area, real venue data and optional Meta AI activity text. Use the lower time/budget; Work mode takes priority. Display source/directions links and unknown prices honestly. Allow a free fallback and retry before acceptance.

**Status:** Implemented; fixtures cover trusted venue identities, unknown prices, zero-spend filtering, malformed AI output and provider failure. Live public venue lookup timed out during verification. Meta AI key/model access and real image judging are now verified; see the validated-achievement integration below. Payments and bookings happen outside QuestGo.

## 10. Add history and streaks

**Branches:** `feat/session-foundation`, `feat/application-experience`.

**Work:** Completed-activity history and streaks based on distinct UTC completion days. Both confirmations are required; cancellation and partial completion earn no credit.

**Status:** Implemented. Checks cover retries, multiple completions on the same day, yesterday's streak and a missed day.

## 11. Prepare hardware and hosting

**Branch:** `feat/hardware-and-venues`; deployment/verification work is on `feat/mvp-verification`.

**Work:** Publish the software reporting contract and provisioning commands. Prepare runtime configuration and deployment instructions for the actual hosting target.

**Status:** Hardware contract, provisioning commands, Node hosting instructions and an optional Dockerfile are implemented. Physical ESP32 verification and NorthMark deployment access remain external handoff work. Docker is unavailable here, so the container build is unverified. A local server is not proof of successful hosting.

## 12. Verify and hand off the MVP

**Branch:** `feat/mvp-verification`.

**Work:** Run domain/integration tests, real PostgreSQL checks, API/browser scenarios, TypeScript and a production build. Inspect phone/desktop screenshots and supply the exact demo sequence and remaining integration requirements.

**Status:** Complete for the local MVP. Eleven domain/integration/storage tests, all six API/browser scenarios against the production build, TypeScript and the production build pass. The disposable PostgreSQL 17 check passes. Phone/desktop screenshots are inspected and the [demo guide](DEMO.md) gives the exact walkthrough. External verification remains listed below.

## What remains external

- Resolve the configured Tiger Data connection timeout and verify the hosted database.
- OAuth requirements are superseded by working direct accounts; no provider credentials remain necessary.
- Verify real quest generation with live venue data; Meta model access and image judging already pass.
- Reliable access to the selected public venue endpoints or a suitable replacement service.
- Teammate-owned firmware, two physical ESP32s, and an actual proximity demonstration.
- NorthMark target access, HTTPS and a hosted end-to-end check.

Complete independent implementation and testing while these are unavailable. Report each unverified connection explicitly instead of marking the entire system externally verified.

## Photo achievements and streak requirements

**Branch:** `feat/achievement-photos`.

**Work:** Require a separate saved image for each participant before their confirmation. Offer camera/file selection, preview, upload/retry and private viewing. Display both photos in completed results and Your stories. Keep the existing streak rule, with credit only after both images and confirmations; repeated requests must not duplicate credit.

**Status:** Implemented, including versioned migration 002, bounded image validation, metadata removal, authorization and own-photo locking. Fourteen domain/integration/storage tests, TypeScript, the production build, all six API/browser scenarios against the updated production server, and the updated PostgreSQL verification pass. Upload failure/retry, private viewing, reload persistence and both-photo streak gating are verified. Photo storage uses the existing databases and needs no new credentials. External integration blockers remain unchanged.

## Validated achievement integration

Branch: `feat/validated-achievements`. Reuse Arjit Magar's `7ebab80` validator and retain his original branch unchanged. Integrate in separate commits for additive database storage, shared Meta validation, completion/UI wiring, and tests/documentation. Use the isolated `questgo_app` PostgreSQL schema and append-only evidence/validation/achievement tables; never replace the user's existing datasets. API keys stay in ignored local configuration.


Implementation status: complete locally. The shared judge is connected to immutable photo submissions, saved criterion snapshots, retryable validation events, approval-gated confirmations and one achievement evidence record per completed session. Existing UTC streak rules remain in use. README explains the idea, decisions, journey, setup, data preservation and remaining external checks.

Verification: 17 automated tests; production build and main-app TypeScript; standalone lab route-type generation and TypeScript; disposable PostgreSQL with a pre-existing public table; six desktop/mobile/API scenarios, including real Meta rejection. Nothing has been pushed. The remote database timeout, missing Facebook configuration, actual firmware/venue retrieval and hosted verification remain external handoff work.

Focused feature commits:
- `c9fba80`: reuse Arjit Magar’s photo-validation integration (cherry-pick of `7ebab80`).
- `fffdc99`: `feat(db): isolate app data and add evidence history tables`.
- `c682dd2`: `feat(ai): share Arjit’s photo judge with Meta integration`.
- `dcdfbb7`: `feat(achievements): gate completion on validated photo evidence`.
- `ed3e627`: `test(achievements): verify live rejection in the desktop journey`.

Integration uses a separate `integration/validated-achievements` copy, rebased onto local `main` and squash-merged there. The feature branch and Arjit’s original branch are preserved. Implementation uses a separate worktree (listed by `git worktree list`); the original worktree’s uncommitted architecture edit is untouched.

## Google/demo session switching

Branch: `feat/auth-session-switch`. Provider sign-in clears the active demo cookie before leaving QuestGo, including when OAuth later fails. Successful provider callbacks also clear any remaining demo identity. Demo records are retained; no account data is merged or reset. Google requests account selection. A regression check covers leaving an existing demo, the exact Google callback, account selection, preservation of the saved room and the error screen after a failed login.

Validation: 17 automated tests, the production build and eight browser/API scenarios. Real callback completion still depends on Google settings and live database access; initiating the login flow is tested independently of those external steps.


## Password accounts and browser sessions

Branch: `feat/password-accounts`. Remove OAuth providers and replace them with direct registration, email/password login, logout and recovery codes. Use separate local account storage so the MVP runs without external authentication keys or a reachable remote database. Add new credential/session tables, preserve existing datasets, test account isolation and session revocation, then connect the existing UI and update the setup instructions. Backend storage and account functions are implemented first; UI wiring follows on this branch.


Current password-account implementation is complete locally: create account, save recovery code, sign in, sign out, recover password and resume the same user all work. The earlier Google/Facebook session-switch section is historical and is superseded by this replacement. Existing demo records were preserved in the persistent local directory.

Validation: 20 automated tests, nine desktop/mobile/API scenarios, TypeScript, production build and disposable PostgreSQL checks pass. Per-email login limits, account isolation, expired/revoked tokens, recovery rotation and the existing photo/quest/streak journey are covered. No remote database was modified and no push was made.

Focused commits on `feat/password-accounts`:
- `c1363a9`: `feat(accounts): add persistent password accounts and revocable sessions`.
- `66ce9e4`: `feat(auth): replace OAuth with direct cookie-based sign-in`.

Integration uses `integration/password-accounts` rebased onto local `main`, then a local squash merge. The feature branch remains unchanged after integration.

## ESP test broadcast notifications

**Branch:** `feat/proximity-notifications` (keep checked out for user testing).

**Scope:** Independent ESP event database, opt-in anonymous test broadcasts, service worker push notifications, persistent subscription/delivery storage, and a continuously running event watcher. Every new event type broadcasts to all subscribers. See [NOTIFICATIONS.md](NOTIFICATIONS.md) for setup and verification boundaries.

**External blocker (resolved by the HTTPS relay below):** Supplied Timescale endpoint times out before authentication from this machine.

**Local validation:** TypeScript, 14 unit/integration tests (including real PostgreSQL-compatible notification SQL via PGlite), production build and 10 API/browser scenarios pass. Mobile/desktop screenshots inspected. The feature remains on its requested notification branch rather than being integrated into main; no remote push.

**Sound follow-up:** Added a database-independent test chime and opt-in foreground event sound. Background notifications request the system's normal sound. Database reconnection still times out before authentication.

**HTTPS relay follow-up:** The Timescale port is blocked on the event Wi-Fi, so the worker now reads events from the deployed ESP server's `GET /events` over HTTPS and keeps notification state in local SQLite; the `questgo_notifications` Postgres migration was removed. Events are smoothed per device pair so radio blips do not notify, and `npm run notifications:test-event` sends a fake event. Verified live: real board events and test events were delivered as browser pushes.
