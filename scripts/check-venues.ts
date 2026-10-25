import { loadEnvConfig } from "@next/env";
import { createNearbyQuest } from "../src/lib/venues";
loadEnvConfig(process.cwd());
const latitude = Number(process.argv[2]);
const longitude = Number(process.argv[3]);
if (
  !Number.isFinite(latitude) ||
  !Number.isFinite(longitude) ||
  Math.abs(latitude) > 90 ||
  Math.abs(longitude) > 180
) {
  console.error(
    "Usage: npx tsx scripts/check-venues.ts <latitude> <longitude>",
  );
  process.exitCode = 1;
} else
  createNearbyQuest({
    mode: "normal",
    minutes: 30,
    budget: 10,
    interests: ["Coffee"],
    area: "Supplied location",
    latitude,
    longitude,
  }).then((quest) => {
    console.log(
      JSON.stringify(
        {
          source: quest.source,
          venue: quest.venue,
          title: quest.title,
          minutes: quest.minutes,
          costEstimate: quest.costEstimate,
        },
        null,
        2,
      ),
    );
    if (quest.source === "fallback") process.exitCode = 1;
  });
