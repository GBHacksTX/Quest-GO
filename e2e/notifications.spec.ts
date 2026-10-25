import { test, expect } from "@playwright/test";

// Browser capability/permission are mocked here; real push delivery needs a
// reachable database, push provider and an actual opted-in browser.
for (const width of [390, 1440]) {
  test(`notification opt-in is explicit, saved and reversible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      let subscription: object | null = null;
      const mock = {
        toJSON: () => ({
          endpoint: "https://fcm.googleapis.com/test",
          keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
        }),
        unsubscribe: async () => {
          subscription = null;
          return true;
        },
      };
      const registration = {
        pushManager: {
          getSubscription: async () => subscription,
          subscribe: async () => {
            subscription = mock;
            return mock;
          },
        },
      };
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          register: async () => registration,
          ready: Promise.resolve(registration),
          getRegistration: async () => registration,
        },
      });
      Object.defineProperty(window, "PushManager", { value: function () {} });
      Object.defineProperty(window, "Notification", {
        value: { requestPermission: async () => "granted" },
      });
    });
    let subscribed = false;
    const actions: string[] = [];
    await page.route("**/api/notifications", async (route) => {
      if (route.request().method() === "POST") {
        const input = route.request().postDataJSON();
        actions.push(input.action);
        subscribed = input.action === "subscribe";
        await route.fulfill({ json: { ok: true } });
      } else
        await route.fulfill({
          json: {
            enabled: true,
            subscribed,
            workerOnline: true,
            publicKey: "B" + "a".repeat(86),
          },
        });
    });
    await page.goto("/explore");
    const panel = page.getByRole("region", { name: "ESP test notifications" });
    await expect(panel).toBeVisible();
    expect(actions).toEqual([]);
    await panel
      .getByRole("button", { name: "Enable notifications", exact: true })
      .click();
    await expect(
      panel.getByRole("button", { name: "Turn off notifications" }),
    ).toBeVisible();
    expect(actions).toEqual(["subscribe"]);
    await page.screenshot({
      path: `artifacts/notifications-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await panel.getByRole("button", { name: "Turn off notifications" }).click();
    await expect(
      panel.getByRole("button", { name: "Enable notifications", exact: true }),
    ).toBeVisible();
    expect(actions).toEqual(["subscribe", "unsubscribe"]);
  });
}

test("unreachable notification database is visible without preventing the demo", async ({
  page,
}) => {
  await page.route("**/api/notifications", (route) =>
    route.fulfill({ status: 503, json: { enabled: true, unavailable: true } }),
  );
  await page.goto("/explore");
  await expect(
    page.getByText(
      "The notification service is unavailable. Checking again shortly.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try the full demo" }),
  ).toBeEnabled();
});

test("push registration rejects cross-origin writes and private network destinations", async ({
  request,
  baseURL,
}) => {
  expect(
    (
      await request.post("/api/notifications", {
        headers: { Origin: "https://other.example" },
        data: { action: "unsubscribe" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/notifications", {
        headers: { Origin: baseURL! },
        data: {
          action: "subscribe",
          subscription: {
            endpoint: "https://127.0.0.1/admin",
            keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
          },
        },
      })
    ).status(),
  ).toBe(400);
});

test("sound can be enabled, replayed and muted while the database is unavailable", async ({
  page,
}) => {
  await page.route("**/api/notifications", (route) =>
    route.fulfill({ status: 503, json: { enabled: true, unavailable: true } }),
  );
  await page.goto("/explore");
  await page
    .getByRole("button", { name: "Enable & test sound", exact: true })
    .click();
  await expect(
    page.getByText("Test chime played.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play test sound", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mute page sound", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable & test sound", exact: true }),
  ).toBeVisible();
});
