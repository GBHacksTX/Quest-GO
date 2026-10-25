import type { DatabaseSync } from "node:sqlite";
import {
  deliveryResult,
  eventNotification,
  sendPush,
  type ProximityEvent,
  type Subscription,
} from "./push";

// The status a pair of boards is in. peer_detected and hotspot_connected are
// intermediate steps the firmware passes through, not changes worth a popup.
const pairStatus = (type: string) =>
  type === "peer_near"
    ? "near"
    : type === "peer_far"
      ? "far"
      : type === "peer_missing"
        ? "away"
        : null;
const pairKey = (event: ProximityEvent) => `${event.device_id}-${event.peer_id}`;
// Radio noise makes boards report "missing" then "near" seconds later. A move
// away must hold this long before anyone is notified; "near" is immediate.
export const settleMs = () =>
  Number(process.env.QUESTGO_NOTIFICATION_SETTLE_SECONDS || 20) * 1000;

type PairRow = {
  pair: string;
  announced: string | null;
  pending: string | null;
  pending_event: string | null;
};

// Reads new event IDs (not timestamps, so late events are caught), smooths them
// per device pair and queues one delivery per subscription for each announcement.
// Returns the number of announcements queued.
export function collectEvents(
  db: DatabaseSync,
  events: ProximityEvent[],
  now = Date.now(),
  settle = settleMs(),
) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const markSeen = db.prepare(
      "INSERT INTO seen_events VALUES(?) ON CONFLICT DO NOTHING",
    );
    const getPair = db.prepare("SELECT * FROM pair_state WHERE pair=?");
    const putPair = db.prepare(
      `INSERT INTO pair_state(pair,announced,pending,pending_since,pending_event,announced_at) VALUES(?,?,?,?,?,?)
       ON CONFLICT(pair) DO UPDATE SET announced=excluded.announced,pending=excluded.pending,
       pending_since=excluded.pending_since,pending_event=excluded.pending_event,
       announced_at=CASE WHEN pair_state.announced IS excluded.announced
         THEN pair_state.announced_at ELSE excluded.announced_at END`,
    );
    const settled = (pair: string, status: string | null) =>
      putPair.run(pair, status, null, null, null, now);
    const ordered = [...events].sort(
      (a, b) =>
        Date.parse(String(a.received_at)) - Date.parse(String(b.received_at)) ||
        a.event_id.localeCompare(b.event_id),
    );
    if (!db.prepare("SELECT 1 FROM worker_state WHERE id=1").get()) {
      // First run: record a baseline; never broadcast the old event history.
      for (const event of ordered) {
        markSeen.run(event.event_id);
        const status = pairStatus(event.event_type);
        if (status) settled(pairKey(event), status);
      }
      db.prepare("INSERT INTO worker_state(id,last_poll_at) VALUES(1,?)").run(
        now,
      );
      db.exec("COMMIT");
      return 0;
    }
    const seen = db.prepare("SELECT 1 FROM seen_events WHERE event_id=?");
    const queue = db.prepare(
      `INSERT INTO deliveries(event_id,subscription_id,payload,next_attempt_at)
       SELECT ?,id,?,? FROM subscriptions WHERE created_at <= ? ON CONFLICT DO NOTHING`,
    );
    let queued = 0;
    // Browsers only get events received after they subscribed.
    const announce = (event: ProximityEvent) => {
      queue.run(
        event.event_id,
        JSON.stringify(eventNotification(event)),
        now,
        Date.parse(String(event.received_at)),
      );
      queued++;
    };
    for (const event of ordered.filter((e) => !seen.get(e.event_id))) {
      markSeen.run(event.event_id);
      if (event.event_type === "test") {
        announce(event);
        continue;
      }
      const key = pairKey(event);
      const pair = (getPair.get(key) as PairRow | undefined) ?? {
        pair: key,
        announced: null,
        pending: null,
        pending_event: null,
      };
      const status = pairStatus(event.event_type);
      if (!status) {
        // A gateway restart or Wi-Fi reconnect starts a fresh session, so the
        // next "near" is announced even if the boards were near before.
        if (event.event_type === "hotspot_connected") settled(key, null);
        // Hearing the peer again cancels a pending "out of range".
        else if (event.event_type === "peer_detected" && pair.pending === "away")
          settled(key, pair.announced);
        continue;
      }
      if (status === pair.announced) {
        settled(key, pair.announced); // A blip that recovered; say nothing.
      } else if (status === "near") {
        announce(event);
        settled(key, "near");
      } else if (status !== pair.pending) {
        putPair.run(
          key,
          pair.announced,
          status,
          now,
          JSON.stringify(event),
          now,
        );
      }
    }
    // Announce moves away that held for the whole settle window.
    const due = db
      .prepare(
        "SELECT * FROM pair_state WHERE pending IS NOT NULL AND pending_since <= ?",
      )
      .all(now - settle) as PairRow[];
    for (const pair of due) {
      announce(JSON.parse(pair.pending_event!) as ProximityEvent);
      settled(pair.pair, pair.pending);
    }
    db.prepare("UPDATE worker_state SET last_poll_at=? WHERE id=1").run(now);
    db.exec("COMMIT");
    return queued;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function deliverPending(db: DatabaseSync, send = sendPush) {
  const pending = db
    .prepare(
      `SELECT d.event_id,d.subscription_id,d.payload,d.attempts,s.endpoint,s.keys
       FROM deliveries d JOIN subscriptions s ON s.id=d.subscription_id
       WHERE d.status='pending' AND d.next_attempt_at <= ?
       ORDER BY d.next_attempt_at LIMIT 5`,
    )
    .all(Date.now()) as {
    event_id: string;
    subscription_id: string;
    payload: string;
    attempts: number;
    endpoint: string;
    keys: string;
  }[];
  // A crash after the push service accepts but before the save can redeliver.
  // The service worker uses the stable event tag to replace duplicate alerts.
  for (const row of pending) {
    const attempt = row.attempts + 1;
    const keys = JSON.parse(row.keys) as Subscription["keys"];
    try {
      await send({ endpoint: row.endpoint, keys }, JSON.parse(row.payload));
      db.prepare(
        "UPDATE deliveries SET status='sent',attempts=? WHERE event_id=? AND subscription_id=?",
      ).run(attempt, row.event_id, row.subscription_id);
    } catch (error) {
      const result = deliveryResult(error, attempt);
      if (result === "expired") {
        db.prepare("DELETE FROM subscriptions WHERE id=?").run(
          row.subscription_id,
        );
      } else {
        db.prepare(
          `UPDATE deliveries SET attempts=?,status=?,next_attempt_at=?
           WHERE event_id=? AND subscription_id=?`,
        ).run(
          attempt,
          result === "failed" ? "failed" : "pending",
          Date.now() + Math.min(300, 5 * 2 ** attempt) * 1000,
          row.event_id,
          row.subscription_id,
        );
      }
    }
  }
  return pending.length;
}
