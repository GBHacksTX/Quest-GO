import { demoEnabled } from "@/lib/identity";
export function GET() {
  const baseReady = !!(process.env.AUTH_SECRET && process.env.DATABASE_URL);
  return Response.json({ demoEnabled: demoEnabled(), google: baseReady && !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET), facebook: baseReady && !!(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) }, { headers: { "Cache-Control": "no-store" } });
}
