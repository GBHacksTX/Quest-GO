import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Subscription } from "./push";

// Notification state is local to the QuestGo host: the website writes
// subscriptions and the worker process reads them from the same SQLite file.
// ESP events themselves come from the ESP server over HTTPS (see source.ts).
const schema = `
CREATE TABLE IF NOT EXISTS subscriptions (
 id TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 endpoint TEXT UNIQUE NOT NULL,
 keys TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS seen_events (event_id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS worker_state (
 id INTEGER PRIMARY KEY CHECK(id=1), last_poll_at INTEGER
);
CREATE TABLE IF NOT EXISTS deliveries (
 event_id TEXT NOT NULL,
 subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
 payload TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
 PRIMARY KEY(event_id,subscription_id)
);
-- Smoothing: last announced status per device pair, plus a change waiting to settle.
CREATE TABLE IF NOT EXISTS pair_state (
 pair TEXT PRIMARY KEY,
 announced TEXT,
 pending TEXT,
 pending_since INTEGER,
 pending_event TEXT,
 announced_at INTEGER
);
CREATE INDEX IF NOT EXISTS notification_pending ON deliveries(next_attempt_at) WHERE status='pending';`;

const globals = globalThis as typeof globalThis & {
  questgoNotificationDb?: DatabaseSync;
};
export function openNotificationDb(
  file = process.env.QUESTGO_NOTIFICATION_DB ||
    path.join(process.cwd(), ".questgo", "notifications.sqlite"),
) {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
  );
  db.exec(schema);
  // Databases created before announced_at existed.
  const columns = db.prepare("PRAGMA table_info(pair_state)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "announced_at"))
    db.exec("ALTER TABLE pair_state ADD COLUMN announced_at INTEGER");
  return db;
}
export const notificationDb = () =>
  (globals.questgoNotificationDb ??= openNotificationDb());

export const ownerHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function saveSubscription(
  token: string,
  subscription: Subscription,
  db = notificationDb(),
) {
  const result = db
    .prepare(
      `INSERT INTO subscriptions(id,owner_hash,endpoint,keys,created_at) VALUES(?,?,?,?,?)
       ON CONFLICT(endpoint) DO UPDATE SET keys=excluded.keys
       WHERE subscriptions.owner_hash=excluded.owner_hash`,
    )
    .run(
      randomUUID(),
      ownerHash(token),
      subscription.endpoint,
      JSON.stringify(subscription.keys),
      Date.now(),
    );
  return result.changes === 1;
}
export const isSubscribed = (token: string, db = notificationDb()) =>
  !!db
    .prepare("SELECT 1 FROM subscriptions WHERE owner_hash=? LIMIT 1")
    .get(ownerHash(token));
export const removeSubscriptions = (token: string, db = notificationDb()) =>
  db
    .prepare("DELETE FROM subscriptions WHERE owner_hash=?")
    .run(ownerHash(token));
// Online means the worker reached the ESP server within the last minute.
export function workerOnline(db = notificationDb()) {
  const row = db
    .prepare("SELECT last_poll_at FROM worker_state WHERE id=1")
    .get() as { last_poll_at: number } | undefined;
  return !!row && row.last_poll_at > Date.now() - 60_000;
}

// Whether two boards are announced as near each other right now, using the
// worker's smoothed status. Without a running worker the status is unknown.
export function pairProximity(a: number, b: number, db = notificationDb()) {
  const rows = db
    .prepare(
      "SELECT announced,announced_at FROM pair_state WHERE pair IN (?,?) ORDER BY COALESCE(announced_at,0) DESC",
    )
    .all(`${a}-${b}`, `${b}-${a}`) as {
    announced: string | null;
    announced_at: number | null;
  }[];
  const online = workerOnline(db);
  const latest = rows[0];
  return {
    watcherOnline: online,
    near: online && latest?.announced === "near",
    since: latest?.announced_at ?? undefined,
  };
}
