import { z } from "zod";
import type { ProximityEvent } from "./push";

// Reads events from the ESP server (the Python `http/` service) over HTTPS, so
// QuestGo never needs a direct database connection. Response data is untrusted.
const eventSchema = z.object({
  event_id: z.string().min(1).max(100),
  received_at: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp"),
  device_id: z.number().int(),
  peer_id: z.number().int(),
  event_type: z.string().max(40),
  state: z.string().max(30).nullable(),
  detected_by: z.string().max(80).nullable().optional(),
  other_person: z.string().max(80).nullable().optional(),
});

export const eventSourceConfigured = () =>
  !!(process.env.PROXIMITY_API_URL && process.env.PROXIMITY_API_TOKEN);

// Returns the ESP server's latest 100 events (its maximum page size).
export async function fetchRecentEvents(): Promise<ProximityEvent[]> {
  const url = new URL("/events", process.env.PROXIMITY_API_URL);
  url.searchParams.set("limit", "100");
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.PROXIMITY_API_TOKEN}` },
      cache: "no-store",
      // A sleeping free-tier host can take close to a minute to wake up.
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error(`ESP server ${url.host} is unreachable or timed out.`);
  }
  if (response.status === 401)
    throw new Error(
      "ESP server rejected the token; PROXIMITY_API_TOKEN must equal its INGEST_TOKEN.",
    );
  if (!response.ok)
    throw new Error(`ESP server returned HTTP ${response.status}.`);
  const parsed = z.array(eventSchema).safeParse(await response.json());
  if (!parsed.success)
    throw new Error("ESP server returned events in an unexpected format.");
  return parsed.data;
}
