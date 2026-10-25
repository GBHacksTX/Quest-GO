import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError } from "./domain";
import {
  readLoginSession,
  revokeLoginSession,
  SESSION_COOKIE,
  SESSION_LIFETIME,
} from "./accounts";

export const demoEnabled = () => process.env.QUESTGO_DEMO_ENABLED !== "false";
const globalSecret = globalThis as typeof globalThis & {
  questgoCookieSecret?: string;
};
function secret() {
  return (
    process.env.AUTH_SECRET ||
    (globalSecret.questgoCookieSecret ??= randomBytes(32).toString("hex"))
  );
}
export function signDemo(userId: string, room: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, room, expires: Date.now() + 86_400_000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyDemo(
  value: string,
): { userId: string; room: string; expires: number } | undefined {
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const provided = Buffer.from(signature, "base64url");
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      return;
    const identity = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      typeof identity.userId !== "string" ||
      typeof identity.room !== "string" ||
      identity.expires <= Date.now()
    )
      return;
    return identity;
  } catch {
    return;
  }
}
export async function setDemoCookie(userId: string, room: string) {
  const jar = await cookies();
  await revokeLoginSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  const localHttp = /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(
    process.env.AUTH_URL || "",
  );
  (await cookies()).set("questgo-demo", signDemo(userId, room), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !localHttp,
    path: "/",
    maxAge: 86_400,
  });
}
export async function setAccountCookie(token: string, requestUrl: string) {
  const url = new URL(process.env.AUTH_URL || requestUrl);
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const jar = await cookies();
  jar.delete("questgo-demo");
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !localHttp && process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME / 1000,
  });
}
export async function actor() {
  if (demoEnabled()) {
    const token = (await cookies()).get("questgo-demo")?.value;
    const identity = token ? verifyDemo(token) : undefined;
    if (identity)
      return { id: identity.userId, demo: true, room: identity.room };
  }
  const userId = await readLoginSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!userId) throw new AppError("Please sign in or open the demo.", 401);
  return { id: userId, demo: false, room: undefined };
}
