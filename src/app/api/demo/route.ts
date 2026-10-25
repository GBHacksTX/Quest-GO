import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { demoEnabled, setDemoCookie } from "@/lib/identity";
import { AppError, hash, makeUser } from "@/lib/domain";
import { transact } from "@/lib/store";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { action } = await jsonBody(request, z.object({ action: z.enum(["start", "logout"]) }));
    if (action === "logout") { (await cookies()).delete("questgo-demo"); return Response.json({ ok: true }); }
    if (!demoEnabled()) throw new AppError("The demo is disabled on this deployment.", 404);
    limit(`demo:${request.headers.get("x-forwarded-for") || "local"}`, 8);
    const room = randomUUID();
    const userId = await transact(true, (state) => {
      const a = makeUser(`demo:${room}:a`, "Explorer"); a.demoRoom = room;
      const b = makeUser(`demo:${room}:b`, "Jamie"); b.demoRoom = room; b.onboarded = true; b.preferences.area = "Austin, TX";
      state.users.push(a, b);
      state.devices.push({ id: `demo-${room}-a`, claimHash: hash(`DEMO-${room}`), keyHash: hash(randomUUID()), lastSeen: Date.now() }, { id: `demo-${room}-b`, ownerId: b.id, claimHash: hash(randomUUID()), keyHash: hash(randomUUID()), lastSeen: Date.now() });
      return a.id;
    });
    await setDemoCookie(userId, room);
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
