import { demoEnabled } from "@/lib/identity";
import { liveStorageReady } from "@/lib/store";
import { playersEnabled } from "@/lib/players";
export function GET() {
  return Response.json(
    {
      demoEnabled: demoEnabled(),
      passwordAccounts: liveStorageReady(),
      players: playersEnabled() && liveStorageReady(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
