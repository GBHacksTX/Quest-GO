import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/lib/model";
import {
  attachAchievementPhoto,
  sessionAction,
  startFriendQuest,
  view,
} from "../src/lib/domain";
import {
  ensurePlayers,
  friendOf,
  playerByCode,
  players,
} from "../src/lib/players";
import {
  openNotificationDb,
  pairProximity,
} from "../src/lib/notifications/store";
import { collectEvents } from "../src/lib/notifications/worker";
import { createNearbyQuest } from "../src/lib/venues";

const now = Date.UTC(2026, 9, 25, 15);

test("two players exist once, sign in by pairing code and own their boards", () => {
  const state = emptyState();
  ensurePlayers(state);
  ensurePlayers(state);
  assert.equal(state.users.length, 2);
  assert.deepEqual(
    state.devices.map((device) => device.id),
    ["esp-1", "esp-2"],
  );
  const prabesh = playerByCode(state, " PRABESH ");
  assert.equal(prabesh.displayName, "Prabesh");
  assert.equal(prabesh.onboarded, true);
  assert.equal(
    state.devices.find((device) => device.id === "esp-1")!.ownerId,
    prabesh.id,
  );
  assert.throws(() => playerByCode(state, "nobody"), /username/);
  const pair = friendOf(state, prabesh.id)!;
  assert.equal(pair.friend.displayName, "Ramu");
  assert.equal(pair.other.espId, 2);
  assert.equal(friendOf(state, "someone-else"), undefined);
});

test("QUESTGO_PLAYERS overrides names, usernames and board numbers", () => {
  const previous = process.env.QUESTGO_PLAYERS;
  process.env.QUESTGO_PLAYERS = "alpha7:Alice:3, beta9:Bob:4";
  try {
    assert.deepEqual(players(), [
      { code: "alpha7", name: "Alice", espId: 3 },
      { code: "beta9", name: "Bob", espId: 4 },
    ]);
    process.env.QUESTGO_PLAYERS = "only:One:1";
    assert.throws(players, /exactly two/);
  } finally {
    if (previous === undefined) delete process.env.QUESTGO_PLAYERS;
    else process.env.QUESTGO_PLAYERS = previous;
  }
});

test("a friend quest is shared, never duplicated, and completes with simulated checks", () => {
  const state = emptyState();
  ensurePlayers(state);
  const [a, b] = state.users;
  const first = startFriendQuest(state, a.id, b.id, now);
  assert.equal(first.created, true);
  assert.equal(first.session.generationStatus, "pending");
  assert.ok(
    state.encounters.some((entry) => entry.id === first.session.encounterId),
  );
  // Either player pressing Start again returns the same quest.
  const again = startFriendQuest(state, b.id, a.id, now + 1000);
  assert.equal(again.created, false);
  assert.equal(again.session.id, first.session.id);
  assert.equal(view(state, b.id, false, now).session?.id, first.session.id);
  first.session.generationStatus = "complete";
  for (const user of [a, b])
    sessionAction(state, user.id, first.session.id, "accept", now + 2000);
  assert.equal(first.session.status, "active");
  for (const user of [a, b]) {
    attachAchievementPhoto(
      state,
      user.id,
      first.session.id,
      {
        id: `photo-${user.id}`,
        uploadedAt: now,
        width: 10,
        height: 10,
        size: 10,
        validation: {
          id: `check-${user.id}`,
          status: "approved",
          provider: "demo",
          model: "simulation",
          checkedAt: now,
          reasoning: "Simulated",
          criteria: [],
        },
      },
      now + 3000,
    );
    sessionAction(state, user.id, first.session.id, "complete", now + 4000);
  }
  assert.equal(first.session.status, "completed");
  assert.equal(view(state, a.id, false, now + 5000).completedCount, 1);
});

test("board proximity follows the smoothed worker status and needs a live worker", () => {
  const db = openNotificationDb(":memory:");
  const event = (id: string, type: string, at: number) => ({
    event_id: id,
    device_id: 2,
    peer_id: 1,
    event_type: type,
    state: null,
    received_at: new Date(at).toISOString(),
  });
  const start = Date.now();
  try {
    assert.equal(pairProximity(1, 2, db).watcherOnline, false);
    collectEvents(db, [], start);
    assert.deepEqual(
      { ...pairProximity(1, 2, db), since: undefined },
      { watcherOnline: true, near: false, since: undefined },
    );
    collectEvents(db, [event("n1", "peer_near", start)], start);
    const near = pairProximity(1, 2, db);
    assert.equal(near.near, true);
    assert.equal(near.since, start);
    // A short blip keeps "near" and its original time.
    collectEvents(
      db,
      [event("m1", "peer_missing", start + 1000)],
      start + 1000,
    );
    collectEvents(db, [event("n2", "peer_near", start + 2000)], start + 2000);
    assert.equal(pairProximity(1, 2, db).since, start);
    // A move away that holds for the settle window ends "near".
    collectEvents(
      db,
      [event("m2", "peer_missing", start + 3000)],
      start + 3000,
    );
    collectEvents(db, [], start + 3000 + 20_000);
    assert.equal(pairProximity(1, 2, db).near, false);
    // A stopped worker makes the status unknown, not near.
    collectEvents(
      db,
      [event("n3", "peer_near", start + 30_000)],
      start + 30_000,
    );
    assert.equal(pairProximity(1, 2, db).near, true);
    db.prepare("UPDATE worker_state SET last_poll_at=?").run(start - 120_000);
    assert.equal(pairProximity(1, 2, db).near, false);
  } finally {
    db.close();
  }
});

test("Meta AI writes a free quest when venue lookup fails", async () => {
  const previous = process.env.META_AI_API_KEY;
  process.env.META_AI_API_KEY = "test-only-placeholder";
  const calls: string[] = [];
  try {
    const quest = await createNearbyQuest(
      {
        mode: "normal",
        minutes: 30,
        budget: 10,
        interests: ["Coffee"],
        area: "Austin",
        latitude: 30.286,
        longitude: -97.739,
      },
      async (url, init) => {
        calls.push(String(url));
        if (!String(url).includes("/chat/completions"))
          return new Response("busy", { status: 504 });
        const body = JSON.parse(String(init?.body));
        assert.equal(body.model, "muse-spark-1.3");
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Bench poets",
                  description: "Write a two-line poem about the nearest bench.",
                  steps: ["Find a public bench.", "Each write one line."],
                  minutes: 15,
                  costEstimate: 0,
                  completionCriteria: [
                    "Both people's hands hold the poem",
                    "A bench is visible",
                  ],
                }),
              },
            },
          ],
        });
      },
    );
    assert.equal(quest.source, "ai");
    assert.equal(quest.title, "Bench poets");
    assert.equal(quest.costEstimate, 0);
    assert.equal(quest.venue, undefined);
    assert.ok(calls.some((url) => url.endsWith("/v1/chat/completions")));
    // Without a key the free fallback is used and Meta is never called.
    delete process.env.META_AI_API_KEY;
    calls.length = 0;
    const fallback = await createNearbyQuest(
      {
        mode: "normal",
        minutes: 30,
        budget: 10,
        interests: ["Coffee"],
        area: "Austin",
        latitude: 30.286,
        longitude: -97.739,
      },
      async (url) => {
        calls.push(String(url));
        return new Response("busy", { status: 504 });
      },
    );
    assert.equal(fallback.source, "fallback");
    assert.ok(!calls.some((url) => url.includes("chat/completions")));
  } finally {
    if (previous === undefined) delete process.env.META_AI_API_KEY;
    else process.env.META_AI_API_KEY = previous;
  }
});
