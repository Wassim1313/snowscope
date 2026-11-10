/* SnowScope service worker (follow flow, engine/follow.py + engine/webpush.py): shows the browser notifications
   (morning forecast, powder alerts) and opens the resort page on tap. No fetch handler and no cache on purpose: the
   site stays exactly as fast and fresh as without it (pages and data come from the network as before). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "SnowScope", body: e.data ? e.data.text() : "" }; }
  const icon = new URL("icon-192.png", self.registration.scope).href;
  e.waitUntil(self.registration.showNotification(d.title || "SnowScope", {
    body: d.body || "", icon, badge: icon, tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || self.registration.scope },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if (w.url === url && "focus" in w) return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
