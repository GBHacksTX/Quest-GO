import { setTimeout } from "node:timers/promises";
import { pushConfigured } from "../src/lib/notifications/push";
import { fetchRecentEvents } from "../src/lib/notifications/source";
import { notificationDb } from "../src/lib/notifications/store";
import { collectEvents, deliverPending } from "../src/lib/notifications/worker";

// Run exactly one worker per QuestGo host; it shares the SQLite file with the website.
async function main() {
  if (!pushConfigured())
    throw new Error("Configure notification environment variables first.");
  const db = notificationDb();
  const once = process.argv.includes("--once");
  let stopped = false;
  process.on("SIGINT", () => (stopped = true));
  process.on("SIGTERM", () => (stopped = true));
  console.log(
    `Watching ESP events from ${new URL(process.env.PROXIMITY_API_URL!).host}.`,
  );
  do {
    try {
      const collected = collectEvents(db, await fetchRecentEvents());
      const delivered = await deliverPending(db);
      if (collected || delivered || once)
        console.log(
          `Notifications queued: ${collected}; delivery attempts: ${delivered}`,
        );
    } catch (error) {
      console.error(
        `Notification poll failed: ${error instanceof Error ? error.message : "unknown error"} Retrying.`,
      );
      if (once) process.exitCode = 1;
    }
    if (once) break;
    if (!stopped) await setTimeout(3000);
  } while (!stopped);
  db.close();
}
main().catch((error) => {
  console.error(
    `Notification worker could not start: ${error instanceof Error ? error.message : "check configuration"}`,
  );
  process.exitCode = 1;
});
