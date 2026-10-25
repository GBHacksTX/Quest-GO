import { z } from "zod";
import { transact } from "@/lib/store";
import { authenticateDevice, bearerHeader } from "@/lib/hardware";
import { encounter } from "@/lib/domain";
import { combinedPreferences, generateAndSave } from "@/lib/generation";
import { failure, jsonBody, limit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const authorization = bearerHeader(request);
    const input = await jsonBody(
      request,
      z.object({
        eventId: z.string().min(8).max(128),
        deviceId: z.string().min(3).max(100),
        nearbyDeviceId: z.string().min(3).max(100),
        detectedAt: z.iso.datetime(),
      }),
    );
    limit(`hardware:${input.deviceId}`, 120);
    await transact(false, (state) => {
      authenticateDevice(state, input.deviceId, authorization).lastSeen =
        Date.now();
    });
    const result = await transact(false, (state) => {
      const result = encounter(state, {
        ...input,
        detectedAt: Date.parse(input.detectedAt),
      });
      if (!result.duplicate && result.session) {
        result.session.generationStatus = "pending";
        result.session.generationStartedAt = Date.now();
      }
      const preferences = result.session
        ? combinedPreferences(state, result.session)
        : undefined;
      return {
        sessionId: result.session?.id,
        duplicate: result.duplicate,
        preferences,
      };
    });
    if (!result.duplicate && result.sessionId && result.preferences) {
      await generateAndSave(result.sessionId, result.preferences);
    }
    return Response.json({
      accepted: true,
      duplicate: result.duplicate,
      sessionId: result.sessionId,
    });
  } catch (error) {
    return failure(error);
  }
}
