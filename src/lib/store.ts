import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { emptyState, type State, type QuestSession } from "./model";

type Row = Record<string, unknown>;
export type Query = (sql: string, args?: unknown[]) => Promise<Row[]>;
const globals = globalThis as typeof globalThis & {
  questgoQueue?: Promise<unknown>;
  questgoSqlite?: Map<string, { db: DatabaseSync; version: number }>;
  questgoPool?: Pool;
};
const migrations = readdirSync(path.join(process.cwd(), "migrations"))
  .filter((file) => /^\d+_.*\.sql$/.test(file))
  .sort()
  .map((file) => ({
    version: Number(file.split("_")[0]),
    sql: readFileSync(path.join(process.cwd(), "migrations", file), "utf8"),
  }));
export function storageMode(): "sqlite" | "postgres" {
  const mode = process.env.QUESTGO_STORAGE || "sqlite";
  if (mode !== "sqlite" && mode !== "postgres")
    throw new Error("Set QUESTGO_STORAGE to sqlite or postgres.");
  return mode;
}
export const liveStorageReady = () =>
  storageMode() === "sqlite" || !!process.env.DATABASE_URL;
// Keep the user's other datasets and similarly named public tables untouched.
export const APP_SCHEMA = "questgo_app";
export const postgresOptions = {
  options: `-c search_path=${APP_SCHEMA},pg_catalog`,
  connectionTimeoutMillis: 8000,
  query_timeout: 10_000,
};

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
  const photos = await query(
    "SELECT id, session_id, user_id, width, height, size_bytes, uploaded_at FROM achievement_photos",
  );
  const submissions = await query(
    "SELECT id,session_id,user_id,revision,width,height,size_bytes,uploaded_at FROM questgo_photo_submissions ORDER BY revision DESC",
  );
  const validations = await query(
    "SELECT photo_id,data,ordinal FROM questgo_photo_validations ORDER BY ordinal DESC",
  );
  for (const session of state.sessions)
    session.participants = participants
      .filter((row) => row.session_id === session.id)
      .map((row) => {
        const submission = submissions.find(
          (entry) =>
            entry.session_id === row.session_id &&
            entry.user_id === row.user_id,
        );
        const photo =
          submission ||
          photos.find(
            (entry) =>
              entry.session_id === row.session_id &&
              entry.user_id === row.user_id,
          );
        return {
          userId: String(row.user_id),
          acceptedAt:
            row.accepted_at == null ? undefined : Number(row.accepted_at),
          completedAt:
            row.completed_at == null ? undefined : Number(row.completed_at),
          photo: photo
            ? {
                id: String(photo.id),
                uploadedAt: Number(photo.uploaded_at),
                width: Number(photo.width),
                height: Number(photo.height),
                size: Number(photo.size_bytes),
                revision: submission ? Number(submission.revision) : undefined,
                validation: submission
                  ? JSON.parse(
                      String(
                        validations.find(
                          (entry) => entry.photo_id === submission.id,
                        )?.data || "null",
                      ),
                    ) || undefined
                  : undefined,
              }
            : undefined,
        };
      });
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
    if (
      session.status === "completed" &&
      session.completedAt &&
      participants.every(
        (person) =>
          person.photo?.validation?.status === "approved" &&
          (state.users.find((user) => user.id === person.userId)?.demoRoom ||
            person.photo.validation.provider === "meta"),
      )
    ) {
      await query(
        "INSERT INTO questgo_achievements(id,session_id,completed_at,evidence_json) VALUES($1,$2,$3,$4) ON CONFLICT(session_id) DO NOTHING",
        [
          session.id,
          session.id,
          session.completedAt,
          JSON.stringify({
            questId: session.questId,
            participants: participants.map((person) => ({
              userId: person.userId,
              photoId: person.photo!.id,
              validationId: person.photo!.validation!.id,
            })),
          }),
        ],
      );
    }
  }
}
export async function migrate() {
  if (storageMode() === "sqlite") {
    await transact(false, () => undefined);
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL before running live migrations.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...postgresOptions,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7823472)");
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${APP_SCHEMA}`);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const applied = new Set(
      (await client.query("SELECT version FROM schema_migrations")).rows.map(
        (row) => Number(row.version),
      ),
    );
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations(version,applied_at) VALUES($1,$2)",
        [migration.version, new Date().toISOString()],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
export async function transact<T>(
  demo: boolean,
  operation: (state: State, query: Query) => T | Promise<T>,
): Promise<T> {
  const run = async () => {
    if (demo || storageMode() === "sqlite") {
      const directory =
        process.env.QUESTGO_DATA_DIR || path.join(process.cwd(), ".questgo");
      const file = path.join(
        directory,
        demo ? "demo.sqlite" : "accounts.sqlite",
      );
      const databases = (globals.questgoSqlite ??= new Map<
        string,
        { db: DatabaseSync; version: number }
      >());
      let entry = databases.get(file);
      if (!entry) {
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        const db = new DatabaseSync(file);
        db.exec(
          "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
        );
        entry = { db, version: 0 };
        databases.set(file, entry);
      }
      const db = entry.db;
      if (entry.version !== migrations.length) {
        db.exec("BEGIN IMMEDIATE");
        try {
          db.exec(
            "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
          );
          const applied = new Set(
            db
              .prepare("SELECT version FROM schema_migrations")
              .all()
              .map((row) => Number(row.version)),
          );
          for (const migration of migrations) {
            if (applied.has(migration.version)) continue;
            db.exec(migration.sql);
            db.prepare(
              "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
            ).run(migration.version, new Date().toISOString());
          }
          db.exec("COMMIT");
          entry.version = migrations.length;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
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
        const result = await operation(state, query);
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
      ...postgresOptions,
    });
    const client = await globals.questgoPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(7823471)");
      const query: Query = async (sql, args = []) =>
        (await client.query(sql, args)).rows;
      const state = await load(query);
      const result = await operation(state, query);
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
