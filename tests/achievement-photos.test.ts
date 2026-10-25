import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { MAX_PHOTO_SIZE, normalizePhoto } from "../src/lib/achievement-photos";

test("uploaded photos are rotated, normalized to JPEG and stripped of metadata", async () => {
  const input = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "#58774e" },
  })
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Artist: "Test fixture" } },
    })
    .jpeg()
    .toBuffer();
  const image = await normalizePhoto(input, "image/jpeg");
  const metadata = await sharp(image.data).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  assert.equal(image.width, 8);
  assert.equal(image.height, 12);
});
test("non-image bytes, unsupported formats and oversized uploads are rejected", async () => {
  await assert.rejects(normalizePhoto(Buffer.from("not a photo"), "image/png"));
  await assert.rejects(
    normalizePhoto(Buffer.from("<svg></svg>"), "image/svg+xml"),
    (error: unknown) => (error as { status: number }).status === 415,
  );
  await assert.rejects(
    normalizePhoto(Buffer.alloc(MAX_PHOTO_SIZE + 1), "image/jpeg"),
    (error: unknown) => (error as { status: number }).status === 413,
  );
});
