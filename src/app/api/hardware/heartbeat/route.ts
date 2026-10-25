import { z } from "zod";
import { transact } from "@/lib/store";
import { authenticateDevice, bearerHeader } from "@/lib/hardware";
import { failure, jsonBody, limit } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const authorization = bearerHeader(request);
    const { deviceId } = await jsonBody(request, z.object({ deviceId: z.string().min(3).max(100) }));
    limit(`hardware:${deviceId}`, 120);
    await transact(false, (state) => { authenticateDevice(state, deviceId, authorization).lastSeen = Date.now(); });
    return Response.json({ accepted: true });
  } catch (error) { return failure(error); }
}
