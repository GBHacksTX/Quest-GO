import { z } from "zod";
import { actor } from "@/lib/identity";
import { AppError, expireSessions, view } from "@/lib/domain";
import { transact } from "@/lib/store";
import { combinedPreferences, generateAndSave } from "@/lib/generation";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const identity = await actor();
    if (identity.demo)
      throw new AppError(
        "Live venue lookup is separate from the sample demo.",
        403,
      );
    limit(`venue-retry:${identity.id}`, 3);
    const { sessionId } = await jsonBody(
      request,
      z.object({ sessionId: z.string().uuid() }),
    );
    const preferences = await transact(false, (state) => {
      expireSessions(state);
      const session = state.sessions.find(
        (entry) =>
          entry.id === sessionId &&
          entry.participants.some((person) => person.userId === identity.id),
      );
      if (!session) throw new AppError("Quest not found.", 404);
      if (
        session.status !== "offer" ||
        session.participants.some((person) => person.acceptedAt) ||
        session.generationStatus === "pending"
      )
        throw new AppError(
          "Suggestions can only be retried before either person accepts.",
          409,
        );
      session.generationStatus = "pending";
      session.generationStartedAt = Date.now();
      return combinedPreferences(state, session);
    });
    await generateAndSave(sessionId, preferences);
    return Response.json(
      await transact(false, (state) => view(state, identity.id)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
