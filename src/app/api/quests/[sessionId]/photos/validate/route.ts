import { z } from "zod";
import { actor } from "@/lib/identity";
import { retryPhotoValidation } from "@/lib/achievement-photos";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    sameOrigin(request);
    const identity = await actor();
    limit(`photo-validation:${identity.id}`, 12);
    const { sessionId } = z
      .object({ sessionId: z.string().uuid() })
      .parse(await context.params);
    const { photoId } = await jsonBody(
      request,
      z.object({ photoId: z.string().uuid() }),
    );
    const result = await retryPhotoValidation(
      identity.demo,
      identity.id,
      sessionId,
      photoId,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
