import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/lib/model";
import {
  claimDevice,
  encounter,
  getUser,
  hash,
  makeUser,
  sessionAction,
  setAvailable,
  view,
} from "../src/lib/domain";

const now = Date.UTC(2026, 9, 24, 15);
function setup() {
  const state = emptyState();
  for (const id of ["a", "b", "outsider"]) {
    const user = makeUser(id, id);
    user.id = id;
    user.onboarded = true;
    state.users.push(user);
  }
  state.devices.push(
    ...["a", "b"].map((id) => ({
      id,
      ownerId: id,
      claimHash: hash(id),
      keyHash: hash(id),
      lastSeen: now,
    })),
  );
  setAvailable(state, "a", true, now);
  setAvailable(state, "b", true, now);
  const input = {
    eventId: "event",
    deviceId: "a",
    nearbyDeviceId: "b",
    detectedAt: now,
  };
  return { state, input };
}
test("one shared session, reversed proximity and retries deduplicate", () => {
  const { state, input } = setup();
  const first = encounter(state, input, now);
  const second = encounter(
    state,
    { ...input, eventId: "reversed", deviceId: "b", nearbyDeviceId: "a" },
    now + 1,
  );
  assert.equal(first.session!.id, second.session!.id);
  assert.equal(state.sessions.length, 1);
});
test("both accept, both complete, retries award one completion", () => {
  const { state, input } = setup();
  const { session } = encounter(state, input, now);
  assert.throws(() => sessionAction(state, "a", session!.id, "complete", now));
  sessionAction(state, "a", session!.id, "accept", now);
  assert.equal(session!.status, "offer");
  sessionAction(state, "b", session!.id, "accept", now);
  assert.equal(session!.status, "active");
  sessionAction(state, "a", session!.id, "complete", now);
  assert.equal(session!.status, "active");
  sessionAction(state, "b", session!.id, "complete", now);
  sessionAction(state, "b", session!.id, "complete", now);
  assert.equal(view(state, "a", false, now).completedCount, 1);
  assert.equal(view(state, "b", false, now).streak, 1);
});
test("outsiders cannot act, unavailable people cannot match, claims cannot transfer ownership", () => {
  const { state, input } = setup();
  getUser(state, "b").availableUntil = undefined;
  assert.throws(() => encounter(state, input, now));
  setAvailable(state, "b", true, now);
  const { session } = encounter(state, input, now);
  assert.throws(() =>
    sessionAction(state, "outsider", session!.id, "accept", now),
  );
  assert.throws(() => claimDevice(state, "outsider", "a"));
});
test("skip, withdraw, expiry and cancellation never award credit", () => {
  const { state, input } = setup();
  const { session } = encounter(state, input, now);
  sessionAction(state, "a", session!.id, "accept", now);
  sessionAction(state, "a", session!.id, "withdraw", now);
  assert.equal(session!.participants[0].acceptedAt, undefined);
  sessionAction(state, "b", session!.id, "skip", now);
  assert.equal(view(state, "a", false, now).streak, 0);
  const next = setup();
  const expired = encounter(next.state, next.input, now).session!;
  assert.equal(
    view(next.state, "a", false, now + 300_001).session!.status,
    "expired",
  );
  assert.throws(() =>
    sessionAction(next.state, "a", expired.id, "accept", now + 300_001),
  );
});
test("same-day completions count once and yesterday keeps the streak", () => {
  const { state, input } = setup();
  const session = encounter(state, input, now).session!;
  for (const user of ["a", "b"])
    sessionAction(state, user, session.id, "accept", now);
  for (const user of ["a", "b"])
    sessionAction(state, user, session.id, "complete", now);
  const later = now + 600_001;
  for (const device of state.devices) device.lastSeen = later;
  for (const id of ["a", "b"]) setAvailable(state, id, true, later);
  const second = encounter(
    state,
    { ...input, eventId: "second-event", detectedAt: later },
    later,
  ).session!;
  for (const user of ["a", "b"])
    sessionAction(state, user, second.id, "accept", later);
  for (const user of ["a", "b"])
    sessionAction(state, user, second.id, "complete", later);
  assert.equal(view(state, "a", false, later).completedCount, 2);
  assert.equal(view(state, "a", false, later).streak, 1);
  assert.equal(view(state, "a", false, now + 86_400_000).streak, 1);
  assert.equal(view(state, "a", false, now + 2 * 86_400_000).streak, 0);
});
test("mixed modes respect Work mode, lower time and lower budget", () => {
  const { state, input } = setup();
  getUser(state, "b").preferences = {
    ...getUser(state, "b").preferences,
    mode: "work",
    minutes: 5,
    budget: 0,
  };
  const session = encounter(state, input, now, true).session!;
  const quest = state.quests.find((entry) => entry.id === session.questId)!;
  assert.equal(quest.mode, "work");
  assert.ok(quest.minutes <= 5);
  assert.equal(quest.costEstimate, 0);
});
