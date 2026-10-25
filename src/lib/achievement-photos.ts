import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError, attachAchievementPhoto, view } from "./domain";
import type { State } from "./model";
import { transact } from "./store";

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
export async function storeAchievementPhoto(
  demo: boolean,
  userId: string,
  sessionId: string,
  image: Awaited<ReturnType<typeof normalizePhoto>>,
  viewerId = userId,
) {
  return transact(demo, async (state, query) => {
    const photo = {
      id: randomUUID(),
      uploadedAt: Date.now(),
      width: image.width,
      height: image.height,
      size: image.data.length,
    };
    attachAchievementPhoto(state, userId, sessionId, photo);
    await query(
      "INSERT INTO achievement_photos(id,session_id,user_id,content,width,height,size_bytes,uploaded_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(session_id,user_id) DO UPDATE SET id=excluded.id,content=excluded.content,width=excluded.width,height=excluded.height,size_bytes=excluded.size_bytes,uploaded_at=excluded.uploaded_at",
      [
        photo.id,
        sessionId,
        userId,
        image.data.toString("base64"),
        photo.width,
        photo.height,
        photo.size,
        photo.uploadedAt,
      ],
    );
    photoSession(state, viewerId, sessionId);
    return view(state, viewerId, demo);
  });
}
export async function readAchievementPhoto(
  demo: boolean,
  viewerId: string,
  sessionId: string,
  ownerId: string,
) {
  return transact(demo, async (state, query) => {
    const session = photoSession(state, viewerId, sessionId);
    if (!session.participants.some((person) => person.userId === ownerId))
      throw new AppError("Photo not found.", 404);
    const [photo] = await query(
      "SELECT content FROM achievement_photos WHERE session_id=$1 AND user_id=$2",
      [sessionId, ownerId],
    );
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
