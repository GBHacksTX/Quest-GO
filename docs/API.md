# Application API

Browser actions use same-origin JSON requests and a server-verified identity. Live identities use Auth.js JWT sessions with Google or Facebook OAuth. Provider accounts are mapped by provider and account ID; equal email addresses do not silently link identities. OAuth callbacks are `/api/auth/callback/google` and `/api/auth/callback/facebook` under the app's actual origin. See the official [Auth.js setup](https://authjs.dev/reference/nextjs).

| Route | Purpose |
| --- | --- |
| `GET /api/config` | Return provider readiness and whether the isolated demo is enabled, without returning credentials. |
| `GET /api/app` | Return only the current user's profile, linked devices, shared quest, completed history and streak. While available, a foreground poll refreshes a 45-second availability lease. |
| `POST /api/app` | Submit a typed `action`: `profile`, `availability`, `claim`, `session`, or `dismiss`. Session actions are `accept`, `withdraw`, `skip`, `complete`, and `leave`. |
| `POST /api/demo` | `{"action":"start"}` creates an isolated demo room with two sample identities; `logout` clears only the demo cookie. |
| `GET /demo/join/<room>` | Join the second sample identity using the demo room's unguessable invitation link. This grants access only to that illustrative demo, never a real account. |
| `POST /api/quests/retry` | Retry venue preparation for a live shared offer before either participant accepts; limited to three attempts per minute. |
| `POST /api/hardware/heartbeat` | Update a registered sender's last report using its per-device bearer key. |
| `POST /api/hardware/encounters` | Authenticate a sender, deduplicate an encounter, create one shared session and prepare its venue/activity. See `HARDWARE.md`. |

The demo uses signed, HTTP-only cookies. Its explicit `demoEncounter` and `demoPartner` actions simulate hardware and the second person within the caller's own demo room. Real accounts cannot invoke these controls. All acceptance and completion changes, including simulated partner actions, pass through the same domain rules.

Invalid bodies, nonparticipant actions, cross-origin writes and expired sessions are rejected. Pairing attempts and demo creation are rate limited in the single application process. A saved action is acknowledged only after its database transaction commits. Unexpected service failures return a generic recoverable error without database connection details or keys.

The automated API checks exercise two distinct cookie identities, shared IDs, mutual consent, completion retries, outsider rejection, missing authentication and cross-origin rejection. Real Google and Facebook login still require configured provider applications, live PostgreSQL and external verification.

## Achievement photo endpoints

- `POST /api/quests/<sessionId>/photos`: same-origin authenticated multipart upload with a `photo` field. Uploads apply only to the caller's participation in an active quest, before their confirmation. Creates a new immutable submission, saves a pending check, checks the server-owned quest criteria, and returns an updated view with `approved`, `rejected` or `error` feedback. It never trusts quest JSON supplied by a client. Only an isolated demo may request simulated approval; real accounts always use Meta.
- `POST /api/quests/<sessionId>/photos/validate`: same-origin authenticated JSON `{ "photoId": "current-submission-uuid" }` retries a saved check for the caller’s current photo. It reads the image and criteria from storage. A pending check can be retried after 30 seconds; recent pending checks, stale submission IDs, nonparticipants and confirmed photos are rejected.
- `GET /api/quests/<sessionId>/photos/<userId>`: serve the saved JPEG only to participants of that session. Images use private, no-store responses and are not embedded as bytes in state responses.
- `POST /api/demo/photos`: explicitly simulate a self/partner photo inside the caller's isolated demo room. Live accounts cannot use it. Sample art is labeled as demonstration data and still passes through normal decoding and persistence.

Allowed uploads are JPEG, PNG and WebP, at most 10 MB and 40 megapixels. The request stream is bounded before multipart parsing. Photos are re-encoded with a maximum dimension of 1600 pixels and a maximum stored size of 2 MB, with original metadata removed. Invalid files, nonparticipant access, post-confirmation replacements and attempts to confirm without one's own photo are rejected. Both approved photos and confirmations are needed for final completion and streak credit. A 200 upload response means the photo was saved; inspect `photo.validation.status` to know whether it passed. Provider failures are saved as `error`, never as approval.
