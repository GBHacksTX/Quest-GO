import sharp from "sharp";
import { z } from "zod";
import { actor } from "@/lib/identity";
import { AppError, getUser } from "@/lib/domain";
import { transact } from "@/lib/store";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";
import {
  normalizePhoto,
  photoSession,
  storeAchievementPhoto,
} from "@/lib/achievement-photos";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const identity = await actor();
    if (!identity.demo)
      throw new AppError("Sample photos are only available in the demo.", 403);
    limit(`photo-upload:${identity.id}`, 12);
    const input = await jsonBody(
      request,
      z.object({
        sessionId: z.string().uuid(),
        participant: z.enum(["self", "partner"]),
      }),
    );
    const userId = await transact(true, (state) => {
      const session = photoSession(state, identity.id, input.sessionId);
      const person = session.participants.find((entry) =>
        input.participant === "self"
          ? entry.userId === identity.id
          : entry.userId !== identity.id,
      );
      if (!person || getUser(state, person.userId).demoRoom !== identity.room)
        throw new AppError("Demo participant not found.", 404);
      return person.userId;
    });
    const sky = input.participant === "self" ? "#e3e9d5" : "#efe2c4";
    const svg = `<svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="700" fill="${sky}"/><circle cx="720" cy="180" r="95" fill="#d6b967"/><path d="M0 500Q280 190 600 490T1100 400V700H0" fill="#9aaf83"/><path d="M0 590Q400 330 1000 530V700H0" fill="#4d7752"/><path d="M440 700Q590 560 530 450Q650 570 630 700" fill="#e1cea1"/><circle cx="465" cy="491" r="14" fill="#dcb684"/><path d="M445 508h40v68h-40" fill="#bd8f48"/><circle cx="510" cy="506" r="14" fill="#dcb684"/><path d="M490 523h40v68h-40" fill="#eee6d1"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const result = await storeAchievementPhoto(
      true,
      userId,
      input.sessionId,
      await normalizePhoto(png, "image/png"),
      identity.id,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
