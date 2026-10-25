import { handlers } from "@/auth";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;
export async function POST(request: NextRequest) {
  const response = await handlers.POST(request);
  const url = new URL(request.url);
  if (
    request.headers.get("origin") === url.origin &&
    /^\/api\/auth\/signin\/(google|facebook)$/.test(url.pathname)
  ) {
    // Clear at the start as well: a failed login must not look like a return
    // to a successfully authenticated demo account. Saved demo data stays intact.
    (await cookies()).delete("questgo-demo");
  }
  return response;
}
