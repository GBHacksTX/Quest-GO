import { NextResponse } from "next/server";
import { MuseError } from "@/lib/muse";
import { validateQuest } from "@/lib/quest";
import type { Quest } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart form data." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Image must be JPEG, PNG, WebP or GIF." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  let quest: Quest;
  try {
    quest = JSON.parse(String(form.get("quest") ?? ""));
  } catch {
    return NextResponse.json({ error: "Missing or invalid quest." }, { status: 400 });
  }
  if (
    typeof quest?.title !== "string" ||
    quest.title.length > 200 ||
    (quest.description !== undefined && (typeof quest.description !== "string" || quest.description.length > 2000)) ||
    !Array.isArray(quest.completionCriteria) ||
    quest.completionCriteria.length === 0 ||
    quest.completionCriteria.length > 6 ||
    !quest.completionCriteria.every((c) => typeof c === "string" && c.length <= 300)
  ) {
    return NextResponse.json({ error: "Missing or invalid quest." }, { status: 400 });
  }

  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const dataUrl = `data:${image.type};base64,${base64}`;

  try {
    const result = await validateQuest(quest, dataUrl);
    return NextResponse.json({ result });
  } catch (err) {
    const status = err instanceof MuseError ? err.status : 500;
    console.error("Quest validation failed:", err);
    return NextResponse.json({ error: (err as Error).message || "Quest validation failed." }, { status });
  }
}
