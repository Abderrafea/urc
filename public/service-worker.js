importScripts('https://js.pusher.com/beams/service-worker.js');
PusherPushNotifications.onNotificationReceived = ({ pushEvent, payload, handleNotification }) => {
  pushEvent.waitUntil(
    Promise.all([
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage(payload.data));
      }),
      handleNotification(payload),
    ]),
  );
};
