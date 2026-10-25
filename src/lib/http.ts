import { z, ZodError } from "zod";
import { AppError } from "./domain";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new AppError("Please submit this action from QuestGo.", 403);
}
export async function jsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const text = await request.text();
  if (text.length > 16_384) throw new AppError("Request is too large.", 413);
  try { return schema.parse(JSON.parse(text)); } catch (error) { if (error instanceof ZodError) throw error; throw new AppError("Send a valid JSON request."); }
}
export function failure(error: unknown) {
  const status = error instanceof AppError ? error.status : error instanceof ZodError ? 400 : 503;
  const message = error instanceof AppError ? error.message : error instanceof ZodError ? "Check the form fields and try again." : "This service is unavailable. Your action was not confirmed; please try again.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
const buckets = globalThis as typeof globalThis & { questgoLimits?: Map<string, { count: number; until: number }> };
export function limit(key: string, max = 15) {
  const map = buckets.questgoLimits ??= new Map();
  const now = Date.now();
  if (map.size > 2000) for (const [id, bucket] of map) if (bucket.until < now) map.delete(id);
  let bucket = map.get(key);
  if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 60_000 }; map.set(key, bucket); }
  if (++bucket.count > max) throw new AppError("Too many attempts. Please wait a minute and try again.", 429);
}
