import { cookies } from "next/headers";
import { z } from "zod";
import {
  loginSchema,
  registrationSchema,
  recoverySchema,
  registerAccount,
  signInAccount,
  recoverAccount,
  revokeLoginSession,
  SESSION_COOKIE,
} from "@/lib/accounts";
import { hash } from "@/lib/domain";
import { setAccountCookie } from "@/lib/identity";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";

const command = z.discriminatedUnion("action", [
  registrationSchema.extend({ action: z.literal("register") }),
  loginSchema.extend({ action: z.literal("login") }),
  recoverySchema.extend({ action: z.literal("recover") }),
  z.object({ action: z.literal("logout") }),
]);
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await jsonBody(request, command);
    const jar = await cookies();
    const previous = jar.get(SESSION_COOKIE)?.value;
    if (input.action === "logout") {
      await revokeLoginSession(previous);
      jar.delete(SESSION_COOKIE);
      jar.delete("questgo-demo");
      return Response.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    jar.delete("questgo-demo");
    const client =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    limit(
      `account:${input.action}:ip:${client}`,
      input.action === "login" ? 40 : 20,
    );
    limit(
      `account:${input.action}:email:${hash(input.email)}`,
      input.action === "login" ? 8 : 5,
    );
    if (input.action === "register") {
      const result = await registerAccount(input);
      return Response.json(result, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (input.action === "recover") {
      const result = await recoverAccount(input);
      jar.delete(SESSION_COOKIE);
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const token = await signInAccount(input);
    await revokeLoginSession(previous);
    await setAccountCookie(token, request.url);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
