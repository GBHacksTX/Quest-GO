# Integration readiness

Updated October 25, 2026. Implementation, local verification and external verification are separate facts.

| Integration | Implemented behavior | Current verification |
| --- | --- | --- |
| PostgreSQL / Tiger Data | Versioned migrations and transactions in the isolated `questgo_app` schema; additive submission, validation and achievement tables. | Disposable PostgreSQL 17 checks pass, including preservation of a pre-existing public table. The supplied remote connection times out; it has not been modified. |
| Google / Facebook | Auth.js sessions, provider/account identity mapping and protected APIs. | Google credentials are configured locally. Facebook credentials are empty in the checked local file. Provider initiation clears a prior demo cookie and Google requests account selection; regression checks pass. Real OAuth callbacks remain unverified. |
| Meta AI | Arjit Magar’s shared quest generator and image judge, using authenticated chat completions and image content parts. | The configured key returned models; `muse-spark-1.3` successfully checked an image. Real upload-API rejection blocks completion. Incomplete responses and provider failures fail closed. |
| Nearby venues | OpenStreetMap Overpass and Nominatim, real source/directions links, unknown prices and a free fallback. | Fixture checks pass. Live venue calls have timed out here; successful external retrieval is not claimed. |
| ESP32 | Private device provisioning and claims, per-device authenticated heartbeat/encounter routes. | Software authentication and lifecycle checks pass. Teammate firmware and two physical devices still need a real encounter check. |
| Hosting | Node production build, local runtime, deployment instructions and optional Dockerfile. | Local production runtime works. NorthMark access, HTTPS, real callback URLs and a hosted end-to-end check remain external. Docker is unavailable here. |

## Credentials

Edit the existing ignored `.env` directly. Do not overwrite it with a fresh template or paste credentials into chat. `.env.example` contains empty placeholders.

- `DATABASE_URL`: PostgreSQL/Tiger Data connection string with the provider's required connection settings.
- `AUTH_SECRET`: a stable, locally generated random secret.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: Google OAuth application credentials.
- `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`: Facebook Login app credentials. A Meta AI API key does not replace these.
- `META_AI_API_KEY`: server-side Meta AI key for generation and photo checking.
- `AUTH_URL`: actual app origin. Hosted callbacks are `/api/auth/callback/google` and `/api/auth/callback/facebook` on that origin.

Meta defaults to `https://api.meta.ai/v1` and `muse-spark-1.3`. Optional overrides are `META_AI_BASE_URL`, `META_AI_MODEL` and `META_AI_VISION_MODEL`. Legacy `MUSE_*` provider settings remain supported for the teammate's lab. Main-app live validation **never** enables mock approval through `MUSE_MOCK`.

The [Meta API reference](https://dev.meta.ai/docs/api-reference) and [image-understanding guide](https://dev.meta.ai/docs/image-understanding) document the request format. `npx tsx scripts/check-meta.ts` sends an unrelated generated color swatch and checks that it cannot prove a shared activity. Real user photos are sent to Meta only when checking their evidence; this is disclosed in the upload interface.

## Venue data and failure behavior

[OpenStreetMap Overpass](https://dev.overpass-api.de/overpass-doc/en/criteria/per_tag.html) supplies venue identities and coordinates. AI output cannot replace those source fields. Opening hours, access and prices are not verified; the interface asks people to check and agree before spending. Zero-spend requests exclude paid venue categories.

Manual area lookup uses Nominatim with an identifying User-Agent, caching and a serialized gap of at least 1.1 seconds between requests, following its [public usage policy](https://operations.osmfoundation.org/policies/nominatim/). Browser coordinates bypass geocoding. `QUESTGO_GEOCODER_URL` and `QUESTGO_OVERPASS_URL` support replacement services. Public endpoints and in-process limits suit a small single-instance demonstration; increasing traffic needs an appropriate provider or self-hosted service.

Venue lookup, generation and image judging have bounded timeouts. Venue/generation failure keeps a free, photographable quest. Image-check failure keeps the submission with an error and blocks confirmation until a retry succeeds. External requests run outside database transactions. A stale result cannot approve a replacement image.

## Local verification

TypeScript, the production build, 17 automated tests and eight API/browser scenarios pass. Tests cover independent identities, consent, photo normalization and access, rejected/error evidence, replacement races, retries, saved history, UTC streaks and duplicate-credit prevention. A disposable PostgreSQL check also verifies the new tables and that an existing public dataset is untouched. The standalone validation lab type-checks after generating its Next.js route types.

The production app runs locally at [localhost:3101/explore](http://localhost:3101/explore). Automated screenshots are in the ignored `artifacts/` directory. No hosted deployment or remote push has been performed.

See [HARDWARE.md](HARDWARE.md), [DATABASE.md](DATABASE.md), [DEPLOYMENT.md](DEPLOYMENT.md) and [DEMO.md](DEMO.md) for the handoffs and commands.
