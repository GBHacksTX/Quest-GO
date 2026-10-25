// Shared server-side client for Arjit’s generator and photo judge.
export type MuseMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
};
export type MuseOptions = { vision?: boolean; fetcher?: typeof fetch };
export class MuseError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export const metaModel = (vision = false) =>
  (vision &&
    (process.env.META_AI_VISION_MODEL || process.env.MUSE_VISION_MODEL)) ||
  process.env.META_AI_MODEL ||
  process.env.MUSE_MODEL ||
  "muse-spark-1.3";
export const metaConfigured = () =>
  !!(process.env.META_AI_API_KEY || process.env.MUSE_API_KEY);

export async function callMuseJson<T>(
  messages: MuseMessage[],
  options: MuseOptions = {},
): Promise<T> {
  const apiKey = process.env.META_AI_API_KEY || process.env.MUSE_API_KEY;
  if (!apiKey)
    throw new MuseError(
      "Photo checking is not configured. Please try again later.",
      503,
    );
  const base = (
    process.env.META_AI_BASE_URL ||
    process.env.MUSE_API_BASE_URL ||
    "https://api.meta.ai/v1"
  ).replace(/\/+$/, "");
  let response: Response;
  try {
    response = await (options.fetcher || fetch)(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: metaModel(options.vision),
        messages,
        temperature: options.vision ? 0 : 1,
      }),
      signal: AbortSignal.timeout(options.vision ? 25_000 : 12_000),
      cache: "no-store",
    });
  } catch {
    throw new MuseError(
      "The AI service could not finish the check. Please retry.",
      503,
    );
  }
  // Provider bodies can contain credentials, infrastructure details or private content.
  if (!response.ok)
    throw new MuseError(
      "The AI service is unavailable. Your photo is saved; please retry.",
      503,
    );
  try {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Missing content");
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Missing JSON");
    const parsed = JSON.parse(content.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid JSON");
    return parsed as T;
  } catch {
    throw new MuseError("The AI response could not be read. Please retry.");
  }
}
