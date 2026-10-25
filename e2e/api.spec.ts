import { test, expect, request as api } from "@playwright/test";

const origin = "http://localhost:3000";
test("two independent identities share a persistent quest and cannot bypass consent", async () => {
  const a = await api.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  const b = await api.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  const outsider = await api.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
  try {
    expect((await a.post("/api/demo", { data: { action: "start" } })).ok()).toBeTruthy();
    const initial = await (await a.get("/api/app")).json();
    const room = initial.demoRoom;
    const profile = { action: "profile", displayName: "Alex", preferences: { mode: "normal", minutes: 30, budget: 10, interests: ["Coffee"], area: "Austin, TX" } };
    expect((await a.post("/api/app", { data: profile })).ok()).toBeTruthy();
    expect((await a.post("/api/app", { data: { action: "claim", code: `DEMO-${room}` } })).ok()).toBeTruthy();
    expect((await a.post("/api/app", { data: { action: "availability", available: true } })).ok()).toBeTruthy();
    await b.get(`/demo/join/${room}`, { maxRedirects: 0 });
    const matched = await (await a.post("/api/app", { data: { action: "demoEncounter" } })).json();
    const session = matched.session;
    expect(session.status).toBe("offer");
    const partner = await (await b.get("/api/app")).json();
    expect(partner.session.id).toBe(session.id); expect(partner.session.quest.id).toBe(session.quest.id);
    expect((await a.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "complete" } })).status()).toBe(409);
    await outsider.post("/api/demo", { data: { action: "start" } });
    expect((await outsider.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "accept" } })).status()).toBe(404);
    await a.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "accept" } });
    expect((await (await b.get("/api/app")).json()).session.status).toBe("offer");
    await b.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "accept" } });
    expect((await (await a.get("/api/app")).json()).session.status).toBe("active");
    await Promise.all([a, b].map((client) => client.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "complete" } })));
    await a.post("/api/app", { data: { action: "session", sessionId: session.id, operation: "complete" } });
    const done = await (await b.get("/api/app")).json();
    expect(done.session.status).toBe("completed"); expect(done.completedCount).toBe(1); expect(done.streak).toBe(1);
    expect(JSON.stringify(done)).not.toContain("keyHash"); expect(JSON.stringify(done)).not.toContain("claimHash");
  } finally { await a.dispose(); await b.dispose(); await outsider.dispose(); }
});
test("anonymous access, cross-origin writes and malformed input are rejected", async ({ request }) => {
  expect((await request.get("/api/app")).status()).toBe(401);
  expect((await request.post("/api/demo", { headers: { origin: "https://other.example" }, data: { action: "start" } })).status()).toBe(403);
  expect((await request.post("/api/demo", { headers: { origin }, data: { action: "unknown" } })).status()).toBe(400);
});
