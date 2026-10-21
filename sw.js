// Shows map condition alerts for assets/js/conditions.js (some browsers, Android
// Chrome among them, only show notifications through a service worker), shows the
// ones worker.js pushes while the site is closed, and opens the wiki when one is
// clicked. It caches nothing and handles no requests, so the site loads exactly as
// it would without it. Registered only once a reader has set an alert and allowed
// notifications.

// strings.js sets window.ARC_STRINGS; the pushed notification uses its wording.
self.window = self;
try {
  importScripts('assets/js/strings.js');
} catch (e) {
  /* offline when installed: the body falls back to string keys */
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// The same text as notify() in conditions.js, worked out now, in this device's
// time zone, from { start, end, region, lang } in the push.
function body({ start, end, region, lang }) {
  const t = (key, vars) => {
    const entry = (self.ARC_STRINGS || {})[key];
    const s = entry ? entry[lang] || entry.en : key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  };
  const now = Date.now() / 1000;
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  };
  const clockTime = (s) =>
    new Date(s * 1000).toLocaleTimeString(locale, lang === 'zh' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' });
  const day = new Date(start * 1000);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const prefix =
    day.toDateString() === today.toDateString()
      ? ''
      : day.toDateString() === tomorrow.toDateString()
        ? `${t('cond.tomorrow')} `
        : `${day.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} `;
  const when = start > now ? t('cond.startsIn', { t: clock(start - now) }) : t('cond.endsIn', { t: clock(end - now) });
  const regionKey = `cond.region.${region}`;
  const regionName = t(regionKey) === regionKey ? region : t(regionKey);
  return `${when} · ${prefix}${clockTime(start)} – ${clockTime(end)} · ${regionName}`;
}

self.addEventListener('push', (event) => {
  let alert = null;
  try {
    alert = event.data.json();
  } catch (e) {
    /* not one of ours */
  }
  if (!alert || !alert.title) return;
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: body(alert),
      // The tag an open page uses too, so if both notify, one replaces the other.
      tag: alert.tag,
      icon: new URL('assets/img/brand/logo.png', scope).href,
      data: { url: new URL(alert.url || './', scope).href },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const open = tabs.find((tab) => tab.url === target);
      return open ? open.focus() : self.clients.openWindow(target);
    })
  );
});
