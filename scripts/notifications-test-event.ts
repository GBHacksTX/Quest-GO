// Sends one fake ESP event through the ESP server, as if the boards reported it.
// Usage: npm run notifications:test-event -- [peer_near|peer_far|peer_detected|peer_missing|test]
const type = process.argv[2] ?? "peer_near";
const states: Record<string, string> = {
  peer_near: "near",
  peer_far: "far",
  peer_detected: "uncertain",
  peer_missing: "missing",
  test: "near",
};
async function main() {
  if (!states[type]) throw new Error(`Unknown event type ${type}.`);
  const { PROXIMITY_API_URL: base, PROXIMITY_API_TOKEN: token } = process.env;
  if (!base || !token)
    throw new Error("Set PROXIMITY_API_URL and PROXIMITY_API_TOKEN in .env.");
  const eventId = `manual-test-${Date.now()}`;
  const response = await fetch(new URL("/events", base), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      event_id: eventId,
      device_id: 2,
      peer_id: 1,
      event_type: type,
      state: states[type],
      rssi_dbm: -50,
      boot_id: 0,
      sequence: 0,
      uptime_ms: 0,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`ESP server returned HTTP ${response.status}.`);
  console.log(
    `Sent ${type} (${eventId}). The worker should notify within about 3 seconds.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
