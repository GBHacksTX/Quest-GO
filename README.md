# QuestGo

**Turn a nearby hello into something worth doing together.**

QuestGo helps friends and strangers move from being near each other to sharing a small real-world activity. Two people opt in, their ESP32 devices report an encounter, and both phones receive one shared quest. It might be a short outdoor discovery, a work break, or a visit to a nearby café. Both people choose whether to join. Afterward, each submits their own achievement photo, gets feedback on the visible evidence, and confirms their part. When both finish, the activity becomes a saved story and contributes to their streak.

The point is to make starting an interaction easier without pressuring anyone to participate. Device proximity starts an opportunity; people decide what happens next.

## The experience, step by step

| Step | What the person does | Why it works this way |
| --- | --- | --- |
| 1. Sign in | Use Google or Facebook, then choose a display name. | Progress belongs to a person and survives closing the browser. |
| 2. Set preferences | Choose interests, Normal or Work mode, time, spending limit, and an area or browser location. | A shared activity needs to fit both people. The lower time and budget win; Work mode limits the break to 15 minutes. |
| 3. Link a device | Enter the private pairing code supplied with an ESP32. | Knowing a public device ID should not let someone claim it. |
| 4. Become available | Choose to receive a quest and keep the website open while waiting. | Being nearby is not consent. Availability expires if the browser stops checking in. |
| 5. Review a shared offer | See the other display name, activity, time, spending information, venue, and photo requirements. Accept or pass. | Both people see the same saved plan and know what completion requires before agreeing. |
| 6. Do it together | Start after both accept. Put the phones away and return afterward. | The application supports the interaction rather than demanding attention throughout it. |
| 7. Save evidence | Each uploads their own photo. Faces are optional; hands and the result can show participation. | Separate submissions let each person contribute to the achievement. Meta AI checks the requirements that were shown with the offer. |
| 8. Confirm and remember | Each confirms after their photo passes. Both confirmations save one achievement with its photos and date. | An image check alone does not prove an experience happened. Mutual confirmation remains part of completion. |

Passing, leaving, or letting a quest expire gives no completion credit. Returning home leaves a person paused until they choose availability again. There is no nearby-person directory or public photo feed.

## Achievements and streaks

A completed shared quest is an achievement: the activity, participants, individual photos, and completion date appear in **Your stories**. Photo feedback explains what was visible and what was missing. A rejected photo can be replaced. If the AI service fails, the uploaded photo remains saved and the person can retry the check; the app does not silently approve it. Each photo locks after its owner confirms completion.

Streaks count consecutive **UTC calendar days** with completed quests. Several quests on one day still count as one streak day. Yesterday keeps a streak current while today is still in progress. Repeated requests and reloads cannot award the same quest twice.

AI can misread a photo. It checks visible objects and gestures, not how long people spent together or what they discussed. QuestGo therefore uses photographable requirements and still asks both people to confirm.

## Try the complete demo

Use **Node.js 22.13 or newer**:

```sh
npm ci
cp -n .env.example .env
npm run dev
```

Open [the application](http://localhost:3000/explore) and choose **Try the full demo**. The copy command preserves an existing `.env`.

The demo creates its own persistent room with a sample device and partner. Set preferences, link the sample device, become available, and simulate an encounter. Accept for yourself, then use the labelled partner controls. Upload your photo or use the sample artwork; add the partner's sample photo and confirm both sides. See [the walkthrough](docs/DEMO.md) for the exact sequence and the invitation link for a second browser profile.

No credentials or physical hardware are needed for this walkthrough. Demo photo approvals are explicitly simulated by default. With a configured Meta key, select **Use real Meta AI for this photo** to try the actual checker. Demo history stays separate from real accounts even when the real checker is used.

## Connect real services

Keep credentials in the ignored `.env`, never in Git or browser code.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL/Tiger Data storage for real users, devices, quests and evidence. |
| `AUTH_SECRET` | A stable random application secret for authentication. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth application credentials. |
| `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | Facebook Login application credentials. These are separate from the Meta AI key. |
| `META_AI_API_KEY` | Server-side quest writing and photo checking. |
| `META_AI_BASE_URL`, `META_AI_MODEL`, `META_AI_VISION_MODEL` | Optional overrides. Defaults: `https://api.meta.ai/v1`, `muse-spark-1.3`. |
| `AUTH_URL` | The actual application origin, especially for a hosted or local production server. |

Meta's [API reference](https://dev.meta.ai/docs/api-reference) and [image-understanding guide](https://dev.meta.ai/docs/image-understanding) describe the chat-completions and image format used here. Arjit Magar's quest generator and photo judge are reused in `shared/quest-ai.ts`; the standalone `validation/` lab uses the same implementation. Live QuestGo ignores the lab's `MUSE_MOCK` setting.

For real accounts, first run `npm run db:migrate`. Register Google and Facebook callback URLs at `/api/auth/callback/google` and `/api/auth/callback/facebook` on the application's origin. Provision each ESP32 with `npm run device:provision -- questgo-001`, then hand its separate firmware key and pairing code to the appropriate people. Follow the [hardware contract](docs/HARDWARE.md); firmware is supplied by the hardware teammate.

Nearby venues come from OpenStreetMap, with source and walking-direction links. Manual area lookup uses Nominatim; browser coordinates can avoid that lookup. Venue prices, opening hours and access must be checked with the venue. Purchases and bookings happen outside QuestGo. If venue lookup or quest writing fails, both people receive the same clearly labelled free fallback. See [integration setup](docs/INTEGRATIONS.md) for details.

## How data is kept

Real data lives in the dedicated PostgreSQL schema **`questgo_app`**. Existing tables in `public` are left untouched. This separation prevents QuestGo from colliding with another dataset. Earlier public-schema QuestGo data is not automatically copied into the new schema.

Photo replacements create new rows in `questgo_photo_submissions`; pending and completed checks create rows in `questgo_photo_validations`. Completion inserts one `questgo_achievements` record per session. Earlier submissions and validation attempts are retained instead of overwritten. These are the new tables added for this feature; normal current-session progress still updates within QuestGo's own schema.

Photos are normalized to bounded JPEGs with metadata removed, stored in the selected database, and served only to session participants. Live checks send the photo and quest criteria to Meta AI. The demo uses a separate local SQLite file in `.questgo/`, or `QUESTGO_DATA_DIR` when supplied. See [database details](docs/DATABASE.md) for limits and migrations.

## Check or run a production build

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
AUTH_URL=http://localhost:3000 npm start
```

For an existing server, run `PLAYWRIGHT_BASE_URL=http://localhost:3102 npm run test:e2e`. Set `QUESTGO_TEST_META=true` as well to include a real rejection through the upload API; this requires the server's Meta key and uses that service. `npx tsx scripts/check-meta.ts` separately checks the real vision API with a generated, unrelated color swatch. Neither command sends a user's private photo.

`bash scripts/test-postgres.sh` starts and stops a disposable local PostgreSQL database. It tests migrations, existing-data preservation, relationships, private photos and concurrent completion without using the configured remote database.

Deploy as a Node service behind HTTPS, apply migrations before starting the new version, and set the real origin and secrets. See [deployment instructions](docs/DEPLOYMENT.md). This hackathon implementation uses a simple serialized transaction path and is intended for a small, single-instance deployment.

## What has been verified

The current feature passes TypeScript, the production build, 17 automated tests, six desktop/mobile/API scenarios, and disposable PostgreSQL checks. A real Meta vision call succeeded; an unrelated image was also rejected through the app's upload endpoint, and completion remained blocked. Browser checks cover reloads, separate identities, private photos, failed-upload recovery, mutual completion and history.

The configured remote database still times out from this environment; no changes have been applied there. Google credentials are present locally, but a real callback has not been verified. Facebook credentials are still empty in the checked local configuration. Physical ESP32 encounters, reliable live venue retrieval, and hosted HTTPS deployment still need verification. A working local demo does not establish those connections.

## Find the implementation

- `src/lib/domain.ts`: shared quest lifecycle, consent, completion and streak rules.
- `src/lib/achievement-photos.ts`: submission history, private reads, checks and retries.
- `shared/quest-ai.ts`: Arjit’s shared generator and judge; `shared/meta-ai.ts`: provider client.
- `src/lib/store.ts` and `migrations/`: transactional persistence and database changes.
- `src/components/`: responsive application screens and photo feedback.
- [Product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [tasks](docs/TASKS.md), [API](docs/API.md), and [agent guidelines](docs/AGENTS.md).

Feature work uses focused local commits. A separate integration branch is rebased and squash-merged into local `main`, keeping the original feature branch unchanged. Nothing is pushed to origin.
