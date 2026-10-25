# QuestGo MVP implementation and status

## Working agreement

The user authorized full MVP implementation and local commits. Use a separate `feat/...` branch for each coherent feature, rebase a separate integration copy, squash merge locally into `main`, and retain the original feature branch unchanged. Never push to origin or another remote.

The product journey and concrete rules live in [PRODUCT.md](PRODUCT.md). This file tracks the work and evidence. A demo passing does not mean real OAuth, hosted services or physical hardware have been verified.

## 1. Set up the application

**Branch:** existing `feat/questgo-app-setup` (preserved).

**Work:** Next.js, TypeScript, Tailwind, local environment template, setup instructions and the illustrated landing page.

**Status:** Implemented. The landing page now leads to the working application at `/explore`.

## 2. Connect the database and define stored data

**Branch:** `feat/session-foundation`.

**Work:** Define users, devices, encounters, quests, shared sessions and participant progress. Add a versioned SQL migration and PostgreSQL read/write transactions. Use a separate local SQLite database only for the explicit demo.

**Status:** Implemented and tested against SQLite and a disposable PostgreSQL 17 instance. A connection string is configured; the remote connection currently times out. See [DATABASE.md](DATABASE.md).

## 3. Add sign-in and user identity

**Branch:** `feat/authentication-and-api`.

**Work:** Google and Facebook Auth.js entry points, persistent provider identity mapping, protected API, signed isolated-demo cookies and sign-out. Never auto-link different providers solely because their emails match.

**Status:** Implemented. Real OAuth login requires provider credentials, callback registration and live database configuration. Demo identity isolation is verified.

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
- Add missing Facebook credentials and verify both real OAuth callback flows.
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
