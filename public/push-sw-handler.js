/* Service worker notification handlers for Breneo PWA (no VAPID / server push) */

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url =
    (event.notification.data && event.notification.data.url) || "/notifications";
  var fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ("focus" in client) {
            if ("navigate" in client) {
              return client.navigate(fullUrl).then(function (focused) {
                return focused.focus();
              });
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      }),
  );
});

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "SHOW_NOTIFICATION") {
    return;
  }

  var payload = event.data.payload || {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "Breneo", {
      body: payload.body || "",
      icon: payload.icon || "/lovable-uploads/Breneo-logo.png",
      badge: "/lovable-uploads/Breneo-logo.png",
      tag: payload.tag || "breneo-notification",
      data: {
        url: payload.url || "/notifications",
      },
    }),
  );
});
