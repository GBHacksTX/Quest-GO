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
  for (const user of ["a", "b"])
    await storeAchievementPhoto(true, user, sessionId, image);
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
});
