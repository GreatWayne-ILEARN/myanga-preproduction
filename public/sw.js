// MyYanga service worker — offline shell + web-push for reels.
const CACHE = "myyanga-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", (e) => {
  let data = {}; try { data = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(data.title || "MyYanga", {
    body: data.body || "Your new reel is ready.", icon: "/myyanga-logo.png", data: { url: data.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data?.url || "/")); });
