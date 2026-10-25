import "server-only";

/**
 * All Muse API calls go through this file.
 *
 * It currently assumes an OpenAI-style chat completions endpoint:
 *   POST {MUSE_API_BASE_URL}/chat/completions
 *   Authorization: Bearer {MUSE_API_KEY}
 * with images sent as `image_url` content parts.
 * If Muse uses a different format, only `callMuse` needs to change.
 */

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface MuseMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export class MuseError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export const isMockMode = () => process.env.MUSE_MOCK === "true";

function config() {
  const apiKey = process.env.MUSE_API_KEY;
  const baseUrl = process.env.MUSE_API_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new MuseError(
      "Muse API is not configured. Set MUSE_API_KEY and MUSE_API_BASE_URL in .env.local, or set MUSE_MOCK=true.",
      500,
    );
  }
  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model: process.env.MUSE_MODEL || "muse-default",
    visionModel: process.env.MUSE_VISION_MODEL || process.env.MUSE_MODEL || "muse-default",
  };
}

async function callMuse(messages: MuseMessage[], opts: { vision?: boolean } = {}): Promise<string> {
  const { apiKey, baseUrl, model, visionModel } = config();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.vision ? visionModel : model,
        messages,
        // Low temperature for consistent judging, high for varied quests.
        temperature: opts.vision ? 0 : 1,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    if ((err as Error).name === "TimeoutError") {
      throw new MuseError("Muse took too long to answer. Please try again.", 504);
    }
    throw new MuseError(`Could not reach Muse API: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new MuseError(`Muse API returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: unknown = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new MuseError("Muse API response had no text content.");
  }
  return text;
}

/** Calls Muse and parses a JSON object out of the reply (tolerates ```json fences). */
export async function callMuseJson<T>(messages: MuseMessage[], opts: { vision?: boolean } = {}): Promise<T> {
  const text = await callMuse(messages, opts);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new MuseError("Muse API did not return JSON.");
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    throw new MuseError("Muse API returned invalid JSON.");
  }
}
