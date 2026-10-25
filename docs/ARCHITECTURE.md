# QuestGo architecture

## Current shape

QuestGo is a Next.js App Router application running on Node.js 22.13 or newer. React provides the phone and desktop interface; route handlers own identity, devices, encounters, shared quests and private photos. A single transactional repository keeps both participants' state consistent.

```text
Email/password → session cookie → protected application API
ESP32 Wi-Fi report → authenticated encounter → one saved shared quest
Both accept → activity → both approved photos → both confirm
Completed achievement → history and UTC-day streak
```

## Accounts without external providers

Google, Facebook, OAuth routes and the Auth.js dependency are removed. Users create an email/password account directly. `src/lib/accounts.ts` handles registration, login, logout and recovery; `src/lib/identity.ts` reads the browser cookie and resolves the current account.

Passwords use Node's asynchronous scrypt with random salts (`N=32768`, `r=8`, `p=3`), following an [OWASP-listed scrypt configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The implementation uses [Node crypto](https://nodejs.org/api/crypto.html). Recovery codes and 256-bit session tokens are stored as SHA-256 hashes. Session tokens are opaque random values, not user IDs or passwords.

`questgo-session` is HTTP-only and SameSite=Lax, with Secure enabled for production HTTPS. Its seven-day server expiry is checked on each authenticated request. Logout revokes the token server-side. Password recovery rotates the one-time recovery code and revokes that account's sessions. Account actions require same-origin requests and have per-client/per-email limits. No email delivery or email verification service is configured; email is only a login identifier.

A signed demo cookie selects an explicitly separate sample room. Entering a demo revokes the real session first; logging in clears the demo cookie. Profiles and achievements are not merged across identities. The optional stable `AUTH_SECRET` signs demo cookies only; real sessions need no provider secret.

## Storage

`QUESTGO_STORAGE=sqlite` is the explicit local MVP default. Node's built-in SQLite stores real accounts and activity data in `.questgo/accounts.sqlite`; the demo uses `.questgo/demo.sqlite`. `QUESTGO_DATA_DIR` selects another persistent directory. Both files upgrade through the same versioned migrations and remain separate.

`QUESTGO_STORAGE=postgres` deliberately selects Tiger Data/PostgreSQL through `DATABASE_URL`. Its application schema is `questgo_app`, with a search path excluding public datasets. No automatic fallback or copy occurs between backends. Existing remote datasets remain untouched. PostgreSQL deployments run `npm run db:migrate` before startup; SQLite upgrades automatically.

The repository loads the small application dataset inside serialized transactions. SQLite uses immediate transactions; PostgreSQL uses advisory locks. This is a small, single-instance MVP design. The in-process rate limits and public geocoding queue are not a distributed system. See [DATABASE.md](DATABASE.md) for tables, image limits and preservation rules.

## Shared quests and real-world reports

Teammate-owned ESP32 firmware sends per-device authenticated Wi-Fi heartbeat and encounter reports. Private pairing codes establish ownership separately from firmware keys. Both users must opt in with the site open, and each can have only one unresolved quest. Reversed/repeated signals are deduplicated.

Both participants reference one persisted quest/session. The lower time and budget win; Work mode takes priority and caps the activity at 15 minutes. Offers expire after five minutes, active sessions after 24 hours, and the same device pair has a ten-minute cooldown. Acceptance, confirmation, cancellation and credit checks live in `src/lib/domain.ts`.

OpenStreetMap Overpass supplies venue identities and coordinates; Nominatim resolves manual areas. Meta AI can write a photographable activity but cannot replace source venue fields or invent prices. Lookup/generation failures preserve a labelled free fallback. Purchases and bookings happen outside QuestGo.

## Photos and achievements

Arjit Magar's generator and image judge are reused in `shared/quest-ai.ts`; `shared/meta-ai.ts` calls Meta's image-capable chat API. The standalone `validation/` lab uses the same code. Live checks ignore the lab's mock flag; demo simulations are explicitly labelled.

Each participant submits their own JPEG, PNG or WebP, normalized by Sharp to a bounded JPEG with metadata removed. Each immutable submission snapshots the saved photo criteria; validation events are appended and tied to that exact image. Network calls run outside database transactions. Missing provider evidence and service failures cannot approve completion, and stale responses cannot approve a replacement photo.

Both approved photos and both confirmations create one achievement evidence record. Photos lock after their owner's confirmation and are served only to session participants. History drives streaks based on distinct UTC calendar days; duplicate requests cannot create extra credit.

## Runtime and verification

The app is a Node service, not a static export. Use persistent storage and HTTPS when hosting. NorthMark deployment and physical ESP32 checks remain external handoff work. Meta image judging has been verified; public venue retrieval has timed out here. The remote PostgreSQL timeout does not block the local SQLite MVP.

The current checks cover password storage, account isolation, recovery, expired/revoked sessions, private photos, concurrent session transitions, duplicate-credit prevention and desktop/mobile journeys. See [TASKS.md](TASKS.md), [DEMO.md](DEMO.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
