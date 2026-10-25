import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { AppError } from "@/lib/domain";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";
import { pushConfigured, subscriptionSchema } from "@/lib/notifications/push";
import {
  isSubscribed,
  removeSubscriptions,
  saveSubscription,
  workerOnline,
} from "@/lib/notifications/store";

export const runtime = "nodejs";
const cookieName = "questgo-push-owner";
const command = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    subscription: subscriptionSchema,
  }),
  z.object({ action: z.literal("unsubscribe") }),
]);
export async function GET() {
  if (!pushConfigured())
    return Response.json(
      { enabled: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const token = (await cookies()).get(cookieName)?.value;
    const subscribed = token ? isSubscribed(token) : false;
    return Response.json(
      {
        enabled: true,
        publicKey: process.env.VAPID_PUBLIC_KEY,
        subscribed,
        workerOnline: workerOnline(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { enabled: true, unavailable: true },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!pushConfigured())
      throw new AppError("Test notifications are not configured.", 503);
    // Bounded per-process gate even for anonymous visitors without a cookie.
    limit("push-registration", 60);
    const input = await jsonBody(request, command);
    const jar = await cookies();
    let token = jar.get(cookieName)?.value;
    if (input.action === "unsubscribe") {
      if (token) removeSubscriptions(token);
      return Response.json({ ok: true });
    }
    token ||= randomBytes(32).toString("hex");
    if (!saveSubscription(token, input.subscription))
      throw new AppError(
        "This subscription belongs to a previous browser session. Reset notifications and try again.",
        409,
      );
    jar.set(cookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 365 * 86400,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
