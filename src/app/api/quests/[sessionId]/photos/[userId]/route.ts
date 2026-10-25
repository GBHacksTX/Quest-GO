import { z } from "zod";
import { actor } from "@/lib/identity";
import { readAchievementPhoto } from "@/lib/achievement-photos";
import { failure } from "@/lib/http";
export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string; userId: string }> },
) {
  try {
    const identity = await actor();
    const { sessionId, userId } = z
      .object({ sessionId: z.string().uuid(), userId: z.string().uuid() })
      .parse(await context.params);
    const image = await readAchievementPhoto(
      identity.demo,
      identity.id,
      sessionId,
      userId,
    );
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(image.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline; filename=achievement.jpg",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
