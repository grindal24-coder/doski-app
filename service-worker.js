// ВАЖНО: при каждом следующем обновлении приложения меняй CACHE_NAME
// (например на 'board-calc-v3') — иначе браузер не заметит, что файл
// изменился, и не обновит кэш на телефоне.
const CACHE_NAME = 'board-calc-v3';

// Свои файлы — маленькие, часто меняются, для них хотим свежую версию.
const OWN_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Firebase SDK — версия в самой ссылке (10.12.2), содержимое никогда не
// поменяется без смены адреса, поэтому их можно спокойно закэшировать
// один раз и больше никогда не ждать сеть ради них.
const VENDOR_FILES = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(OWN_FILES.concat(VENDOR_FILES))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Сеть с таймаутом: ждём ответа максимум timeoutMs, и если сеть не
// успела (слабый сигнал, а не полный офлайн) — сразу отдаём кэш, не
// заставляя человека ждать 15-20 секунд. Сеть при этом не бросаем —
// когда она всё-таки ответит, кэш всё равно обновится на будущее.
function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        caches.match(request).then((cached) => resolve(cached || fetch(request)));
      }
    }, timeoutMs);

    fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(response);
      }
    }).catch(() => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        caches.match(request).then((cached) => resolve(cached || Response.error()));
      }
    });
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Наши файлы: сеть с таймаутом 3 сек, дальше — кэш.
    event.respondWith(networkFirstWithTimeout(event.request, 3000));
  } else {
    // Firebase SDK и прочие внешние скрипты: сначала кэш (мгновенно),
    // сеть — только если в кэше вообще ничего нет.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
  }
});
