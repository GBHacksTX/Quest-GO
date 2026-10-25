# ESP test notifications

The optional test broadcast notifies every opted-in browser when a pair of boards meaningfully changes status. Events are smoothed per device pair (see below); test events always notify. It does not require OAuth, pairing or QuestGo availability, and does not create a quest. This is a testing mode, not per-user production targeting.

## How it works

```
ESP -> ESP server (http/ repo, FastAPI) -> Tiger Data PostgreSQL
                    ^ GET /events over HTTPS, every 3 s
QuestGo notification worker -> local SQLite (.questgo/notifications.sqlite) -> Web Push -> browsers
```

QuestGo never connects to the ESP database. The worker reads the ESP server's authenticated `GET /events` (latest 100 events, with owner names from its `devices` table) over HTTPS. This works on networks that block PostgreSQL ports, such as campus guest Wi-Fi. Subscriptions, the seen-event baseline and the delivery queue live in a local SQLite file shared by the website and the worker, so both must run on the same machine.

## Setup

1. In the ignored `.env`, set `PROXIMITY_API_URL` to the ESP server's base URL (e.g. `https://questgo-http-to-sql.onrender.com`) and `PROXIMITY_API_TOKEN` to that server's `INGEST_TOKEN`. The token is server-side only; never expose it as `NEXT_PUBLIC_`.
2. Set `QUESTGO_NOTIFICATION_BROADCAST=true`.
3. Run `npm run notifications:keys` once. It preserves existing keys and saves new keys privately in `.env`. Set `VAPID_SUBJECT` to your public HTTPS origin or a valid `mailto:` contact. Keep the same keys when restarting or deploying; changing keys requires browsers to resubscribe.
4. Run the website (`npm run dev`, or build and `npm start`) and **one separate persistent process** with `npm run notifications:worker`. Use a process manager for both on the hosting machine. A serverless API request or browser timer cannot keep this worker alive when tabs close. `-- --once` runs one polling cycle for diagnostics and prints why a poll failed (unreachable server, wrong token, bad response).
5. Visit `/explore`, click **Enable notifications**, and grant browser permission. Anyone opting in will receive the broadcast even without signing in. Use **Turn off notifications** to remove this browser's subscription.
6. Insert a new event through the ESP server: move the boards, or run `npm run notifications:test-event -- peer_near` (also `peer_far`, `peer_detected`, `peer_missing`, `test`). Close the tab to test background delivery, then click the notification to reopen `/explore`.

The SQLite file defaults to `.questgo/notifications.sqlite`; override it with `QUESTGO_NOTIFICATION_DB`. HTTPS is required outside localhost. iPhone/iPad users must add the site to the Home Screen and open the installed app before enabling push. Delivery depends on OS/browser notification settings and browser background support; closing a tab is supported, force-quitting a browser or disabling OS notifications may prevent delivery. The permission prompt must follow a user click.

## Smoothing

Radio noise makes the boards report `peer_missing` and then `peer_detected`/`peer_near` again within seconds, and the firmware re-sends `peer_near` after any one-second gap. The worker therefore keeps the last announced status per device pair (`pair_state` table):

- `peer_near` is announced immediately, only if the pair was not already announced as near.
- `peer_far` and `peer_missing` must hold for 20 seconds (`QUESTGO_NOTIFICATION_SETTLE_SECONDS`) with no return to the announced status before they are announced. `peer_detected` cancels a pending "out of range".
- `peer_detected` and `hotspot_connected` never notify on their own. `hotspot_connected` (gateway restart or Wi-Fi reconnect) resets the pair, so the next `peer_near` is announced again. `test` always notifies.

## Persistence and failure handling

Subscriptions use an opaque HTTP-only browser ownership cookie; no account/device identities are shared. The server accepts only supported HTTPS push-service endpoint hosts. Registration writes require same-origin requests and are rate limited. Push endpoint URLs, private keys and the ESP token are never returned in configuration responses. ESP server responses are validated before use.

The worker's first successful poll records the current events as a baseline, then tracks every new event ID. It therefore does not replay old history on installation or restart, and handles late inserts with older timestamps. Subscriptions only receive events with `received_at` at or after registration. Because each poll reads the latest 100 events, more than 100 events within one 3-second interval (or during a worker outage) would skip the oldest ones. A free-tier ESP host that sleeps can delay the first poll by up to a minute.

Run only one worker per SQLite file. Outbox rows are unique per event/subscription and survive restarts. Temporary failures back off up to five attempts; 404/410 removes expired subscriptions. A crash after a push provider accepts a message but before its local acknowledgment can repeat delivery; the stable notification tag replaces an existing alert. This is at-least-once delivery, not exactly-once OS display. The push provider retains undelivered messages for up to one hour.

The website reports the worker as online when it reached the ESP server within the last minute; it does not claim receipt on the user's device. The hackathon implementation keeps seen IDs and delivery records; high-volume production would need retention, a cursor-based ESP endpoint and user-specific targeting.

## Verification

`npm test` covers the SQLite outbox: baselining, repeated windows, late events, subscribe-time filtering, broadcast fan-out, retry/backoff, expired subscriptions, ownership and unsubscribe cascade, plus named notification text. A worker test exercises push display and click handling without open clients. Browser tests cover opt-in UI and registration failures using mocks.

October 25, 2026: the direct Tiger Data connection (port 32206) was blocked by the `utguest` Wi-Fi, which led to this HTTPS relay design. Live check: the worker baselined 76 events from the deployed ESP server, and a new test event posted to it was detected on the next poll.

## Sound

Click **Enable & test sound** on `/explore` to play a two-note Web Audio chime and enable foreground event sounds for the current page session, even while the database is unavailable. Incoming push messages notify one visible browser tab; its unlocked audio context plays the chime. **Mute page sound** disables this foreground sound. Reloading or leaving the page requires re-enabling it, in accordance with browser autoplay restrictions.

Background notifications explicitly use `silent: false`. This permits the normal system sound but cannot force it, override mute/Do Not Disturb, or select a custom closed-tab sound. Actual speaker output and background delivery remain device-dependent. Sound controls can be tested independently of database delivery.
