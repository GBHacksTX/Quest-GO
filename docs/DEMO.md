# Try the QuestGo MVP

## Start locally

Use Node.js 22.13 or newer. From the project directory:

```sh
npm ci
cp -n .env.example .env
npm run dev
```

Open [QuestGo](http://localhost:3000/explore). No API keys, database account or hardware are required for the isolated demo. Existing `.env` values are preserved by `cp -n`. A local `AUTH_SECRET` was generated during implementation; keep it private. A newly copied template without a secret still supports a process-local demo, but a stable random secret is needed to preserve demo authentication across server restarts and enable real OAuth.

## A two-minute walkthrough

1. Choose **Try the full demo**. This creates a separate persistent demo room, not a real account.
2. Enter your first name. Choose your pace, interests, time and spending limit, then continue. The sample area can remain Austin.
3. Choose **Link the sample device**, then **Find your next chapter**.
4. Choose **I’m open to a little adventure**. You control availability; linking a device alone does not opt you in.
5. Choose **Simulate a nearby encounter**. Both sample participants now share one saved quest. The sample venue is illustrative.
6. Choose **I’m in**. The offer stays waiting until the partner accepts. Reload to see that your choice is saved.
7. In the labeled demo controls, choose **Partner accepts**. The quest becomes active.
8. Choose or take a photo, inspect its preview, and choose **Save my achievement photo**. The demo also offers an explicitly labeled sample image. Then choose **We did it — confirm my part**. You are still waiting for the partner's confirmation.
9. Choose **Partner adds a sample photo**, then **Partner confirms completion**. The result screen shows verified mutual completion, both achievement photos, history and the day's streak credit.
10. Return to exploring, then open **Your stories**. You remain paused until choosing availability again.

Use **Start fresh** for another immediate demonstration; the same pair normally has a ten-minute cooldown. To try refusal instead, choose **Pass on this quest** or **Partner passes**. Neither awards completion credit. An active quest can be left with confirmation.

## Try two actual browser identities

The offer's demo controls include **Try with a second browser**. Copy that room's invitation link into a different browser profile or private window. One browser is you; the other is the sample partner. Each can make its own acceptance/completion choices and see the shared result through polling.

Do not open the invitation in the same browser profile if you want to retain the first identity: cookies are shared between its tabs. The link grants access to that illustrative demo room only.

## What is real, and what is simulated

The interface, API requests, persistent demo storage, shared quest identity, availability checks, acceptance/completion rules, reload recovery, history and streak calculation actually execute. They are not just animated screen transitions.

The demo's hardware signal, second person's optional control buttons and sample venue are simulations, explicitly labeled. Real Google/Facebook sign-in requires the provider applications and PostgreSQL. Real venue lookup uses external OpenStreetMap services; lookup timed out during local external verification, so successful retrieval is not claimed. Real Gemini generation needs a key. Physical proximity and firmware behavior need the teammate's ESP32s. Hosted verification needs NorthMark access.

## Validation commands

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The Playwright suite can reuse the local server on port 3000. To check an already running production instance, set `PLAYWRIGHT_BASE_URL` to its origin; the final verification used `http://localhost:3101` and all six scenarios passed. It checks two independent API identities, consent, authorization, desktop/mobile completion, reload recovery, skipping, failed-save recovery and mobile sign-out. Screenshots are written to ignored `artifacts/` files.

For the disposable PostgreSQL verification, run `bash scripts/test-postgres.sh`. On systems where the binaries are not in the default Homebrew PostgreSQL 17 directory, set `PG_BIN_DIR` to their directory. This check starts its own local `questgo_test` database on port 55439 and stops it afterward; it does not use your live `DATABASE_URL`.

For external place retrieval at a public test location, run `npx tsx scripts/check-venues.ts 30.286 -97.739`. A `fallback` result means the lookup did not verify a real venue. Do not describe it as a successful venue integration.

See [INTEGRATIONS.md](INTEGRATIONS.md) for credentials, [HARDWARE.md](HARDWARE.md) for the teammate handoff, and [DEPLOYMENT.md](DEPLOYMENT.md) for hosting.
