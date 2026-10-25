# Quest-GO

QuestGo turns nearby devices into shared real-world activities.

Start with the [implementation plan](docs/TASKS.md) for the ordered build steps and completion checks. See the [architecture](docs/ARCHITECTURE.md), [domain model](docs/DOMAIN.md), and [agent guidelines](docs/AGENTS.md) for supporting decisions and development rules.

## Local development

Requires Node.js 22 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Environment values may remain empty for this initial UI preview; no external services are called. `.env.local` is ignored by Git. Never put secrets in `NEXT_PUBLIC_` variables.

```sh
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build after `npm run build`. The lockfile pins dependency versions. Tailwind is configured through PostCSS; global styles live in `src/app/globals.css`, the page in `src/app/page.tsx`, and the interactive sample in `src/components/quest-preview.tsx`. Fonts and illustrations are local system fonts and CSS, so rendering requires no third-party asset requests.

The quest card flips with a click, Enter, or Space. It is a sample activity, not a live shared session. Reduced-motion preferences disable decorative animation and the flip transition.

See [PRODUCT.md](docs/PRODUCT.md) for current behavior and [integration readiness](docs/INTEGRATIONS.md) for external service blockers. Steps 2–12 remain unimplemented.
