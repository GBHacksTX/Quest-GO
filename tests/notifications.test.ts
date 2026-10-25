import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  allowedPushEndpoint,
  deliveryResult,
  eventNotification,
} from "../src/lib/notifications/push";
import {
  isSubscribed,
  openNotificationDb,
  removeSubscriptions,
  saveSubscription,
} from "../src/lib/notifications/store";
import { collectEvents, deliverPending } from "../src/lib/notifications/worker";

test("anonymous push registration only accepts recognized HTTPS push services", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/test",
    "https://updates.push.services.mozilla.com/wpush/v2/test",
    "https://web.push.apple.com/test",
  ])
    assert.equal(allowedPushEndpoint(endpoint), true);
  for (const endpoint of [
    "http://fcm.googleapis.com/x",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://fcm.googleapis.com.evil.test/x",
    "https://user@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
  ])
    assert.equal(allowedPushEndpoint(endpoint), false);
  assert.equal(deliveryResult({ statusCode: 410 }, 1), "expired");
  assert.equal(deliveryResult({ statusCode: 503 }, 1), "retry");
  assert.equal(deliveryResult({ statusCode: 503 }, 5), "failed");
});

test("outbox baselines old history, captures late rows, broadcasts once and survives retries", async () => {
  const db = openNotificationDb(":memory:");
  const count = (sql: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${sql}`).get() as { n: number }).n;
  const event = (id: string, type: string, receivedAt: number) => ({
    event_id: id,
    device_id: 1,
    peer_id: 2,
    event_type: type,
    state: "near",
    received_at: new Date(receivedAt).toISOString(),
  });
  const now = Date.now();
  try {
    const old = event("old", "test", now);
    collectEvents(db, [old]);
    assert.equal(count("deliveries"), 0);
    for (const id of ["a", "b"])
      db.prepare(
        "INSERT INTO subscriptions(id,owner_hash,endpoint,keys,created_at) VALUES(?,?,?,?,?)",
      ).run(id, `owner-${id}`, `https://fcm.googleapis.com/${id}`, "{}", now - 3_600_000);
    // The ESP server keeps returning the same recent window; only new IDs count.
    const fresh = event("new", "test", now);
    assert.equal(collectEvents(db, [fresh, old]), 1);
    assert.equal(collectEvents(db, [fresh, old]), 0);
    assert.equal(count("deliveries"), 2);
    // Earlier timestamp arriving later must not be lost by a timestamp cursor.
    collectEvents(db, [fresh, old, event("late", "test", now - 60_000)]);
    assert.equal(count("deliveries"), 4);
    // Events received before a browser subscribed are not sent to it.
    db.prepare(
      "INSERT INTO subscriptions(id,owner_hash,endpoint,keys,created_at) VALUES('c','owner-c','https://fcm.googleapis.com/c','{}',?)",
    ).run(now + 10_000);
    collectEvents(db, [event("before-c", "test", now)]);
    assert.equal(count("deliveries WHERE subscription_id='c'"), 0);
    db.prepare("DELETE FROM subscriptions WHERE id='c'").run();
    db.prepare("DELETE FROM deliveries WHERE event_id='before-c'").run();

    let sends = 0;
    await deliverPending(db, async () => {
      sends++;
      throw { statusCode: 503 };
    });
    assert.equal(sends, 4);
    assert.equal(count("deliveries WHERE attempts=1 AND status='pending'"), 4);
    await deliverPending(db, async () => {
      throw new Error("Should back off");
    });
    assert.equal(count("deliveries WHERE attempts=1"), 4);
    db.prepare("UPDATE deliveries SET next_attempt_at=0").run();
    await deliverPending(db, async (sub) => {
      if (sub.endpoint.endsWith("/b")) throw { statusCode: 410 };
      sends++;
      return { statusCode: 201, body: "", headers: {} };
    });
    assert.equal(count("subscriptions"), 1);
    assert.equal(count("deliveries WHERE status='sent'"), 2);
    const before = sends;
    await deliverPending(db, async () => {
      sends++;
      return { statusCode: 201, body: "", headers: {} };
    });
    assert.equal(sends, before);
    db.prepare("DELETE FROM subscriptions WHERE id='a'").run();
    assert.equal(count("deliveries"), 0);
  } finally {
    db.close();
  }
});

test("noisy disconnect/reconnect blips are smoothed into clean announcements", () => {
  const db = openNotificationDb(":memory:");
  db.prepare(
    "INSERT INTO subscriptions(id,owner_hash,endpoint,keys,created_at) VALUES('s','o','https://fcm.googleapis.com/s','{}',0)",
  ).run();
  const t0 = Date.parse("2026-10-25T09:00:00Z");
  let id = 0;
  const all: Parameters<typeof collectEvents>[1] = [];
  // Adds events (seconds after t0) to the server's window and runs one poll at `at`.
  const poll = (at: number, ...types: string[]) => {
    for (const type of types)
      all.push({
        event_id: `e${++id}`,
        device_id: 2,
        peer_id: 1,
        event_type: type,
        state: null,
        received_at: new Date(t0 + at * 1000).toISOString(),
        detected_by: "Ramu",
        other_person: "Prabesh",
      });
    return collectEvents(db, all, t0 + at * 1000, 20_000);
  };
  const bodies = () =>
    (db.prepare("SELECT payload FROM deliveries ORDER BY rowid").all() as {
      payload: string;
    }[]).map((row) => JSON.parse(row.payload).body);
  try {
    poll(0); // baseline
    assert.equal(poll(1, "hotspot_connected", "peer_detected"), 0);
    assert.equal(poll(3, "peer_near"), 1);
    // Repeated near heartbeats say nothing.
    assert.equal(poll(60, "peer_near"), 0);
    // Real-world blip: missing, then detected and near again within seconds.
    assert.equal(poll(100, "peer_missing"), 0);
    assert.equal(poll(102, "peer_detected", "peer_near"), 0);
    assert.equal(poll(130), 0);
    // Missing then only detected (no near yet) is still not "out of range".
    poll(140, "peer_missing");
    poll(141, "peer_detected");
    assert.equal(poll(170), 0);
    // A real departure that lasts past the settle window is announced once.
    assert.equal(poll(200, "peer_missing"), 0);
    assert.equal(poll(210), 0);
    assert.equal(poll(221), 1);
    assert.equal(poll(240), 0);
    // Coming back is announced immediately.
    assert.equal(poll(250, "peer_detected", "peer_near"), 1);
    // Test events always notify.
    assert.equal(poll(260, "test"), 1);
    // A board restart (reflash) starts fresh: the next near is announced again.
    assert.equal(poll(300, "hotspot_connected", "peer_detected"), 0);
    assert.equal(poll(303, "peer_near"), 1);
    assert.deepEqual(bodies(), [
      "Ramu and Prabesh are near each other. Open QuestGo to start a quest!",
      "Ramu and Prabesh are out of range",
      "Ramu and Prabesh are near each other. Open QuestGo to start a quest!",
      "Test event from Ramu",
      "Ramu and Prabesh are near each other. Open QuestGo to start a quest!",
    ]);
  } finally {
    db.close();
  }
});

test("subscriptions are owned by the browser that created them", () => {
  const db = openNotificationDb(":memory:");
  const sub = {
    endpoint: "https://fcm.googleapis.com/x",
    keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) },
  };
  assert.equal(saveSubscription("owner", sub, db), true);
  assert.equal(saveSubscription("owner", sub, db), true);
  assert.equal(saveSubscription("intruder", sub, db), false);
  assert.equal(isSubscribed("owner", db), true);
  removeSubscriptions("owner", db);
  assert.equal(isSubscribed("owner", db), false);
  db.close();
});

test("notifications use device owner names from the ESP server", () => {
  const base = {
    event_id: "e",
    device_id: 2,
    peer_id: 1,
    state: "near",
    received_at: "2026-10-25T07:48:31.973044+00:00",
  };
  assert.equal(
    eventNotification({
      ...base,
      event_type: "peer_near",
      detected_by: "Ramu",
      other_person: "Prabesh",
    }).body,
    "Ramu and Prabesh are near each other. Open QuestGo to start a quest!",
  );
  assert.equal(
    eventNotification({ ...base, event_type: "peer_far" }).body,
    "Device 2 and Device 1 moved apart",
  );
});

test("service worker displays background pushes without any open page and opens the application", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const shown: unknown[] = [];
  const opened: string[] = [];
  let pending = Promise.resolve();
  const self = {
    addEventListener: (name: string, callback: (event: unknown) => void) => {
      handlers[name] = callback;
    },
    registration: {
      showNotification: async (...args: unknown[]) => {
        shown.push(args);
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), { self, URL });
  const payload = eventNotification({
    event_id: "e",
    device_id: 1,
    peer_id: 2,
    event_type: "test",
    state: "near",
    received_at: new Date(),
  });
  handlers.push({
    data: { json: () => payload },
    waitUntil: (task: Promise<void>) => {
      pending = task;
    },
  });
  await pending;
  assert.equal(shown.length, 1);
  assert.equal(
    (shown[0] as [string, { tag: string }])[1].tag,
    "questgo-event-e",
  );
  handlers.notificationclick({
    notification: { close() {} },
    waitUntil: (task: Promise<void>) => {
      pending = task;
    },
  });
  await pending;
  assert.deepEqual(opened, ["/explore"]);
});
