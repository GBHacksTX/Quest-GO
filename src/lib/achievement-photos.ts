import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError, attachAchievementPhoto, view } from "./domain";
import { metaConfigured, metaModel, MuseError } from "../../shared/meta-ai";
import { validateQuest } from "../../shared/quest-ai";
import { photoCriteria } from "./photo-criteria";
import type { PhotoValidation, State } from "./model";
import { transact, type Query } from "./store";

export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export function photoSession(state: State, userId: string, sessionId: string) {
  const session = state.sessions.find(
    (entry) =>
      entry.id === sessionId &&
      entry.participants.some((person) => person.userId === userId),
  );
  if (!session) throw new AppError("Quest not found.", 404);
  return session;
}
export async function normalizePhoto(input: Buffer, contentType: string) {
  if (!allowedTypes.has(contentType))
    throw new AppError("Choose a JPEG, PNG or WebP photo.", 415);
  if (!input.length || input.length > MAX_PHOTO_SIZE)
    throw new AppError("Choose a photo smaller than 10 MB.", 413);
  try {
    const image = sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Unsupported image");
    const { data, info } = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > 2 * 1024 * 1024)
      throw new AppError(
        "That photo is still too large. Try a smaller image.",
        413,
      );
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "This photo could not be read. Choose a valid JPEG, PNG or WebP image under 40 megapixels.",
    );
  }
}
type Image = Awaited<ReturnType<typeof normalizePhoto>>;
type Judge = typeof validateQuest;
type CheckTask = {
  photoId: string;
  pending: PhotoValidation;
  criteria: string[];
  title: string;
  description: string;
  content: string;
};
function pendingValidation(demo: boolean): PhotoValidation {
  return {
    id: randomUUID(),
    status: "pending",
    provider: demo ? "demo" : "meta",
    model: demo ? "simulation" : metaModel(true),
    checkedAt: Date.now(),
    reasoning: "Checking your photo against the quest criteria.",
    criteria: [],
  };
}
// Every event is inserted; previous submissions and checks are never replaced.
async function appendValidation(
  query: Query,
  photoId: string,
  value: PhotoValidation,
) {
  const [row] = await query(
    "SELECT COALESCE(MAX(ordinal),0) AS last FROM questgo_photo_validations WHERE photo_id=$1",
    [photoId],
  );
  await query(
    "INSERT INTO questgo_photo_validations(id,photo_id,ordinal,status,checked_at,data) VALUES($1,$2,$3,$4,$5,$6)",
    [
      value.id,
      photoId,
      Number(row.last) + 1,
      value.status,
      value.checkedAt,
      JSON.stringify(value),
    ],
  );
}
async function finishCheck(
  demo: boolean,
  userId: string,
  sessionId: string,
  viewerId: string,
  task: CheckTask,
  judge: Judge,
) {
  let validation: PhotoValidation;
  try {
    const result = await judge(
      {
        title: task.title,
        description: task.description,
        completionCriteria: task.criteria,
      },
      `data:image/jpeg;base64,${task.content}`,
      { demo: task.pending.provider === "demo" },
    );
    validation = {
      ...task.pending,
      id: randomUUID(),
      checkedAt: Date.now(),
      status: result.completed ? "approved" : "rejected",
      confidence: result.confidence,
      reasoning:
        task.pending.provider === "demo" && !demo
          ? "Simulated check: no Meta AI key is set, so this photo was not checked by AI."
          : result.reasoning,
      criteria: result.criteria,
    };
  } catch (error) {
    validation = {
      ...task.pending,
      id: randomUUID(),
      checkedAt: Date.now(),
      status: "error",
      reasoning:
        error instanceof MuseError
          ? error.message
          : "The photo check could not finish. Your photo is saved; please retry.",
    };
  }
  return transact(demo, async (state, query) => {
    const [latest] = await query(
      "SELECT data FROM questgo_photo_validations WHERE photo_id=$1 ORDER BY ordinal DESC LIMIT 1",
      [task.photoId],
    );
    // An older request cannot overwrite a newer retry of this image.
    if (latest && JSON.parse(String(latest.data)).id === task.pending.id) {
      await appendValidation(query, task.photoId, validation);
      const person = photoSession(state, userId, sessionId).participants.find(
        (p) => p.userId === userId,
      )!;
      if (person.photo?.id === task.photoId)
        person.photo.validation = validation;
    }
    return view(state, viewerId, demo);
  });
}
export async function storeAchievementPhoto(
  demo: boolean,
  userId: string,
  sessionId: string,
  image: Image,
  viewerId = userId,
  useMeta = !demo,
  judge: Judge = validateQuest,
) {
  const task = await transact(
    demo,
    async (state, query): Promise<CheckTask> => {
      const session = photoSession(state, userId, sessionId);
      const quest = state.quests.find((q) => q.id === session.questId)!;
      const criteria = photoCriteria(quest);
      const [previous] = await query(
        "SELECT COALESCE(MAX(revision),0) AS last FROM questgo_photo_submissions WHERE session_id=$1 AND user_id=$2",
        [sessionId, userId],
      );
      const pending = pendingValidation(!useMeta);
      const photo = {
        id: randomUUID(),
        uploadedAt: Date.now(),
        width: image.width,
        height: image.height,
        size: image.data.length,
        revision: Number(previous.last) + 1,
        validation: pending,
      };
      attachAchievementPhoto(state, userId, sessionId, photo);
      photoSession(state, viewerId, sessionId);
      const content = image.data.toString("base64");
      await query(
        "INSERT INTO questgo_photo_submissions(id,session_id,user_id,revision,content,width,height,size_bytes,criteria_json,uploaded_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          photo.id,
          sessionId,
          userId,
          photo.revision,
          content,
          photo.width,
          photo.height,
          photo.size,
          JSON.stringify(criteria),
          photo.uploadedAt,
        ],
      );
      await appendValidation(query, photo.id, pending);
      return {
        photoId: photo.id,
        pending,
        criteria,
        title: quest.title,
        description: quest.description,
        content,
      };
    },
  );
  // Network requests never hold the database transaction open.
  return finishCheck(demo, userId, sessionId, viewerId, task, judge);
}
export async function retryPhotoValidation(
  demo: boolean,
  userId: string,
  sessionId: string,
  photoId: string,
  judge: Judge = validateQuest,
) {
  const task = await transact(
    demo,
    async (state, query): Promise<CheckTask | undefined> => {
      const session = photoSession(state, userId, sessionId);
      const person = session.participants.find((p) => p.userId === userId)!;
      if (session.status !== "active" || person.completedAt)
        throw new AppError("This photo can no longer be changed.", 409);
      if (person.photo?.id !== photoId)
        throw new AppError("Your photo changed. Refresh before retrying.", 409);
      const previous = person.photo.validation;
      if (previous?.status === "approved") return;
      if (
        previous?.status === "pending" &&
        Date.now() - previous.checkedAt < 30_000
      )
        throw new AppError(
          "Your photo is still being checked. Try again in a moment.",
          409,
        );
      const [stored] = await query(
        "SELECT content,criteria_json FROM questgo_photo_submissions WHERE id=$1 AND user_id=$2 AND session_id=$3",
        [photoId, userId, sessionId],
      );
      if (!stored)
        throw new AppError(
          "Please upload this photo again so it can be checked.",
          409,
        );
      const quest = state.quests.find((q) => q.id === session.questId)!;
      // A simulated check is retried as Meta once a key is configured.
      const pending = pendingValidation(
        previous?.provider === "demo" && (demo || !metaConfigured()),
      );
      person.photo.validation = pending;
      await appendValidation(query, photoId, pending);
      return {
        photoId,
        pending,
        content: String(stored.content),
        criteria: JSON.parse(String(stored.criteria_json)),
        title: quest.title,
        description: quest.description,
      };
    },
  );
  return task
    ? finishCheck(demo, userId, sessionId, userId, task, judge)
    : transact(demo, (state) => view(state, userId, demo));
}
export async function readAchievementPhoto(
  demo: boolean,
  viewerId: string,
  sessionId: string,
  ownerId: string,
) {
  return transact(demo, async (state, query) => {
    const session = photoSession(state, viewerId, sessionId);
    const person = session.participants.find((p) => p.userId === ownerId);
    if (!person?.photo) throw new AppError("Photo not found.", 404);
    const [submission] = await query(
      "SELECT content FROM questgo_photo_submissions WHERE id=$1 AND session_id=$2 AND user_id=$3",
      [person.photo.id, sessionId, ownerId],
    );
    const [legacy] = submission
      ? []
      : await query(
          "SELECT content FROM achievement_photos WHERE id=$1 AND session_id=$2 AND user_id=$3",
          [person.photo.id, sessionId, ownerId],
        );
    const photo = submission || legacy;
    if (!photo) throw new AppError("Photo not found.", 404);
    return Buffer.from(String(photo.content), "base64");
  });
}
export async function photoForm(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new AppError("Choose a photo to upload.");
  const limit = MAX_PHOTO_SIZE + 128 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError("Choose a photo smaller than 10 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Choose a photo to upload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AppError("Choose a photo smaller than 10 MB.", 413);
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    return await new Response(new Uint8Array(body), {
      headers: { "content-type": contentType },
    }).formData();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "The upload was interrupted. Please choose the photo again.",
    );
  } finally {
    reader.releaseLock();
  }
}
