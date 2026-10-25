/* Push-only worker: no caching of signed-in pages or API responses. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* Show a useful fallback. */
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title || "QuestGo", {
        body: payload.body || "A new ESP proximity event was received.",
        icon: "/notification-icon-192.png",
        tag: payload.tag || "questgo-event",
        silent: false,
        data: { url: "/explore" },
      });
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const visible = windows.filter(
        (client) => client.visibilityState === "visible",
      );
      const target = visible.find((client) => client.focused) || visible[0];
      target?.postMessage({
        type: "questgo-proximity",
        tag: payload.tag || "questgo-event",
      });
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).pathname === "/explore",
      );
      if (existing) return existing.focus();
      return self.clients.openWindow("/explore");
    })(),
  );
});
