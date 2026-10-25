import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actor } from "@/lib/identity";
import { transact } from "@/lib/store";
import { AppError, claimDevice, encounter, expireSessions, getUser, isOpen, sessionAction, setAvailable, view } from "@/lib/domain";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";

const preferences = z.object({ mode: z.enum(["normal", "work"]), minutes: z.number().int().min(5).max(180), budget: z.number().min(0).max(500), interests: z.array(z.string().min(1).max(40)).min(1).max(8), area: z.string().trim().min(2).max(120), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() });
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), displayName: z.string().trim().min(2).max(32), preferences }),
  z.object({ action: z.literal("availability"), available: z.boolean() }),
  z.object({ action: z.literal("claim"), code: z.string().trim().min(4).max(200) }),
  z.object({ action: z.literal("session"), sessionId: z.string().uuid(), operation: z.enum(["accept", "withdraw", "skip", "complete", "leave"]) }),
  z.object({ action: z.literal("dismiss"), sessionId: z.string().uuid() }),
  z.object({ action: z.literal("demoEncounter") }),
  z.object({ action: z.literal("demoPartner"), sessionId: z.string().uuid(), operation: z.enum(["accept", "skip", "complete"]) }),
]);
export async function GET() {
  try {
    const identity = await actor();
    const data = await transact(identity.demo, (state) => {
      const user = getUser(state, identity.id);
      const now = Date.now();
      if (user.availableUntil && user.availableUntil > now) user.availableUntil = now + 45_000;
      return view(state, identity.id, identity.demo);
    });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const identity = await actor(); limit(`actions:${identity.id}`, 100);
    const input = await jsonBody(request, command);
    const data = await transact(identity.demo, (state) => {
      expireSessions(state);
      const user = getUser(state, identity.id);
      if (input.action === "profile") { user.displayName = input.displayName; user.preferences = input.preferences; user.onboarded = true; user.availableUntil = undefined; }
      if (input.action === "availability") setAvailable(state, user.id, input.available);
      if (input.action === "claim") { limit(`claim:${user.id}`, 8); claimDevice(state, user.id, input.code); }
      if (input.action === "session") sessionAction(state, user.id, input.sessionId, input.operation);
      if (input.action === "dismiss") {
        const session = state.sessions.find((entry) => entry.id === input.sessionId && entry.participants.some((person) => person.userId === user.id));
        if (!session || isOpen(session)) throw new AppError("Finish or leave the quest before returning home.");
        user.dismissedSessionId = session.id;
      }
      if (input.action === "demoEncounter" || input.action === "demoPartner") {
        if (!identity.demo || !user.demoRoom) throw new AppError("Demo controls are unavailable for real accounts.", 403);
        const partner = state.users.find((entry) => entry.demoRoom === user.demoRoom && entry.id !== user.id)!;
        if (input.action === "demoEncounter") {
          const a = state.devices.find((device) => device.ownerId === user.id);
          const b = state.devices.find((device) => device.ownerId === partner.id);
          if (!a || !b) throw new AppError("Connect the sample device first.");
          partner.preferences.mode = user.preferences.mode; partner.preferences.minutes = user.preferences.minutes; partner.preferences.budget = user.preferences.budget;
          setAvailable(state, partner.id, true); a.lastSeen = Date.now(); b.lastSeen = Date.now();
          const result = encounter(state, { eventId: randomUUID(), deviceId: a.id, nearbyDeviceId: b.id, detectedAt: Date.now() }, Date.now(), true);
          if (result.duplicate) throw new AppError("This pair is on a ten-minute cooldown. Use Start fresh to try another demo now.", 409);
        } else {
          const session = state.sessions.find((entry) => entry.id === input.sessionId && entry.participants.some((person) => person.userId === user.id));
          if (!session || !session.participants.some((person) => person.userId === partner.id)) throw new AppError("Demo quest not found.", 404);
          sessionAction(state, partner.id, input.sessionId, input.operation);
        }
      }
      return view(state, user.id, identity.demo);
    });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
