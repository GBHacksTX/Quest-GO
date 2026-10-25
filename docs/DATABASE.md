# QuestGo persistence

The local MVP explicitly uses `QUESTGO_STORAGE=sqlite`. Real accounts and their sessions live in `accounts.sqlite`, separate from `demo.sqlite`, under `.questgo/` or the configured `QUESTGO_DATA_DIR`. Files persist across restarts. No remote connection is required for local sign-in. `QUESTGO_STORAGE=postgres` deliberately selects the existing PostgreSQL repository; it never silently falls back to SQLite. Previously configured PostgreSQL data is not copied, replaced or deleted.

Migration 004 adds `questgo_password_accounts` and `questgo_login_sessions`. Passwords use salted scrypt hashes. Recovery codes and browser session tokens are stored only as hashes. Password recovery rotates the recovery code and revokes existing sessions. Demo storage contains no real account credentials. SQLite migrations apply automatically; PostgreSQL requires `npm run db:migrate`. Existing users and evidence remain intact.

The optional remote backend uses Tiger Data/PostgreSQL through `DATABASE_URL` when explicitly selected. Run `npm run db:migrate` before enabling that backend. Migration `001_core.sql` creates users, devices, encounters, quests, sessions and participants. Credentials never reach the browser or ESP32.

The explicitly labeled demo uses a separate SQLite database at `.questgo/demo.sqlite`, using Node 22's built-in SQLite support. It requires no external account. Demo rooms have separate user/device identities and never write to the live PostgreSQL database. The local data directory is ignored by Git. The demo is for local or single-instance evaluation; turn it off for a public live deployment with `QUESTGO_DEMO_ENABLED=false`.

Each entity has a typed JSON document in a `data` column, with relational keys and constraints for identity, ownership, session-to-encounter uniqueness and participation. Acceptance and completion timestamps live in participant rows. This keeps the hackathon model readable without introducing an ORM. Update migration versions intentionally when the persisted shape changes.

All writes pass through one transaction. SQLite uses an immediate transaction; PostgreSQL uses a transaction-scoped advisory lock. Domain checks and updates therefore see a consistent shared state, including simultaneous accepts, reversed proximity reports and completion retries. The repository currently loads the small application dataset per transaction; this is an intentional hackathon limit, not a high-throughput design.

Availability expires after 45 seconds without a foreground browser heartbeat. Offers expire after five minutes; active sessions after 24 hours. Repeated reports for the same device pair are suppressed for ten minutes. Completion history is the source of truth for engagement; streaks count distinct UTC completion days, with yesterday preserving a current streak. No separate reward counter can be incremented twice.

## Legacy achievement photos — migration 002

`002_achievement_photos.sql` adds one private photo per `(session_id, user_id)`, with a foreign key to participation. The table stores the normalized JPEG as bounded base64 text (at most 2 MB before encoding), dimensions, a revision ID and upload timestamp. Storing a photo needs no new storage account; checking new evidence uses `META_AI_API_KEY`. Photo metadata is loaded with session state; image bytes are loaded only by the private image endpoint, not by ordinary polling.

New submissions use migration 003 below; this legacy table remains readable and is no longer overwritten by new uploads. Saving a photo and its participant metadata is transactional. Only the uploader can replace their photo, and only while the activity is active and their completion is unconfirmed. Actual image decoding, format checks and re-encoding happen before the transaction. Original file names and EXIF/GPS metadata are not stored.

Migrations now run in version order and are recorded so they are not repeated. Demo databases upgrade automatically; run `npm run db:migrate` for live PostgreSQL before launching the new application. Existing completed history and streaks are preserved. Migration 002 clears confirmations on unfinished active sessions once, so those participants can add photos and confirm again under the new requirement. Back up live data before applying migrations.

Both PostgreSQL and demo SQLite store the photo bytes alongside session data. This is an intentional small-MVP storage choice; photos are not written to a public filesystem folder. Database backups include photos. Any future move to object storage should preserve these access rules and migrate existing records intentionally.

## Isolated application schema and additive validation tables

QuestGo now uses the PostgreSQL schema `questgo_app`, with an explicit connection search path that excludes public datasets. Migration 003 creates `questgo_photo_submissions`, `questgo_photo_validations`, and `questgo_achievements`. These are new tables; migration 003 does not update, delete or replace existing records. Each submitted image and each validation attempt is retained as a new record. A submission snapshots its quest’s photo criteria. Pending and final validation events use increasing ordinals; completion requires the latest submission’s approval. Meta requests run outside database transactions. Existing legacy photo rows remain readable. Completed achievement evidence is inserted once per session.

The schema is intentionally separate from similarly named tables in `public`. Existing deployments that used public QuestGo tables are not silently copied or overwritten; any migration of those records must be an explicit later action. Local PostgreSQL verification includes an existing `public.app_users` record and checks that it remains unchanged.

## ESP test notifications

ESP test notifications do not use PostgreSQL. Their subscriptions, event baseline and delivery queue live in a local SQLite file (`.questgo/notifications.sqlite`, created automatically), and events are read from the ESP server over HTTPS. Do not run `001_core.sql` on the ESP database because its `devices` table has a different shape. Details: [NOTIFICATIONS.md](NOTIFICATIONS.md).
