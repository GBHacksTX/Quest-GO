import test from "node:test";
import assert from "node:assert/strict";
import { createNearbyQuest } from "../src/lib/venues";
import { authenticateDevice, bearerHeader } from "../src/lib/hardware";
import { emptyState } from "../src/lib/model";
import { hash } from "../src/lib/domain";

const preferences = { mode: "normal" as const, minutes: 30, budget: 10, interests: ["Coffee"], area: "Austin", latitude: 30.286, longitude: -97.739 };
test("venue identity comes from place data and unknown prices stay unknown", async () => {
  const fetcher: typeof fetch = async () => Response.json({ elements: [{ id: 123, type: "node", lat: 30.286, lon: -97.739, tags: { name: "Fixture Café", amenity: "cafe", "addr:street": "Example Street" } }] });
  const quest = await createNearbyQuest(preferences, fetcher);
  assert.equal(quest.source, "osm"); assert.equal(quest.venue!.name, "Fixture Café"); assert.equal(quest.costEstimate, null);
  assert.equal(quest.venue!.url, "https://www.openstreetmap.org/node/123");
});
test("free budgets exclude paid venue categories and lookup failure returns a free fallback", async () => {
  let query = "";
  const fetcher: typeof fetch = async (_url, init) => { query = String(init?.body); return Response.json({ elements: [] }); };
  const quest = await createNearbyQuest({ ...preferences, budget: 0 }, fetcher);
  assert.equal(quest.costEstimate, 0); assert.equal(quest.source, "fallback");
  assert.ok(!query.includes("cafe")); assert.ok(!query.includes("museum"));
  assert.equal((await createNearbyQuest(preferences, async () => { throw new Error("timeout"); })).source, "fallback");
});
test("malformed AI output cannot replace trusted venue identity", async () => {
  const previous = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = "test-only-placeholder";
  try {
    const fetcher: typeof fetch = async (url) => String(url).includes("generativelanguage") ? Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "Invented venue", minutes: 9999, venue: { name: "Wrong place" } }) }] } }] }) : Response.json({ elements: [{ id: 456, type: "node", lat: 30.286, lon: -97.739, tags: { name: "Trusted fixture", amenity: "cafe" } }] });
    const quest = await createNearbyQuest(preferences, fetcher);
    assert.equal(quest.venue!.name, "Trusted fixture"); assert.ok(quest.minutes <= preferences.minutes);
  } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});
test("hardware credentials are bound to a registered sender", () => {
  const state = emptyState(); const token = "x".repeat(43);
  state.devices.push({ id: "device-a", claimHash: hash("private-code"), keyHash: hash(token) });
  assert.equal(authenticateDevice(state, "device-a", `Bearer ${token}`).id, "device-a");
  assert.throws(() => authenticateDevice(state, "device-b", `Bearer ${token}`));
  assert.throws(() => authenticateDevice(state, "device-a", `Bearer ${"y".repeat(43)}`));
  assert.throws(() => bearerHeader(new Request("https://example.test")));
});
