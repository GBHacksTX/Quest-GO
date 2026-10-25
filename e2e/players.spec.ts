import { test, expect, type Page } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";

// Board proximity normally comes from the notification worker. This test
// writes the worker's smoothed status directly, so it needs the same
// notification database file as the server under test. The two players are
// shared accounts, so never run copies of this file in parallel workers.
const dbFile = process.env.QUESTGO_NOTIFICATION_DB;
function boards(status: "near" | "away" | "offline") {
  const db = new DatabaseSync(dbFile!);
  try {
    db.exec("PRAGMA busy_timeout=5000");
    const now = Date.now();
    db.prepare(
      "INSERT INTO worker_state(id,last_poll_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_poll_at=excluded.last_poll_at",
    ).run(status === "offline" ? now - 600_000 : now);
    db.prepare(
      "INSERT INTO pair_state(pair,announced,announced_at) VALUES('2-1',?,?) ON CONFLICT(pair) DO UPDATE SET announced=excluded.announced,announced_at=excluded.announced_at",
    ).run(status === "near" ? "near" : "away", now);
  } finally {
    db.close();
  }
}
// Leaves a finished quest from an earlier run, if one is showing.
async function home(page: Page) {
  const back = page.getByRole("button", { name: /Back to exploring/ });
  const waiting = page.getByRole("button", {
    name: /Waiting for Ramu|Start a quest with Ramu/,
  });
  await expect(back.or(waiting).first()).toBeVisible();
  if (await back.isVisible()) await back.click();
}
async function photo(page: Page) {
  const image = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#6c9a5b" },
  })
    .jpeg()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "quest.jpg",
      mimeType: "image/jpeg",
      buffer: image,
    });
  await page.getByRole("button", { name: "Save my achievement photo" }).click();
  await expect(
    page.getByText("Approved by simulated check (no Meta AI key)"),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /confirm my part/ }).click();
}

test.skip(!dbFile, "Set QUESTGO_NOTIFICATION_DB to the server's file.");
test.describe.configure({ mode: "serial" });

for (const width of [390, 1440]) {
  test(`two players: near update, shared quest, switching and completion at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    boards("away");
    await page.goto("/explore");
    if (width === 390) {
      // The username is the board's pairing code.
      await page.getByLabel(/Username/).fill("Prabesh");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    } else await page.getByRole("button", { name: /^P\s*Prabesh/ }).click();
    await home(page);
    await expect(
      page.getByRole("heading", { name: /Waiting for Ramu/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Waiting for Ramu/ }),
    ).toBeDisabled();

    // The boards meet: the page updates by itself.
    boards("near");
    await expect(page.locator(".near-banner")).toContainText(
      "Ramu is near you!",
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole("heading", { name: /Ramu is near you/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start a quest with Ramu" }).click();
    await expect(page.getByRole("button", { name: /I’m in/ })).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: /I’m in/ }).click();
    await expect(page.getByText("Waiting for a shared yes")).toBeVisible();

    // One device, both players: switch to Ramu, who sees the same offer.
    await page
      .getByRole("button", { name: /Switch to Ramu/ })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: /Ramu.*Prabesh/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /I’m in/ }).click();
    await expect(page.getByText("Your quest is underway.")).toBeVisible();
    await photo(page);
    await expect(
      page.getByRole("button", { name: /Waiting for your partner/ }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Switch to Prabesh/ })
      .first()
      .click();
    await photo(page);
    await expect(
      page.getByRole("heading", { name: "A little closer, together." }),
    ).toBeVisible();
    await expect(page.getByText(/You and Ramu completed/)).toBeVisible();
    await expect(page.getByText("Simulated check").first()).toBeVisible();

    // Moving apart (after the worker's settle time) returns to waiting.
    await home(page);
    boards("away");
    await expect(
      page.getByRole("heading", { name: /Waiting for Ramu/ }),
    ).toBeVisible({ timeout: 15_000 });
    // Without the worker, proximity is unknown and quests can't start.
    boards("offline");
    await expect(page.getByText("Board watcher offline").first()).toBeVisible({
      timeout: 15_000,
    });
  });
}

test("player sign-in rejects unknown usernames and switching needs a player", async ({
  page,
  request,
}) => {
  await page.goto("/explore");
  await page.getByLabel(/Username/).fill("stranger");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".player-sign-in [role=alert]")).toContainText(
    "wasn’t found",
  );
  const origin = new URL(page.url()).origin;
  const anonymous = await request.post("/api/players", {
    headers: { Origin: origin },
    data: { action: "switch" },
  });
  expect(anonymous.status()).toBe(401);
  const crossSite = await request.post("/api/players", {
    headers: { Origin: "https://evil.example" },
    data: { action: "signin", username: "ramu" },
  });
  expect(crossSite.status()).toBe(403);
});
