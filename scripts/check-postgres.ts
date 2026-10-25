import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrate, transact } from "../src/lib/store";
import { encounter, hash, makeUser, sessionAction, setAvailable, view } from "../src/lib/domain";

async function main() {
  const url = process.env.QUESTGO_TEST_DATABASE_URL;
  if (!url) throw new Error("Set QUESTGO_TEST_DATABASE_URL to a disposable local questgo_test database.");
  const target = new URL(url);
  if (!["localhost", "127.0.0.1"].includes(target.hostname) || target.pathname !== "/questgo_test") throw new Error("This check only runs against a local database named questgo_test.");
  process.env.DATABASE_URL = url;
  await migrate();
  const prefix = randomUUID(); const ids = [`${prefix}-a`, `${prefix}-b`];
  const sessionId = await transact(false, (state) => {
    for (const id of ids) {
      const user = makeUser(id, id); user.id = id; user.onboarded = true; state.users.push(user);
      state.devices.push({ id, ownerId: id, claimHash: hash(id), keyHash: hash(id), lastSeen: Date.now() });
      setAvailable(state, id, true);
    }
    return encounter(state, { eventId: prefix, deviceId: ids[0], nearbyDeviceId: ids[1], detectedAt: Date.now() }).session!.id;
  });
  await Promise.all(ids.map((id) => transact(false, (state) => sessionAction(state, id, sessionId, "accept"))));
  await Promise.all([...ids, ...ids].map((id) => transact(false, (state) => sessionAction(state, id, sessionId, "complete"))));
  const result = await transact(false, (state) => view(state, ids[0]));
  assert.equal(result.session!.status, "completed"); assert.equal(result.completedCount, 1); assert.equal(result.streak, 1);
  const client = new Pool({ connectionString: url });
  try {
    await assert.rejects(client.query("INSERT INTO participants(session_id,user_id) VALUES($1,$2)", [sessionId, ids[0]]), (error: unknown) => (error as { code: string }).code === "23505");
    await assert.rejects(client.query("INSERT INTO participants(session_id,user_id) VALUES($1,$2)", [sessionId, "missing-user"]), (error: unknown) => (error as { code: string }).code === "23503");
    assert.equal((await client.query("SELECT count(*) FROM schema_migrations WHERE version=1")).rows[0].count, "1");
  } finally { await client.end(); }
  console.log("PostgreSQL verified: migration, real writes/reads, racing accepts/completions, retry safety, unique participation and foreign keys.");
}
main().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error && !/password|postgres:/.test(error.message) ? error.message : "PostgreSQL check failed."); process.exit(1); });
