# Application API

Browser actions use same-origin JSON requests and a server-verified identity. Live identities use Auth.js JWT sessions with Google or Facebook OAuth. Provider accounts are mapped by provider and account ID; equal email addresses do not silently link identities. OAuth callbacks are `/api/auth/callback/google` and `/api/auth/callback/facebook` under the app's actual origin. See the official [Auth.js setup](https://authjs.dev/reference/nextjs).

| Route | Purpose |
| --- | --- |
| `GET /api/config` | Return provider readiness and whether the isolated demo is enabled, without returning credentials. |
| `GET /api/app` | Return only the current user's profile, linked devices, shared quest, completed history and streak. While available, a foreground poll refreshes a 45-second availability lease. |
| `POST /api/app` | Submit a typed `action`: `profile`, `availability`, `claim`, `session`, or `dismiss`. Session actions are `accept`, `withdraw`, `skip`, `complete`, and `leave`. |
| `POST /api/demo` | `{"action":"start"}` creates an isolated demo room with two sample identities; `logout` clears only the demo cookie. |
| `GET /demo/join/<room>` | Join the second sample identity using the demo room's unguessable invitation link. This grants access only to that illustrative demo, never a real account. |

The demo uses signed, HTTP-only cookies. Its explicit `demoEncounter` and `demoPartner` actions simulate hardware and the second person within the caller's own demo room. Real accounts cannot invoke these controls. All acceptance and completion changes, including simulated partner actions, pass through the same domain rules.

Invalid bodies, nonparticipant actions, cross-origin writes and expired sessions are rejected. Pairing attempts and demo creation are rate limited in the single application process. A saved action is acknowledged only after its database transaction commits. Unexpected service failures return a generic recoverable error without database connection details or keys.

The automated API checks exercise two distinct cookie identities, shared IDs, mutual consent, completion retries, outsider rejection, missing authentication and cross-origin rejection. Real Google and Facebook login still require configured provider applications, live PostgreSQL and external verification.
