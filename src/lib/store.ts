import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { emptyState, type State, type QuestSession } from "./model";

type Row = Record<string, unknown>;
type Query = (sql: string, args?: unknown[]) => Promise<Row[]>;
const globals = globalThis as typeof globalThis & {
  questgoQueue?: Promise<unknown>;
  questgoDemoDb?: DatabaseSync;
  questgoPool?: Pool;
};
const migration = () =>
  readFileSync(path.join(process.cwd(), "migrations/001_core.sql"), "utf8");
export const liveStorageReady = () => !!process.env.DATABASE_URL;

async function load(query: Query): Promise<State> {
  const state = emptyState();
  for (const [table, key] of [
    ["app_users", "users"],
    ["devices", "devices"],
    ["encounters", "encounters"],
    ["quests", "quests"],
    ["quest_sessions", "sessions"],
  ] as const) {
    const rows = await query(`SELECT data FROM ${table}`);
    (state[key] as unknown[]) = rows.map((row) => JSON.parse(String(row.data)));
  }
  const participants = await query("SELECT * FROM participants");
  for (const session of state.sessions)
    session.participants = participants
      .filter((row) => row.session_id === session.id)
      .map((row) => ({
        userId: String(row.user_id),
        acceptedAt:
          row.accepted_at == null ? undefined : Number(row.accepted_at),
        completedAt:
          row.completed_at == null ? undefined : Number(row.completed_at),
      }));
  return state;
}
async function save(query: Query, state: State) {
  for (const user of state.users)
    await query(
      "INSERT INTO app_users(id,provider_key,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      [user.id, user.providerKey, JSON.stringify(user)],
    );
  for (const device of state.devices)
    await query(
      "INSERT INTO devices(id,owner_id,claim_hash,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id,data=excluded.data",
      [
        device.id,
        device.ownerId ?? null,
        device.claimHash,
        JSON.stringify(device),
      ],
    );
  for (const item of state.encounters)
    await query(
      "INSERT INTO encounters(id,pair_key,detected_at,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      [item.id, item.pairKey, item.detectedAt, JSON.stringify(item)],
    );
  for (const quest of state.quests)
    await query(
      "INSERT INTO quests(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      [quest.id, JSON.stringify(quest)],
    );
  for (const session of state.sessions) {
    const { participants, ...data } = session;
    await query(
      "INSERT INTO quest_sessions(id,encounter_id,quest_id,status,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET status=excluded.status,data=excluded.data",
      [
        session.id,
        session.encounterId,
        session.questId,
        session.status,
        JSON.stringify(data),
      ],
    );
    for (const person of participants)
      await query(
        "INSERT INTO participants(session_id,user_id,accepted_at,completed_at) VALUES($1,$2,$3,$4) ON CONFLICT(session_id,user_id) DO UPDATE SET accepted_at=excluded.accepted_at,completed_at=excluded.completed_at",
        [
          session.id,
          person.userId,
          person.acceptedAt ?? null,
          person.completedAt ?? null,
        ],
      );
  }
}
export async function migrate(client?: PoolClient) {
  if (client) {
    await client.query(migration());
    await client.query(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(1,$1) ON CONFLICT(version) DO NOTHING",
      [new Date().toISOString()],
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL before running live migrations.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
    query_timeout: 10_000,
  });
  try {
    await pool.query(migration());
    await pool.query(
      "INSERT INTO schema_migrations(version,applied_at) VALUES(1,$1) ON CONFLICT(version) DO NOTHING",
      [new Date().toISOString()],
    );
  } finally {
    await pool.end();
  }
}
export async function transact<T>(
  demo: boolean,
  operation: (state: State) => T | Promise<T>,
): Promise<T> {
  const run = async () => {
    if (demo) {
      if (!globals.questgoDemoDb) {
        const directory =
          process.env.QUESTGO_DATA_DIR || path.join(process.cwd(), ".questgo");
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        const db = new DatabaseSync(path.join(directory, "demo.sqlite"));
        db.exec(
          "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
        );
        db.exec(migration());
        globals.questgoDemoDb = db;
      }
      const db = globals.questgoDemoDb;
      const query: Query = async (sql, args = []) => {
        const ordered: unknown[] = [];
        const sqliteSql = sql.replace(/\$(\d+)/g, (_, index) => {
          ordered.push(args[Number(index) - 1]);
          return "?";
        });
        const statement = db.prepare(sqliteSql);
        if (sql.trim().toUpperCase().startsWith("SELECT"))
          return statement.all(
            ...(ordered as (string | number | null)[]),
          ) as Row[];
        statement.run(...(ordered as (string | number | null)[]));
        return [];
      };
      db.exec("BEGIN IMMEDIATE");
      try {
        const state = await load(query);
        const result = await operation(state);
        await save(query, state);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    if (!process.env.DATABASE_URL)
      throw new Error(
        "Live storage is not configured. Set DATABASE_URL or use the demo.",
      );
    globals.questgoPool ??= new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 8000,
      query_timeout: 10_000,
    });
    const client = await globals.questgoPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(7823471)");
      const query: Query = async (sql, args = []) =>
        (await client.query(sql, args)).rows;
      const state = await load(query);
      const result = await operation(state);
      await save(query, state);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };
  const pending = (globals.questgoQueue ?? Promise.resolve()).then(run, run);
  globals.questgoQueue = pending.catch(() => {});
  return pending;
}

// A single transactional write path keeps acceptance, deduplication and completion atomic.
export type { QuestSession };
