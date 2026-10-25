import { test, expect, request as api } from "@playwright/test";

const origin = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
test("Google sign-in leaves an old demo and asks which account to use", async () => {
  const client = await api.newContext({
    baseURL: origin,
    extraHTTPHeaders: { origin },
  });
  try {
    const config = await (await client.get("/api/config")).json();
    test.skip(
      !config.google,
      "Google credentials are not configured on this instance",
    );
    expect(
      (await client.post("/api/demo", { data: { action: "start" } })).ok(),
    ).toBeTruthy();
    const previous = await (await client.get("/api/app")).json();
    expect(previous.demo).toBe(true);
    const { csrfToken } = await (await client.get("/api/auth/csrf")).json();
    const response = await client.post("/api/auth/signin/google", {
      form: { csrfToken, callbackUrl: `${origin}/explore` },
      headers: { "X-Auth-Return-Redirect": "1" },
    });
    expect(response.ok()).toBeTruthy();
    const destination = new URL((await response.json()).url);
    expect(destination.hostname).toBe("accounts.google.com");
    expect(destination.searchParams.get("prompt")).toBe("select_account");
    expect(destination.searchParams.get("redirect_uri")).toBe(
      `${origin}/api/auth/callback/google`,
    );
    expect(
      (await client.storageState()).cookies.some(
        (cookie) => cookie.name === "questgo-demo",
      ),
    ).toBe(false);
    // Before Google completes, there is no real identity. Never reuse the old demo.
    expect((await client.get("/api/app")).status()).toBe(401);
    // Switching sign-in methods leaves the saved room available through its explicit invite.
    await client.get(`/demo/join/${previous.demoRoom}`, { maxRedirects: 0 });
    const partner = await (await client.get("/api/app")).json();
    expect(partner.demoRoom).toBe(previous.demoRoom);
    expect(partner.user.id).not.toBe(previous.user.id);
  } finally {
    await client.dispose();
  }
});

test("an OAuth error displays sign-in failure instead of a saved demo", async ({
  page,
}) => {
  const started = await page.request.post("/api/demo", {
    headers: { origin },
    data: { action: "start" },
  });
  expect(started.ok()).toBeTruthy();
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  const config = await (await page.request.get("/api/config")).json();
  test.skip(
    !config.google,
    "Google credentials are not configured on this instance",
  );
  await page.request.post("/api/auth/signin/google", {
    headers: { origin, "X-Auth-Return-Redirect": "1" },
    form: { csrfToken, callbackUrl: `${origin}/explore` },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/explore?error=AccessDenied");
  await expect(
    page.getByRole("alert").filter({ hasText: "Sign-in didn’t finish" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(
    page.getByText("You’re exploring the demo.", { exact: false }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
