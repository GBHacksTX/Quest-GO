import { createHash, randomUUID } from "node:crypto";
import { type State, type User, type Quest, type QuestSession, type AppView } from "./model";

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const isOpen = (session: QuestSession) => session.status === "offer" || session.status === "active";
export const DEFAULT_PREFERENCES = { mode: "normal" as const, minutes: 30, budget: 10, interests: ["Explore", "Coffee"], area: "" };
export function makeUser(providerKey: string, displayName: string): User {
  return { id: randomUUID(), providerKey, displayName, onboarded: false, preferences: structuredClone(DEFAULT_PREFERENCES) };
}
export function getUser(state: State, id: string): User {
  const user = state.users.find((entry) => entry.id === id);
  if (!user) throw new AppError("Please sign in again.", 401);
  return user;
}
export function expireSessions(state: State, now = Date.now()) {
  for (const session of state.sessions) {
    if (session.generationStatus === "pending" && session.generationStartedAt && now - session.generationStartedAt > 30_000) session.generationStatus = "unavailable";
    if (isOpen(session) && session.expiresAt <= now) {
      session.status = "expired";
      session.reason = "This quest's response window ended. You can become available again.";
    }
  }
}
export function setAvailable(state: State, userId: string, available: boolean, now = Date.now()) {
  expireSessions(state, now);
  const user = getUser(state, userId);
  if (available) {
    if (!user.onboarded) throw new AppError("Finish your preferences first.");
    if (!state.devices.some((device) => device.ownerId === userId)) throw new AppError("Connect your device first.");
    if (!user.demoRoom && !state.devices.some((device) => device.ownerId === userId && device.lastSeen && now - device.lastSeen < 90_000)) throw new AppError("Your device hasn't reported recently. Check its Wi-Fi connection before becoming available.");
    if (state.sessions.some((session) => isOpen(session) && session.participants.some((person) => person.userId === userId))) throw new AppError("Finish or leave your current quest first.");
  }
  user.availableUntil = available ? now + 45_000 : undefined;
}
export function claimDevice(state: State, userId: string, code: string) {
  getUser(state, userId);
  const device = state.devices.find((entry) => entry.claimHash === hash(code));
  if (!device) throw new AppError("That pairing code was not found. Check the code supplied with your device.");
  if (device.ownerId && device.ownerId !== userId) throw new AppError("This device is already linked to another account.", 409);
  device.ownerId = userId;
}
export function sampleQuest(mode: "normal" | "work" = "normal", minutes = 15): Quest {
  return {
    id: randomUUID(), title: mode === "work" ? "A fresh perspective" : "A little coffee, a good story",
    description: mode === "work" ? "Step away from your screens and trade one idea that has been on your mind." : "Find a cozy corner together. Trade your favorite local discovery over a drink of your choice.",
    steps: mode === "work" ? ["Take a short walk somewhere comfortable for both of you.", "Share one thing you're working on and one thing you're curious about.", "Return with a fresh perspective and confirm together."] : ["Choose a nearby café you both feel comfortable visiting.", "Each share a place, song, or small discovery you love.", "Before you leave, choose one thing you'd like to explore next."],
    minutes: Math.min(minutes, 15), costEstimate: 5, mode, source: "demo",
    venue: { name: "The neighborhood café", address: "Illustrative venue · choose somewhere together", url: "" },
  };
}
export function fallbackQuest(mode: "normal" | "work", minutes: number): Quest {
  return { id: randomUUID(), title: "Find a little wonder", description: "A free activity while nearby venue suggestions are unavailable.", steps: ["Choose a comfortable public place nearby together.", "Each notice one small detail you would normally walk past.", "Share what caught your eye, then confirm when you're both done."], minutes: Math.min(minutes, 10), costEstimate: 0, mode, source: "fallback" };
}
export function encounter(state: State, input: { eventId: string; deviceId: string; nearbyDeviceId: string; detectedAt: number }, now = Date.now(), demo = false) {
  expireSessions(state, now);
  if (input.detectedAt > now + 60_000 || input.detectedAt < now - 300_000) throw new AppError("Encounter timestamp must be within the last five minutes.");
  const a = state.devices.find((device) => device.id === input.deviceId);
  const b = state.devices.find((device) => device.id === input.nearbyDeviceId);
  if (!a || !b || a.id === b.id) throw new AppError("Two different registered devices are required.");
  a.lastSeen = now;
  if (!a.ownerId || !b.ownerId || a.ownerId === b.ownerId) throw new AppError("The devices must belong to two different people.");
  const pairKey = [a.id, b.id].sort().join(":");
  const duplicate = state.encounters.find((entry) => entry.id === input.eventId || (entry.pairKey === pairKey && now - entry.detectedAt < 600_000));
  if (duplicate && duplicate.pairKey !== pairKey) throw new AppError("This event identifier belongs to another device pair.", 409);
  if (duplicate) return { session: state.sessions.find((session) => session.encounterId === duplicate.id), duplicate: true };
  const users = [getUser(state, a.ownerId), getUser(state, b.ownerId)];
  if (users.some((user) => !user.onboarded || !user.availableUntil || user.availableUntil <= now)) throw new AppError("Both people need to be available with QuestGo open.", 409);
  if (users.some((user) => state.sessions.some((session) => isOpen(session) && session.participants.some((person) => person.userId === user.id)))) throw new AppError("Someone already has a quest in progress.", 409);
  const mode = users.some((user) => user.preferences.mode === "work") ? "work" : "normal";
  const minutes = Math.min(...users.map((user) => user.preferences.minutes));
  const budget = Math.min(...users.map((user) => user.preferences.budget));
  const quest = demo ? sampleQuest(mode, minutes) : fallbackQuest(mode, minutes);
  if (quest.costEstimate !== null && quest.costEstimate > budget) { quest.costEstimate = 0; quest.venue = undefined; quest.title = "A small discovery, together"; quest.description = "Take a free wander and share something new you notice."; quest.steps = fallbackQuest(quest.mode, minutes).steps; }
  const session: QuestSession = { id: randomUUID(), encounterId: input.eventId, questId: quest.id, status: "offer", createdAt: now, expiresAt: now + 300_000, participants: users.map((user) => ({ userId: user.id })) };
  state.encounters.push({ id: input.eventId, pairKey, deviceIds: [a.id, b.id], userIds: users.map((user) => user.id), detectedAt: now });
  state.quests.push(quest); state.sessions.push(session);
  for (const user of users) user.availableUntil = undefined;
  return { session, duplicate: false };
}
export function sessionAction(state: State, userId: string, sessionId: string, action: "accept" | "withdraw" | "skip" | "complete" | "leave", now = Date.now()) {
  expireSessions(state, now);
  const session = state.sessions.find((entry) => entry.id === sessionId && entry.participants.some((person) => person.userId === userId));
  if (!session) throw new AppError("Quest not found.", 404);
  const participant = session.participants.find((person) => person.userId === userId)!;
  if (action === "complete" && session.status === "completed") return;
  if (action === "accept" && session.status === "active" && participant.acceptedAt) return;
  if (!isOpen(session)) throw new AppError("This quest has already ended.", 409);
  if (action === "accept" || action === "withdraw") {
    if (session.status !== "offer") throw new AppError("The quest has already started.", 409);
    if (action === "accept" && session.generationStatus === "pending") throw new AppError("Your nearby suggestion is still being prepared. Please try again in a moment.", 409);
    participant.acceptedAt = action === "accept" ? participant.acceptedAt ?? now : undefined;
    if (session.participants.every((person) => person.acceptedAt)) { session.status = "active"; session.startedAt = now; session.expiresAt = now + 86_400_000; }
  } else if (action === "complete") {
    if (session.status !== "active") throw new AppError("Both people must accept before confirming completion.", 409);
    participant.completedAt ??= now;
    if (session.participants.every((person) => person.completedAt)) { session.status = "completed"; session.completedAt = now; }
  } else {
    if (action === "skip" && session.status !== "offer") throw new AppError("Use Leave quest for an activity that has started.", 409);
    session.status = "cancelled"; session.reason = "This quest ended without completion credit. You can become available again.";
  }
}
export function view(state: State, userId: string, demo = false, now = Date.now()): AppView {
  expireSessions(state, now);
  const user = getUser(state, userId);
  const sessions = state.sessions.filter((session) => session.participants.some((person) => person.userId === userId)).sort((a, b) => b.createdAt - a.createdAt);
  const render = (session: QuestSession) => ({ ...session, quest: state.quests.find((quest) => quest.id === session.questId)!, people: session.participants.map((person) => ({ id: person.userId, name: getUser(state, person.userId).displayName, accepted: !!person.acceptedAt, completed: !!person.completedAt })) });
  const history = sessions.filter((session) => session.status === "completed").map(render);
  const days = new Set(history.map((session) => new Date(session.completedAt!).toISOString().slice(0, 10)));
  const day = new Date(now); day.setUTCHours(0, 0, 0, 0);
  if (!days.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
  let streak = 0;
  while (days.has(day.toISOString().slice(0, 10))) { streak++; day.setUTCDate(day.getUTCDate() - 1); }
  const current = sessions.find(isOpen) ?? (sessions[0]?.id !== user.dismissedSessionId ? sessions[0] : undefined);
  return { user, devices: state.devices.filter((device) => device.ownerId === userId).map(({ id, lastSeen }) => ({ id, lastSeen })), session: current ? render(current) : undefined, history, streak, completedCount: history.length, demo, demoRoom: user.demoRoom, partnerName: demo ? state.users.find((person) => person.demoRoom === user.demoRoom && person.id !== userId)?.displayName : undefined };
}
