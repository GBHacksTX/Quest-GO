# QuestGo

QuestGo turns a nearby hello into a shared real-world adventure. The MVP includes onboarding, device pairing, opt-in availability, shared quest offers, mutual acceptance and completion, preferences, history and streaks.

## Try it locally

Use Node.js 22.13 or newer:

```sh
npm ci
cp -n .env.example .env
npm run dev
```

Open [QuestGo](http://localhost:3000/explore) and choose **Try the full demo**. It runs the complete saved two-person workflow without credentials or hardware. Existing `.env` values are preserved. Sample devices, encounters, venues and partner controls are explicitly labeled.

Follow the [two-minute demo guide](docs/DEMO.md) to test the journey, or use a second browser profile for the partner's independent actions. Local desktop/mobile screenshots are generated in the ignored `artifacts/` directory by browser tests.

## Real integrations

Enter provider credentials directly in the ignored `.env`, one integration at a time. The app has Google/Facebook Auth.js integration, a PostgreSQL repository, authenticated ESP32 reporting, OpenStreetMap venue lookup and optional Gemini activity generation. Real external accounts and physical hardware are not implied by a successful demo. Live venue requests timed out during implementation; the free fallback works.

- [Environment and verification status](docs/INTEGRATIONS.md)
- [ESP32 firmware handoff and provisioning](docs/HARDWARE.md)
- [Database and migrations](docs/DATABASE.md)
- [Hosting and production setup](docs/DEPLOYMENT.md)

## Checks

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

`npm start` serves the production build. For a local HTTP production demo, set `AUTH_URL=http://localhost:3000`. `bash scripts/test-postgres.sh` verifies an isolated local PostgreSQL instance when its binaries are installed. See the demo guide for details.

## Project documentation

[Product journey](docs/PRODUCT.md) · [Task status](docs/TASKS.md) · [Architecture](docs/ARCHITECTURE.md) · [Domain](docs/DOMAIN.md) · [API](docs/API.md) · [Agent guidelines](docs/AGENTS.md)

The landing page lives in `src/app/page.tsx`; the application is under `src/app/explore`. Shared lifecycle rules live in `src/lib/domain.ts`, persistence in `src/lib/store.ts`, and venue lookup in `src/lib/venues.ts`. Secrets never belong in browser code or Git. Work is committed and integrated locally on feature branches; nothing is pushed to origin.
