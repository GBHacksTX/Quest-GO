import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { AppError } from "./domain";

export const demoEnabled = () => process.env.QUESTGO_DEMO_ENABLED !== "false";
const globalSecret = globalThis as typeof globalThis & { questgoCookieSecret?: string };
function secret() { return process.env.AUTH_SECRET || (globalSecret.questgoCookieSecret ??= randomBytes(32).toString("hex")); }
export function signDemo(userId: string, room: string) {
  const payload = Buffer.from(JSON.stringify({ userId, room, expires: Date.now() + 86_400_000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyDemo(value: string): { userId: string; room: string; expires: number } | undefined {
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const provided = Buffer.from(signature, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return;
    const identity = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof identity.userId !== "string" || typeof identity.room !== "string" || identity.expires <= Date.now()) return;
    return identity;
  } catch { return; }
}
export async function setDemoCookie(userId: string, room: string) {
  (await cookies()).set("questgo-demo", signDemo(userId, room), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.AUTH_URL?.startsWith("https://") === true, path: "/", maxAge: 86_400 });
}
export async function actor() {
  if (demoEnabled()) {
    const token = (await cookies()).get("questgo-demo")?.value;
    const identity = token ? verifyDemo(token) : undefined;
    if (identity) return { id: identity.userId, demo: true, room: identity.room };
  }
  const session = process.env.AUTH_SECRET ? await auth() : null;
  if (!session?.user?.id) throw new AppError("Please sign in or open the demo.", 401);
  return { id: session.user.id, demo: false, room: undefined };
}
