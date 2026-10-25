import { test, expect, request as api } from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const password = "a private local adventure password";

test("create an account, save its recovery code, sign out and restore the same account", async ({
  page,
}) => {
  const email = `ui-${randomUUID()}@example.com`;
  await page.goto("/explore");
  await expect(page.getByText("Continue with Google")).toHaveCount(0);
  await expect(page.getByText("Continue with Facebook")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Rowan");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByLabel("Recovery code", { exact: true })).toHaveValue(
    /^[A-Za-z0-9_-]{43}$/,
  );
  await page.getByLabel("I saved my recovery code").check();
  await page.getByRole("button", { name: "Continue to QuestGo" }).click();
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Rowan",
  );
  const before = await (await page.request.get("/api/app")).json();
  expect(before.demo).toBe(false);
  await page.reload();
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Rowan",
  );
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in to QuestGo" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Sign in to QuestGo" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email or password is incorrect" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to QuestGo" }).click();
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Rowan",
  );
  expect((await (await page.request.get("/api/app")).json()).user.id).toBe(
    before.user.id,
  );
});

test("cookie sessions isolate users, leave demos, revoke on logout and rotate recovery codes", async () => {
  const a = await api.newContext({
    baseURL: origin,
    extraHTTPHeaders: { origin },
  });
  const b = await api.newContext({
    baseURL: origin,
    extraHTTPHeaders: { origin },
  });
  const replay = await api.newContext({
    baseURL: origin,
    extraHTTPHeaders: { origin },
  });
  const emailA = `a-${randomUUID()}@example.com`,
    emailB = `b-${randomUUID()}@example.com`;
  try {
    const config = await (await a.get("/api/config")).json();
    expect(config.passwordAccounts).toBe(true);
    expect(config.google).toBeUndefined();
    expect(config.facebook).toBeUndefined();
    expect((await a.get("/api/auth/signin/google")).status()).toBe(404);
    const createdA = await a.post("/api/account", {
      data: {
        action: "register",
        email: emailA,
        password,
        displayName: "Alex",
      },
    });
    const createdB = await b.post("/api/account", {
      data: {
        action: "register",
        email: emailB,
        password,
        displayName: "Blair",
      },
    });
    expect(createdA.status()).toBe(201);
    expect(createdB.status()).toBe(201);
    const codeB = (await createdB.json()).recoveryCode;
    expect(
      (
        await a.post("/api/account", {
          data: {
            action: "register",
            email: emailA.toUpperCase(),
            password,
            displayName: "Wrong",
          },
        })
      ).status(),
    ).toBe(409);
    await a.post("/api/demo", { data: { action: "start" } });
    expect(
      (
        await a.post("/api/account", {
          data: { action: "login", email: emailA, password: "wrong" },
        })
      ).status(),
    ).toBe(401);
    expect((await a.get("/api/app")).status()).toBe(401);
    for (const [client, email] of [
      [a, emailA],
      [b, emailB],
    ] as const)
      expect(
        (
          await client.post("/api/account", {
            data: { action: "login", email, password },
          })
        ).ok(),
      ).toBeTruthy();
    const viewA = await (await a.get("/api/app")).json(),
      viewB = await (await b.get("/api/app")).json();
    expect(viewA.user.id).not.toBe(viewB.user.id);
    expect(viewA.demo).toBe(false);
    expect(viewB.demo).toBe(false);
    expect(JSON.stringify(viewA)).not.toContain(password);
    expect(JSON.stringify(viewA)).not.toContain("password_hash");
    const cookies = (await a.storageState()).cookies;
    const session = cookies.find((c) => c.name === "questgo-session")!;
    expect(session.httpOnly).toBe(true);
    expect(session.sameSite).toBe("Lax");
    const replayHeaders = { cookie: `${session.name}=${session.value}` };
    expect(
      (await replay.get("/api/app", { headers: replayHeaders })).ok(),
    ).toBeTruthy();
    await a.post("/api/account", { data: { action: "logout" } });
    expect((await a.get("/api/app")).status()).toBe(401);
    expect(
      (await replay.get("/api/app", { headers: replayHeaders })).status(),
    ).toBe(401);
    const reset = await a.post("/api/account", {
      data: {
        action: "recover",
        email: emailB,
        password: password + " updated",
        recoveryCode: codeB,
      },
    });
    expect(reset.ok()).toBeTruthy();
    expect((await reset.json()).recoveryCode).not.toBe(codeB);
    expect((await b.get("/api/app")).status()).toBe(401);
    expect(
      (
        await b.post("/api/account", {
          data: { action: "login", email: emailB, password },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await b.post("/api/account", {
          data: {
            action: "login",
            email: emailB,
            password: password + " updated",
          },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await (await b.get("/api/app")).json()).user.id).toBe(
      viewB.user.id,
    );
    expect(
      (
        await a.post("/api/account", {
          data: {
            action: "recover",
            email: emailB,
            password,
            recoveryCode: codeB,
          },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await a.post("/api/account", {
          headers: { origin: "https://other.example" },
          data: {
            action: "register",
            email: `bad-${randomUUID()}@example.com`,
            password,
            displayName: "Bad",
          },
        })
      ).status(),
    ).toBe(403);
    const limitedEmail = `limited-${randomUUID()}@example.com`;
    for (let attempt = 0; attempt < 8; attempt++)
      expect(
        (
          await a.post("/api/account", {
            data: { action: "login", email: limitedEmail, password: "wrong" },
          })
        ).status(),
      ).toBe(401);
    expect(
      (
        await a.post("/api/account", {
          data: { action: "login", email: limitedEmail, password: "wrong" },
        })
      ).status(),
    ).toBe(429);
  } finally {
    await a.dispose();
    await b.dispose();
    await replay.dispose();
  }
});

test("phone users can open ordinary sign-in and password recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await expect(
    page.getByLabel("Saved recovery code", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/mobile-password-login.png",
    fullPage: true,
  });
});
