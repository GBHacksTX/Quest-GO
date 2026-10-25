import { cookies } from "next/headers";
import { z } from "zod";
import {
  insertSession,
  revokeLoginSession,
  SESSION_COOKIE,
} from "@/lib/accounts";
import { AppError } from "@/lib/domain";
import { actor, setAccountCookie } from "@/lib/identity";
import { failure, jsonBody, limit, sameOrigin } from "@/lib/http";
import { friendOf, playerByCode, players, playersEnabled } from "@/lib/players";
import { transact } from "@/lib/store";

const command = z.discriminatedUnion("action", [
  // The username is the player's board pairing code.
  z.object({
    action: z.literal("signin"),
    username: z.string().trim().min(3).max(40),
  }),
  z.object({ action: z.literal("switch") }),
]);
export function GET() {
  if (!playersEnabled())
    return Response.json(
      { enabled: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      enabled: true,
      players: players().map(({ code, name }) => ({ username: code, name })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!playersEnabled())
      throw new AppError("Player sign-in is turned off.", 404);
    limit(`players:${request.headers.get("x-forwarded-for") || "local"}`, 60);
    const input = await jsonBody(request, command);
    let username = input.action === "signin" ? input.username : "";
    if (input.action === "switch") {
      const current = await actor().catch(() => undefined);
      if (!current || current.demo)
        throw new AppError("Sign in as a player first.", 401);
      username = await transact(false, (state) => {
        const pair = friendOf(state, current.id);
        if (!pair) throw new AppError("Only players can switch.", 403);
        return pair.other.code;
      });
    }
    const token = await transact(false, async (state, query) => {
      const user = playerByCode(state, username);
      // Session rows reference app_users, which is otherwise saved at commit.
      await query(
        "INSERT INTO app_users(id,provider_key,data) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING",
        [user.id, user.providerKey, JSON.stringify(user)],
      );
      return insertSession(query, user.id);
    });
    const jar = await cookies();
    await revokeLoginSession(jar.get(SESSION_COOKIE)?.value);
    await setAccountCookie(token, request.url);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
