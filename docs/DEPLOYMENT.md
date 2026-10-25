# Run and host QuestGo

The application is a Node.js service with server routes. Static-only hosting cannot run its account, database or device endpoints. NorthMark is the intended hosted target; access and deployment have not been supplied.

## Local production MVP

Use Node.js 22.13 or newer:

```sh
npm ci
cp -n .env.example .env
npm run build
AUTH_URL=http://localhost:3101 npm start -- --port 3101 --hostname 127.0.0.1
```

Open `http://localhost:3101/explore`. Create an account, save its recovery code and sign in, or choose the separate full demo. No Google/Facebook settings or authentication API key are needed. `QUESTGO_STORAGE=sqlite` is the default and automatically initializes the account and demo databases.

## Persistent storage and HTTPS

For hosted use, put `QUESTGO_DATA_DIR` on a writable persistent volume and back it up. It contains separate `accounts.sqlite` and `demo.sqlite` files, including credentials, sessions and photos. Do not use an ephemeral filesystem for accounts you intend to keep. SQLite is appropriate for this small single-instance MVP; do not mount the same file into independent replicas.

Serve behind HTTPS and set `AUTH_URL` to the real public origin. Account cookies are HTTP-only, SameSite=Lax and Secure in production, with a local HTTP loopback exception for testing. Keep the proxy and application origin consistent: mutating browser routes reject different origins. Preserve the demo `AUTH_SECRET` across restarts if keeping sample sessions; real account tokens are backed by the database and do not require that secret.

Set `META_AI_API_KEY` in the host's environment for live photo checks. Sign-in does not depend on it. Keep `.env`, database files and device credentials out of source control and container images. `QUESTGO_DEMO_ENABLED=false` disables public sample-room access when desired.

## Optional PostgreSQL

Select `QUESTGO_STORAGE=postgres`, configure `DATABASE_URL`, then run `npm run db:migrate` before starting. QuestGo uses its isolated `questgo_app` schema. This does not copy accounts from SQLite or overwrite public datasets. Choose one backend intentionally; there is no automatic fallback. The configured remote connection currently times out and needs verification before this deployment mode is used.

## Optional container

The included Dockerfile runs as a non-root user. Mount persistent storage for account data:

```sh
docker build -t questgo-mvp .
docker run --rm -p 3000:3000 --env-file .env --mount source=questgo-data,target=/app/.questgo questgo-mvp
```

Docker is unavailable here, so the container build itself remains unverified.

## Hosted check

`/api/health` should report `ready` when the selected account store can be read. This does not verify Meta, venue services or physical devices. Create two accounts in different browser profiles, link two provisioned ESP32s, observe fresh heartbeats, opt in and trigger a real encounter. Verify the shared offer, both acceptances, both approved photos, both confirmations and one history/streak update. Verify logout and recovery revoke previous session cookies.

For optional ESP test broadcasts, set `PROXIMITY_API_URL`/`PROXIMITY_API_TOKEN` for the ESP server and supervise exactly one `npm run notifications:worker` alongside the web process on the same machine (they share a local SQLite file, so use persistent disk). Keep VAPID keys stable and use HTTPS. See [notification setup](NOTIFICATIONS.md).
