# Hosting the MVP

The intended target remains NorthMark. Its account, machine and domain have not been supplied, so no hosted deployment is claimed. The app is a Node.js service with server routes; static-only hosting cannot run its authentication, database or hardware endpoints.

## Run as a Node service

Use Node.js 22.13 or newer. Install with `npm ci`, configure the runtime environment, apply `npm run db:migrate`, run `npm run build`, and start with `npm start`. Supply a persistent writable `.questgo` directory if demo rooms should survive restarts. Live data always uses PostgreSQL.

Serve the app behind HTTPS and set `AUTH_URL` to the actual public origin, such as `https://your-questgo-domain.example`. Configure these exact callback paths on that origin:

- Google: `/api/auth/callback/google`
- Facebook: `/api/auth/callback/facebook`

Set `DATABASE_URL`, a stable `AUTH_SECRET`, both provider IDs/secrets and optionally `GEMINI_API_KEY`/`GEMINI_MODEL` in the host's secret environment. Never bake `.env` or credentials into a build. Demo cookies default to secure transport in production. For an explicit local HTTP production test, use `AUTH_URL=http://localhost:<port>`.

Set `QUESTGO_DEMO_ENABLED=false` for a live-only deployment; leave it enabled for an explicitly labeled public demo. The current repository intentionally favors a single application instance, with a serialized small-dataset transaction path and in-process request/geocoding limits. Do not claim multi-instance production readiness.

## Optional container

A Dockerfile is included. It retains the development tools needed for the migration/provisioning commands to keep the hackathon workflow simple. The image excludes `.env`, local databases, Git history and screenshots, and runs the application as a non-root user. Docker is unavailable in the implementation environment, so the container build itself is unverified.

```sh
docker build -t questgo-mvp .
docker run --rm --env-file .env questgo-mvp npm run db:migrate
docker run --rm -p 3000:3000 --env-file .env --mount source=questgo-demo,target=/app/.questgo questgo-mvp
```

Provide an HTTPS public origin for hosted use. The local HTTP production exception above is only for local testing.

## Hosted check

Check `/api/health`: `ready` means the configured database can be read; `demo` means only the demo storage mode is available; `unconfigured`/`unavailable` returns 503. This does not prove the OAuth providers, Gemini or physical devices work.

After deployment, sign in through each real provider, provision and link two devices, observe recent heartbeats, opt in from two phones, and trigger a real encounter. Verify one shared quest, both acceptances, both confirmations and one history/streak update. Test venue lookup and its fallback under the hosted network conditions. Record which checks actually passed.
