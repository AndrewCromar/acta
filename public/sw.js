self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: "Notification", body: event.data ? event.data.text() : "" };
    }
  })();

  const title = payload.title || "Todo Reminder";
  const actions = payload.todoId
    ? [{ action: "complete", title: "Mark complete" }]
    : [];
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/globe.svg",
    badge: payload.badge || "/globe.svg",
    data: { url: payload.url || "/", todoId: payload.todoId || null },
    actions,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  const todoId = notification.data && notification.data.todoId;
  const target = (notification.data && notification.data.url) || "/";

  notification.close();

  if (action === "complete" && todoId) {
    event.waitUntil(
      fetch(`/api/todos/${encodeURIComponent(todoId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          updated_at: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.warn("mark-complete from notification failed", err);
      }),
    );
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.endsWith(target) && "focus" in client)
            return client.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
