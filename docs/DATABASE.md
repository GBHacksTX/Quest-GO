# QuestGo persistence

Live accounts use Tiger Data/PostgreSQL through `DATABASE_URL`. Run `npm run db:migrate` before enabling live sign-in. Migration `001_core.sql` creates users, devices, encounters, quests, sessions and participants. Credentials never reach the browser or ESP32.

The explicitly labeled demo uses a separate SQLite database at `.questgo/demo.sqlite`, using Node 22's built-in SQLite support. It requires no external account. Demo rooms have separate user/device identities and never write to the live PostgreSQL database. The local data directory is ignored by Git. The demo is for local or single-instance evaluation; turn it off for a public live deployment with `QUESTGO_DEMO_ENABLED=false`.

Each entity has a typed JSON document in a `data` column, with relational keys and constraints for identity, ownership, session-to-encounter uniqueness and participation. Acceptance and completion timestamps live in participant rows. This keeps the hackathon model readable without introducing an ORM. Update migration versions intentionally when the persisted shape changes.

All writes pass through one transaction. SQLite uses an immediate transaction; PostgreSQL uses a transaction-scoped advisory lock. Domain checks and updates therefore see a consistent shared state, including simultaneous accepts, reversed proximity reports and completion retries. The repository currently loads the small application dataset per transaction; this is an intentional hackathon limit, not a high-throughput design.

Availability expires after 45 seconds without a foreground browser heartbeat. Offers expire after five minutes; active sessions after 24 hours. Repeated reports for the same device pair are suppressed for ten minutes. Completion history is the source of truth for engagement; streaks count distinct UTC completion days, with yesterday preserving a current streak. No separate reward counter can be incremented twice.
