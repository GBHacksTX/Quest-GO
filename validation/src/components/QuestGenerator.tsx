"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BUDGET_OPTIONS,
  DEFAULT_PREFERENCES,
  INTERESTS,
  MINUTE_OPTIONS,
  MODE_LABELS,
  MODES,
  WORK_MODE_MAX_MINUTES,
  randomInstructions,
  randomPreferences,
  type Interest,
  type QuestPreferences,
} from "@/lib/questgo-data";
import type { Quest, ValidationResult } from "@/lib/types";

/** Photos are shrunk to this size before upload, so large phone photos work. */
const MAX_PHOTO_SIDE = 1600;
const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
const cardClass = "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";
const chipClass = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    on
      ? "border-emerald-700 bg-emerald-700 text-white"
      : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
  }`;

async function readError(res: Response) {
  try {
    const data = await res.json();
    return data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Re-encodes a photo as a JPEG no larger than MAX_PHOTO_SIDE on its longest side. */
async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't read that photo format. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't prepare that photo. Try another one.");
  return blob;
}

const formatMinutes = (m: number) => (m < 60 ? `${m} minutes` : `${m / 60} ${m === 60 ? "hour" : "hours"}`);

export interface QuestGeneratorProps {
  initialPreferences?: QuestPreferences;
  /** Called when a photo passes validation. */
  onQuestCompleted?: (quest: Quest, result: ValidationResult) => void;
}

export default function QuestGenerator({
  initialPreferences = DEFAULT_PREFERENCES,
  onQuestCompleted,
}: QuestGeneratorProps) {
  const [instructions, setInstructions] = useState("");
  const [prefs, setPrefs] = useState<QuestPreferences>(initialPreferences);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [recentTitles, setRecentTitles] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const [photo, setPhotoState] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Sets the photo and its preview URL, freeing the previous URL.
  function setPhoto(blob: Blob | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = blob ? URL.createObjectURL(blob) : null;
    setPhotoState(blob);
    setPreview(previewRef.current);
  }

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const update = (value: Partial<QuestPreferences>) => setPrefs((p) => ({ ...p, ...value }));

  function toggleInterest(interest: Interest) {
    const interests = prefs.interests.includes(interest)
      ? prefs.interests.filter((i) => i !== interest)
      : [...prefs.interests, interest];
    if (interests.length) update({ interests }); // keep at least one, like QuestGo
  }

  function rollRandom() {
    const next = randomPreferences(prefs.area);
    setPrefs(next);
    setInstructions(randomInstructions(next));
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setResult(null);
    setPhoto(null);
    try {
      const res = await fetch("/api/quest/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions, preferences: prefs, avoidTitles: recentTitles }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: { quest: Quest } = await res.json();
      setQuest(data.quest);
      setRecentTitles((t) => [data.quest.title, ...t].slice(0, 10));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setResult(null);
    setError(null);
    setPhoto(null);
    if (!file) return;
    if (file.size > MAX_ORIGINAL_BYTES) {
      setError("That photo is too large. Pick one under 30 MB.");
      return;
    }
    setPreparing(true);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  async function handleValidate() {
    if (!quest || !photo) return;
    setValidating(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", photo, "proof.jpg");
      form.append("quest", JSON.stringify(quest));
      const res = await fetch("/api/quest/validate", { method: "POST", body: form });
      if (!res.ok) throw new Error(await readError(res));
      const data: { result: ValidationResult } = await res.json();
      setResult(data.result);
      if (data.result.completed) onQuestCompleted?.(quest, data.result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setValidating(false);
    }
  }

  const busy = generating || validating || preparing;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* 1. Preferences and instructions */}
      <form onSubmit={handleGenerate} className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Create a quest</h2>
          <button type="button" onClick={rollRandom} disabled={busy} className={secondaryButtonClass}>
            🎲 Roll random
          </button>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Your pace</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={prefs.mode === mode}
                onClick={() => update({ mode })}
                className={`rounded-lg border p-3 text-left transition ${
                  prefs.mode === mode
                    ? "border-emerald-700 bg-emerald-50 dark:bg-emerald-950"
                    : "border-zinc-300 hover:border-emerald-600 dark:border-zinc-700"
                }`}
              >
                <span className="block text-sm font-medium">{MODE_LABELS[mode].title}</span>
                <span className="block text-xs text-zinc-500">{MODE_LABELS[mode].subtitle}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="minutes">
              Time to spare
            </label>
            <select
              id="minutes"
              value={prefs.minutes}
              onChange={(e) => update({ minutes: Number(e.target.value) })}
              className={inputClass}
            >
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </select>
            {prefs.mode === "work" && prefs.minutes > WORK_MODE_MAX_MINUTES && (
              <p className="mt-1 text-xs text-zinc-500">Workday breathers are capped at {WORK_MODE_MAX_MINUTES} minutes.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="budget">
              Budget per person
            </label>
            <select
              id="budget"
              value={prefs.budget}
              onChange={(e) => update({ budget: Number(e.target.value) })}
              className={inputClass}
            >
              {BUDGET_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b === 0 ? "Keep it free" : `Up to $${b}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">Things you’re drawn to</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                aria-pressed={prefs.interests.includes(interest)}
                onClick={() => toggleInterest(interest)}
                className={chipClass(prefs.interests.includes(interest))}
              >
                {interest}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mb-1 mt-4 block text-sm font-medium" htmlFor="area">
          Area <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="area"
          maxLength={100}
          value={prefs.area}
          onChange={(e) => update({ area: e.target.value })}
          placeholder="e.g. Austin, TX"
          className={inputClass}
        />

        <label className="mb-1 mt-4 block text-sm font-medium" htmlFor="instructions">
          Instructions <span className="font-normal text-zinc-500">(leave empty for a random one)</span>
        </label>
        <textarea
          id="instructions"
          rows={3}
          maxLength={1000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Press 🎲 Roll random, write your own, or leave blank."
          className={inputClass}
        />

        <button type="submit" disabled={busy} className={`${buttonClass} mt-6 w-full`}>
          {generating ? "Muse is writing your quest…" : quest ? "Generate a new quest" : "Generate quest"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* 2. The generated quest and photo upload */}
      {quest && (
        <section className={cardClass}>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold">{quest.title}</h2>
            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {quest.minutes} min ·{" "}
              {quest.costEstimate === 0
                ? "Free"
                : quest.costEstimate === null
                  ? `Up to $${quest.budgetLimit}`
                  : `~$${quest.costEstimate}`}
            </span>
          </div>
          {quest.description && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{quest.description}</p>}

          <h3 className="mt-4 text-sm font-semibold">Steps</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {quest.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>

          <h3 className="mt-4 text-sm font-semibold">Your photo must show</h3>
          <ul className="mt-1 space-y-2 text-sm">
            {quest.completionCriteria.map((c, i) => {
              const r = result?.criteria[i];
              return (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className={r ? (r.met ? "text-green-600" : "text-red-600") : "text-zinc-400"}>
                    {r ? (r.met ? "✓" : "✗") : "•"}
                  </span>
                  <span>
                    {c}
                    {r && <span className="block text-xs text-zinc-500">{r.evidence}</span>}
                  </span>
                </li>
              );
            })}
          </ul>

          {quest.instructions && (
            <details className="mt-4 text-xs text-zinc-500">
              <summary className="cursor-pointer">Instructions used</summary>
              <p className="mt-1">{quest.instructions}</p>
            </details>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <label className="mb-2 block text-sm font-medium" htmlFor="proof">
              Upload a photo as proof
            </label>
            <input
              key={quest.id /* clears the picked file when a new quest is generated */}
              id="proof"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={validating}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:hover:file:bg-zinc-700"
            />
            {preparing && <p className="mt-2 text-xs text-zinc-500">Preparing photo…</p>}

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img
                src={preview}
                alt="Selected proof"
                className="mt-4 max-h-80 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-900"
              />
            )}

            <button onClick={handleValidate} disabled={!photo || busy} className={`${buttonClass} mt-4 w-full`}>
              {validating ? "Muse is checking your photo…" : "Check if quest is complete"}
            </button>
          </div>
        </section>
      )}

      {/* 3. Validation result */}
      {result && (
        <section
          className={`rounded-xl border p-6 ${
            result.completed
              ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          }`}
        >
          <h2 className="text-lg font-semibold">{result.completed ? "Quest complete! 🎉" : "Not complete yet"}</h2>
          <p className="mt-1 text-sm">
            {result.criteria.filter((c) => c.met).length} of {result.criteria.length} requirements met · confidence{" "}
            {Math.round(result.confidence * 100)}%
          </p>
          {result.reasoning && <p className="mt-3 text-sm">{result.reasoning}</p>}
          {!result.completed && (
            <p className="mt-3 text-sm font-medium">Try another photo that shows everything marked ✗ above.</p>
          )}
        </section>
      )}
    </div>
  );
}
