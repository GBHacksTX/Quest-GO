import { demoEnabled } from "@/lib/identity";
import { liveStorageReady, transact } from "@/lib/store";
export async function GET() {
  let storage = false;
  if (liveStorageReady()) {
    try {
      await transact(false, () => undefined);
      storage = true;
    } catch {
      return Response.json(
        { status: "unavailable", storage: false },
        { status: 503 },
      );
    }
  }
  return Response.json(
    {
      status: storage ? "ready" : demoEnabled() ? "demo" : "unconfigured",
      storage,
      demo: demoEnabled(),
    },
    {
      status: storage || demoEnabled() ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
