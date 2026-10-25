import { NextResponse } from "next/server";
import { z } from "zod";
import { demoEnabled, setDemoCookie } from "@/lib/identity";
import { transact } from "@/lib/store";
export async function GET(
  request: Request,
  context: { params: Promise<{ room: string }> },
) {
  const { room } = await context.params;
  if (!demoEnabled() || !z.uuid().safeParse(room).success)
    return NextResponse.redirect(new URL("/explore", request.url));
  const partner = await transact(true, (state) =>
    state.users.find((user) => user.providerKey === `demo:${room}:b`),
  );
  if (!partner) return NextResponse.redirect(new URL("/explore", request.url));
  await setDemoCookie(partner.id, room);
  return NextResponse.redirect(new URL("/explore", request.url));
}
