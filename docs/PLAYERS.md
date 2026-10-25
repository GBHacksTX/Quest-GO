# Two players: Prabesh and Ramu

QuestGo ships with two fixed players, each with one ESP board. When the boards report that they are near each other, both players' pages update, a popup can arrive even with the tab closed, and either player can start a shared quest.

| Player | Username (= board pairing code) | ESP server `device_id` |
| --- | --- | --- |
| Prabesh | `prabesh` | 1 |
| Ramu | `ramu` | 2 |

Change names, usernames or board numbers with `QUESTGO_PLAYERS=code:Name:espId,code:Name:espId` in `.env`. Turn the mode off with `QUESTGO_PLAYERS_ENABLED=false`.

## Run it

```sh
npm run dev:all   # website on :3000 + board-event worker, Ctrl+C stops both
```

Open <http://localhost:3000/explore>, choose **Prabesh** or **Ramu** (or type the username), and optionally click **Enable notifications** for closed-tab popups.

## The journey

1. **Sign in.** The username is your board's pairing code, so signing in also links your board. No password: this is a two-person test setup on a trusted machine.
2. **Wait for your friend.** The home screen shows *Waiting for Ramu*. It reads the worker's smoothed board status every 4 seconds; a push message refreshes it at once.
3. **Friend is near.** A banner says *Ramu is near you! You can do a quest together now*, the home card turns to *Time for a quest*, and the push popup reads *"Ramu and Prabesh are near each other. Open QuestGo to start a quest!"*.
4. **Start a quest.** Either player presses **Start a quest with Ramu**. The server refuses unless the boards are near right now. Both players get the same offer. Pressing Start again (from either side) returns the same quest; it never makes a second one.
5. **Accept, do it, prove it.** Both press **I'm in**. Each uploads their own photo. With `META_AI_API_KEY` set, Meta AI checks it against the quest's photo requirements; without a key the check is simulated and labelled *"Approved by simulated check (no Meta AI key)"*. Each confirms their part; when both have, the quest is saved in **Your stories** and counts toward the streak.

**One device, both players:** the top bar shows **Prabesh → Ramu**; click it (or **Switch to Ramu** in the sidebar or inside a quest) to act as the other player. Two phones work too: each signs in as one player.

## How "near" is decided

The worker (`scripts/notifications-worker.ts`) polls the ESP server every 3 s and keeps a smoothed status per board pair in `pair_state` (`.questgo/notifications.sqlite`). *Near* is immediate; *moved apart* / *out of range* must hold 20 s (`QUESTGO_NOTIFICATION_SETTLE_SECONDS`), so radio blips don't flicker the page. A board restart (`hotspot_connected`) resets the pair. The website reads the most recently changed direction (`1-2` or `2-1`). If the worker hasn't polled for 60 s the status is unknown: the page says *Board watcher offline* and quests can't be started.

## Quest text and Meta AI

A started quest shows a short loading state while suggestions are prepared in the background:

1. OpenStreetMap finds a nearby park, café or museum (area defaults to Austin, TX; change it under **Preferences**). With a Meta key, Meta AI rewrites the activity around that verified venue.
2. If the venue lookup fails and a Meta key is set, Meta AI writes a free, venue-free quest (labelled *Written by Meta AI*).
3. Otherwise a free built-in activity is used (labelled *Free fallback*), with a **Try nearby suggestions again** button.

Meta AI calls `POST {META_AI_BASE_URL or https://api.meta.ai/v1}/chat/completions` with `muse-spark-1.3`, matching Meta's [API reference](https://dev.meta.ai/docs/api-reference) and [image guide](https://dev.meta.ai/docs/image-understanding) (OpenAI-style messages, image as a `data:image/jpeg;base64,...` URL, reply in `choices[0].message.content`). `META_AI_API_KEY` and Meta's own name `MODEL_API_KEY` both work. Check a key with `npx tsx scripts/check-meta.ts`.

## Test without boards

```sh
npm run notifications:test-event -- peer_near      # boards meet
npm run notifications:test-event -- peer_missing   # apart (announced after 20 s)
```

Browser tests fake the worker status directly. Run them against a throwaway data folder so real history stays clean:

```sh
export QUESTGO_DATA_DIR=/tmp/qg QUESTGO_NOTIFICATION_DB=/tmp/qg/notifications.sqlite
npm run dev &           # same env as the test run
npx playwright test e2e/players.spec.ts --workers=1
```

## Files

- `src/lib/players.ts`: the two players, their boards, username lookup, `friendOf`
- `src/app/api/players/route.ts`: `GET` list, `POST {action:"signin",username}` / `{action:"switch"}`
- `src/lib/domain.ts` `startFriendQuest`, `src/app/api/app/route.ts` action `friendQuest`
- `src/lib/friend-view.ts`: adds `player`, `friend {near, since, watcherOnline}` and `photoCheck` to the app view
- `src/lib/notifications/store.ts` `pairProximity`
- `src/components/player-sign-in.tsx`, `friend-panel.tsx`, banner and switch in `quest-app.tsx`
- Tests: `tests/players.test.ts`, `e2e/players.spec.ts`
