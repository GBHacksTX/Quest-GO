import { demoEnabled } from "@/lib/identity";
import { liveStorageReady } from "@/lib/store";
export function GET() {
  return Response.json(
    {
      demoEnabled: demoEnabled(),
      passwordAccounts: liveStorageReady(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
