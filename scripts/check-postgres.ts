import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import {
  normalizePhoto,
  readAchievementPhoto,
  storeAchievementPhoto,
} from "../src/lib/achievement-photos";
import { migrate, transact, postgresOptions } from "../src/lib/store";
import {
  encounter,
  hash,
  makeUser,
  sessionAction,
  setAvailable,
  view,
} from "../src/lib/domain";

async function main() {
  const url = process.env.QUESTGO_TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "Set QUESTGO_TEST_DATABASE_URL to a disposable local questgo_test database.",
    );
  const target = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.pathname !== "/questgo_test"
  )
    throw new Error(
      "This check only runs against a local database named questgo_test.",
    );
  process.env.DATABASE_URL = url;
  const sentinel = new Pool({ connectionString: url });
  await sentinel.query(
    "CREATE TABLE IF NOT EXISTS public.app_users(id TEXT PRIMARY KEY,data TEXT NOT NULL)",
  );
  await sentinel.query(
    "INSERT INTO public.app_users(id,data) VALUES('existing-dataset','keep this record') ON CONFLICT(id) DO NOTHING",
  );
  await sentinel.end();
  await migrate();
  const prefix = randomUUID();
  const ids = [`${prefix}-a`, `${prefix}-b`];
  const sessionId = await transact(false, (state) => {
    for (const id of ids) {
      const user = makeUser(id, id);
      user.id = id;
      user.onboarded = true;
      state.users.push(user);
      state.devices.push({
        id,
        ownerId: id,
        claimHash: hash(id),
        keyHash: hash(id),
        lastSeen: Date.now(),
      });
      setAvailable(state, id, true);
    }
    return encounter(state, {
      eventId: prefix,
      deviceId: ids[0],
      nearbyDeviceId: ids[1],
      detectedAt: Date.now(),
    }).session!.id;
  });
  await Promise.all(
    ids.map((id) =>
      transact(false, (state) => sessionAction(state, id, sessionId, "accept")),
    ),
  );
  const source = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "#5a8055" },
  })
    .png()
    .toBuffer();
  const image = await normalizePhoto(source, "image/png");
  await Promise.all(
    ids.map((id) =>
      storeAchievementPhoto(
        false,
        id,
        sessionId,
        image,
        id,
        true,
        async (quest) => ({
          completed: true,
          confidence: 1,
          reasoning: "Test fixture",
          criteria: quest.completionCriteria.map((criterion) => ({
            criterion,
            met: true,
            evidence: "Test fixture",
          })),
        }),
      ),
    ),
  );
  assert.deepEqual(
    await readAchievementPhoto(false, ids[1], sessionId, ids[0]),
    image.data,
  );
  await transact(false, (state) =>
    sessionAction(state, ids[0], sessionId, "complete"),
  );
  await migrate();
  assert.ok(
    (
      await transact(false, (state) => view(state, ids[0]))
    ).session!.people.find((person) => person.id === ids[0])!.completed,
  );
  await Promise.all(
    [...ids, ...ids].map((id) =>
      transact(false, (state) =>
        sessionAction(state, id, sessionId, "complete"),
      ),
    ),
  );
  const result = await transact(false, (state) => view(state, ids[0]));
  assert.equal(result.session!.status, "completed");
  assert.equal(result.completedCount, 1);
  assert.equal(result.streak, 1);
  assert.ok(result.session!.people.every((person) => person.photo));
  await migrate();
  const client = new Pool({ connectionString: url, ...postgresOptions });
  try {
    assert.equal(
      Number(
        (
          await client.query(
            "SELECT COUNT(*) AS total FROM questgo_achievements WHERE session_id=$1",
            [sessionId],
          )
        ).rows[0].total,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await client.query(
            "SELECT COUNT(*) AS total FROM questgo_photo_submissions WHERE session_id=$1",
            [sessionId],
          )
        ).rows[0].total,
      ),
      2,
    );
    assert.equal(
      Number(
        (
          await client.query(
            "SELECT COUNT(*) AS total FROM questgo_photo_validations WHERE photo_id IN (SELECT id FROM questgo_photo_submissions WHERE session_id=$1)",
            [sessionId],
          )
        ).rows[0].total,
      ),
      4,
    );
    assert.equal(
      (
        await client.query(
          "SELECT data FROM public.app_users WHERE id='existing-dataset'",
        )
      ).rows[0].data,
      "keep this record",
    );
    await assert.rejects(
      client.query(
        "INSERT INTO participants(session_id,user_id) VALUES($1,$2)",
        [sessionId, ids[0]],
      ),
      (error: unknown) => (error as { code: string }).code === "23505",
    );
    await assert.rejects(
      client.query(
        "INSERT INTO participants(session_id,user_id) VALUES($1,$2)",
        [sessionId, "missing-user"],
      ),
      (error: unknown) => (error as { code: string }).code === "23503",
    );
    assert.equal(
      (
        await client.query(
          "SELECT count(*) FROM schema_migrations WHERE version=1",
        )
      ).rows[0].count,
      "1",
    );
  } finally {
    await client.end();
  }
  console.log(
    "PostgreSQL verified: versioned migrations, private photos, racing accepts/completions, streak retry safety and relational constraints.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      error instanceof Error && !/password|postgres:/.test(error.message)
        ? error.message
        : "PostgreSQL check failed.",
    );
    process.exit(1);
  });
