import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  normalizePhoto,
  readAchievementPhoto,
  storeAchievementPhoto,
  retryPhotoValidation,
} from "../src/lib/achievement-photos";
import { transact } from "../src/lib/store";
import {
  encounter,
  hash,
  makeUser,
  sessionAction,
  setAvailable,
  view,
} from "../src/lib/domain";

process.env.QUESTGO_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), "questgo-store-"),
);
test("persisted transactions serialize racing accepts and completions", async () => {
  const sessionId = await transact(true, (state) => {
    for (const id of ["a", "b"]) {
      const user = makeUser(id, id);
      user.id = id;
      user.demoRoom = "test-room";
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
      eventId: "event",
      deviceId: "a",
      nearbyDeviceId: "b",
      detectedAt: Date.now(),
    }).session!.id;
  });
  await Promise.all(
    ["a", "b"].map((id) =>
      transact(true, (state) => sessionAction(state, id, sessionId, "accept")),
    ),
  );
  assert.equal(
    (await transact(true, (state) => view(state, "a"))).session!.status,
    "active",
  );
  const encoded = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "#5a8055" },
  })
    .png()
    .toBuffer();
  const image = await normalizePhoto(encoded, "image/png");
  const approve = async (
    quest: Parameters<typeof import("../shared/quest-ai").validateQuest>[0],
  ) => ({
    completed: true,
    confidence: 0.9,
    reasoning: "Fixture",
    criteria: quest.completionCriteria.map((criterion) => ({
      criterion,
      met: true,
      evidence: "Fixture",
    })),
  });
  const rejected = await storeAchievementPhoto(
    true,
    "a",
    sessionId,
    image,
    "a",
    true,
    async (quest) => ({
      ...(await approve(quest)),
      completed: false,
      criteria: quest.completionCriteria.map((criterion) => ({
        criterion,
        met: false,
        evidence: "Missing",
      })),
    }),
  );
  const originalId = rejected.session!.people[0].photo!.id;
  await assert.rejects(
    transact(true, (state) => sessionAction(state, "a", sessionId, "complete")),
  );
  const failed = await retryPhotoValidation(
    true,
    "a",
    sessionId,
    originalId,
    async () => {
      throw new Error("private upstream detail");
    },
  );
  assert.equal(failed.session!.people[0].photo!.validation!.status, "error");
  assert.ok(
    !failed.session!.people[0].photo!.validation!.reasoning.includes(
      "private upstream",
    ),
  );
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const oldCheck = retryPhotoValidation(
    true,
    "a",
    sessionId,
    originalId,
    async (quest) => {
      entered();
      await wait;
      return approve(quest);
    },
  );
  await ready;
  const newer = await storeAchievementPhoto(
    true,
    "a",
    sessionId,
    image,
    "a",
    true,
    async (quest) => ({
      ...(await approve(quest)),
      completed: false,
      criteria: quest.completionCriteria.map((criterion) => ({
        criterion,
        met: false,
        evidence: "Missing",
      })),
    }),
  );
  release();
  await oldCheck;
  const current = await transact(true, (state) => view(state, "a", true));
  assert.equal(
    current.session!.people[0].photo!.id,
    newer.session!.people[0].photo!.id,
  );
  assert.equal(
    current.session!.people[0].photo!.validation!.status,
    "rejected",
  );
  await assert.rejects(
    retryPhotoValidation(true, "a", sessionId, originalId, approve),
  );
  for (const user of ["a", "b"])
    await storeAchievementPhoto(true, user, sessionId, image);
  await transact(true, async (_state, query) => {
    const rows = await query(
      "SELECT id FROM questgo_photo_submissions WHERE session_id=$1",
      [sessionId],
    );
    assert.equal(rows.length, 4);
    assert.ok(rows.some((row) => row.id === originalId));
    const checks = await query(
      "SELECT status FROM questgo_photo_validations WHERE photo_id=$1",
      [originalId],
    );
    assert.equal(checks.length, 6);
  });
  assert.deepEqual(
    await readAchievementPhoto(true, "b", sessionId, "a"),
    image.data,
  );
  await assert.rejects(readAchievementPhoto(true, "outsider", sessionId, "a"));
  await Promise.all(
    ["a", "b", "a", "b"].map((id) =>
      transact(true, (state) =>
        sessionAction(state, id, sessionId, "complete"),
      ),
    ),
  );
  const saved = await transact(true, (state) => view(state, "b"));
  assert.equal(saved.session!.status, "completed");
  assert.equal(saved.completedCount, 1);
  assert.equal(saved.streak, 1);
  assert.ok(saved.session!.people.every((person) => person.photo));
  await assert.rejects(storeAchievementPhoto(true, "a", sessionId, image));
  await transact(true, async (_state, query) => {
    const rows = await query(
      "SELECT evidence_json FROM questgo_achievements WHERE session_id=$1",
      [sessionId],
    );
    assert.equal(rows.length, 1);
    assert.equal(
      JSON.parse(String(rows[0].evidence_json)).participants.length,
      2,
    );
  });
});
