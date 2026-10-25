import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

for (const viewport of [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name}: complete the real UI journey, reload and see history`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/explore");
    await expect(
      page.getByRole("button", { name: "Try the full demo" }),
    ).toBeVisible();
    mkdirSync("artifacts", { recursive: true });
    await page.screenshot({
      path: `artifacts/${viewport.name}-sign-in.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Try the full demo" }).click();
    await page.getByLabel("What should we call you?").fill("Alex");
    await page
      .getByRole("button", { name: "Continue to device setup" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Link your QuestGo device." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Link the sample device" }).click();
    await expect(
      page.getByRole("heading", { name: "You’re connected." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Find your next chapter" }).click();
    await page.screenshot({
      path: `artifacts/${viewport.name}-home.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "I’m open to a little adventure" })
      .click();
    await page
      .getByRole("button", { name: "Simulate a nearby encounter" })
      .click();
    await expect(
      page
        .locator("#quest-details")
        .getByRole("heading", { name: "A little coffee, a good story" }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/${viewport.name}-quest.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "I’m in", exact: true }).click();
    await expect(
      page.getByText("Waiting for Jamie.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Waiting for Jamie.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Partner accepts", exact: true })
      .click();
    await expect(
      page.getByText("Your quest is underway.", { exact: true }),
    ).toBeVisible();
    const confirm = page.getByRole("button", {
      name: "We did it — confirm my part",
    });
    await expect(confirm).toBeDisabled();
    const photo = await sharp({
      create: { width: 640, height: 480, channels: 3, background: "#8a9d72" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Choose achievement photo", { exact: true })
      .setInputFiles({
        name: "our-adventure.png",
        mimeType: "image/png",
        buffer: photo,
      });
    if (viewport.name === "desktop") {
      await page.route(
        "**/api/quests/*/photos",
        (route) =>
          route.fulfill({
            status: 503,
            json: {
              error: "Photo service unavailable. Your photo was not saved.",
            },
          }),
        { times: 1 },
      );
      await page
        .getByRole("button", { name: "Save my achievement photo" })
        .click();
      await expect(
        page.getByRole("alert").filter({ hasText: "Your photo was not saved" }),
      ).toBeVisible();
      await expect(confirm).toBeDisabled();
    }
    await page
      .getByRole("button", { name: "Save my achievement photo" })
      .click();
    await expect(confirm).toBeEnabled();
    if (
      viewport.name === "desktop" &&
      process.env.QUESTGO_TEST_META === "true"
    ) {
      await page
        .getByLabel("Choose achievement photo", { exact: true })
        .setInputFiles({
          name: "unrelated.png",
          mimeType: "image/png",
          buffer: photo,
        });
      await page
        .getByLabel("Use real Meta AI for this photo", { exact: true })
        .check();
      await page
        .getByRole("button", { name: "Save my achievement photo" })
        .click();
      await expect(
        page.getByText("Try a clearer photo", { exact: true }),
      ).toBeVisible({ timeout: 35_000 });
      await expect(confirm).toBeDisabled();
      await page.screenshot({
        path: "artifacts/desktop-photo-rejected.png",
        fullPage: true,
      });
      await page
        .getByLabel("Choose achievement photo", { exact: true })
        .setInputFiles({
          name: "demo.png",
          mimeType: "image/png",
          buffer: photo,
        });
      await page
        .getByLabel("Use real Meta AI for this photo", { exact: true })
        .uncheck();
      await page
        .getByRole("button", { name: "Save my achievement photo" })
        .click();
      await expect(confirm).toBeEnabled();
    }
    await expect(
      page.getByText("Approved in demo simulation", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/${viewport.name}-photo-check.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(confirm).toBeEnabled();
    await page
      .getByRole("button", { name: "We did it — confirm my part" })
      .click();
    await expect(
      page.getByText("Your part is confirmed.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Partner adds a sample photo" })
      .click();
    await page
      .getByRole("button", { name: "Partner confirms completion" })
      .click();
    await expect(
      page.getByRole("heading", { name: "A little closer, together." }),
    ).toBeVisible();
    await expect(
      page.locator(".result-panel .achievement-gallery img"),
    ).toHaveCount(2);
    await page.screenshot({
      path: `artifacts/${viewport.name}-completed.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Back to exploring" }).click();
    await page
      .getByRole("button", { name: "Your stories", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "1 story, and counting." }),
    ).toBeVisible();
    await page.locator(".history-entry summary").click();
    await expect(
      page.locator(".history-entry .achievement-gallery img"),
    ).toHaveCount(2);
    await page.reload();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test("passing on an offer returns both participants to a neutral end state", async ({
  page,
}) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Try the full demo" }).click();
  await page.getByLabel("What should we call you?").fill("Taylor");
  await page.getByRole("button", { name: "Continue to device setup" }).click();
  await page.getByRole("button", { name: "Link the sample device" }).click();
  await page.getByRole("button", { name: "Find your next chapter" }).click();
  await page
    .getByRole("button", { name: "I’m open to a little adventure" })
    .click();
  await page
    .getByRole("button", { name: "Simulate a nearby encounter" })
    .click();
  await page
    .getByRole("button", { name: "Partner passes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "This quest has ended." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to exploring" }).click();
  await page.getByRole("button", { name: "Your stories", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your first story is still unwritten." }),
  ).toBeVisible();
});

test("a failed save is not shown as successful and mobile users can sign out", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  await page.getByRole("button", { name: "Try the full demo" }).click();
  await page.getByLabel("What should we call you?").fill("Morgan");
  await page.getByRole("button", { name: "Continue to device setup" }).click();
  await page.getByRole("button", { name: "Link the sample device" }).click();
  await page.getByRole("button", { name: "Find your next chapter" }).click();
  await page.route("**/api/app", (route) => route.abort());
  await page
    .getByRole("button", { name: "I’m open to a little adventure" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your choice wasn't confirmed" }),
  ).toContainText("Your choice wasn't confirmed");
  await expect(
    page.getByText("Taking a breather", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/app");
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "I’m open to a little adventure" }),
  ).toBeEnabled();
  await page.getByLabel("Account menu").click();
  await page
    .getByRole("button", { name: "Leave demo", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Try the full demo" }),
  ).toBeVisible();
});
