import { NextResponse } from "next/server";
import { MuseError } from "@/lib/muse";
import { generateQuest } from "@/lib/quest";
import {
  BUDGET_OPTIONS,
  INTERESTS,
  MINUTE_OPTIONS,
  MODES,
  randomInstructions,
  type Interest,
  type QuestPreferences,
} from "@/lib/questgo-data";

const MAX_INSTRUCTIONS = 1000;
const MAX_AREA = 100;

function parsePreferences(p: Record<string, unknown> | undefined): QuestPreferences | null {
  if (!p) return null;
  const minutes = Number(p.minutes);
  const budget = Number(p.budget);
  const interests = Array.isArray(p.interests) ? p.interests : [];
  const area = typeof p.area === "string" ? p.area.trim() : "";
  if (
    !MODES.includes(p.mode as never) ||
    !MINUTE_OPTIONS.includes(minutes as never) ||
    !BUDGET_OPTIONS.includes(budget as never) ||
    interests.length === 0 ||
    !interests.every((i) => INTERESTS.includes(i as never)) ||
    area.length > MAX_AREA
  ) {
    return null;
  }
  return {
    mode: p.mode as QuestPreferences["mode"],
    minutes,
    budget,
    interests: [...new Set(interests as Interest[])],
    area,
  };
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const preferences = parsePreferences(body.preferences as Record<string, unknown> | undefined);
  if (!preferences) {
    return NextResponse.json({ error: "Invalid preferences. Pick at least one interest." }, { status: 400 });
  }

  let instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
  if (instructions.length > MAX_INSTRUCTIONS) {
    return NextResponse.json({ error: `Instructions must be under ${MAX_INSTRUCTIONS} characters.` }, { status: 400 });
  }
  // No instructions given: roll random ones from the QuestGo data.
  if (!instructions) instructions = randomInstructions(preferences);

  const avoidTitles = Array.isArray(body.avoidTitles)
    ? body.avoidTitles.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 90)).slice(0, 10)
    : [];

  try {
    const quest = await generateQuest(instructions, preferences, avoidTitles);
    return NextResponse.json({ quest });
  } catch (err) {
    const status = err instanceof MuseError ? err.status : 500;
    console.error("Quest generation failed:", err);
    return NextResponse.json({ error: (err as Error).message || "Quest generation failed." }, { status });
  }
}
