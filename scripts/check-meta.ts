import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import sharp from "sharp";
import { validateQuest } from "../shared/quest-ai";
import { metaModel } from "../shared/meta-ai";
// Explicit integration check: sends a generated color swatch, never a user's photo.
async function main() {
  loadEnvConfig(process.cwd());
  const image = await sharp({
    create: { width: 128, height: 96, channels: 3, background: "#bb4020" },
  })
    .jpeg()
    .toBuffer();
  const result = await validateQuest(
    {
      title: "Shared drink",
      description: "Two people share a drink in a public place.",
      completionCriteria: [
        "Two people's hands are visible",
        "A drinking cup is visible",
      ],
    },
    `data:image/jpeg;base64,${image.toString("base64")}`,
  );
  assert.equal(
    result.completed,
    false,
    "A color swatch cannot prove a shared activity",
  );
  assert.equal(result.criteria.length, 2);
  console.log(
    JSON.stringify({
      model: metaModel(true),
      responseParsed: true,
      unrelatedImageRejected: true,
    }),
  );
}
main().catch(() => {
  console.error(
    "Meta integration check failed. Check the configured key, model and network; credentials were not printed.",
  );
  process.exitCode = 1;
});
