import { z } from "zod";
import { actor } from "@/lib/identity";
import { AppError, expireSessions } from "@/lib/domain";
import { transact } from "@/lib/store";
import { failure, limit, sameOrigin } from "@/lib/http";
import {
  MAX_PHOTO_SIZE,
  normalizePhoto,
  photoForm,
  photoSession,
  storeAchievementPhoto,
} from "@/lib/achievement-photos";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    sameOrigin(request);
    const identity = await actor();
    limit(`photo-upload:${identity.id}`, 12);
    const { sessionId } = z
      .object({ sessionId: z.string().uuid() })
      .parse(await context.params);
    await transact(identity.demo, (state) => {
      expireSessions(state);
      const session = photoSession(state, identity.id, sessionId);
      if (
        session.status !== "active" ||
        session.participants.find((person) => person.userId === identity.id)
          ?.completedAt
      )
        throw new AppError(
          "Add or change your photo before confirming an active quest.",
          409,
        );
    });
    const form = await photoForm(request);
    const file = form.get("photo");
    if (!(file instanceof File))
      throw new AppError("Choose a photo to upload.");
    if (file.size > MAX_PHOTO_SIZE)
      throw new AppError("Choose a photo smaller than 10 MB.", 413);
    const image = await normalizePhoto(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    const result = await storeAchievementPhoto(
      identity.demo,
      identity.id,
      sessionId,
      image,
      identity.id,
      !identity.demo || form.get("validationMode") === "meta",
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
