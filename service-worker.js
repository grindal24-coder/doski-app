// ВАЖНО: при каждом следующем обновлении приложения меняй CACHE_NAME
// (например на 'board-calc-v5') — иначе браузер не заметит, что файл
// изменился, и не обновит кэш на телефоне.
const CACHE_NAME = 'board-calc-v4';

const OWN_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

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

// Кэш всегда отвечает СРАЗУ (0 секунд ожидания), а свежая версия в это
// время тихо подгружается в фоне и подменяет кэш для следующего раза.
// Если в кэше вообще ничего нет (самый первый визит) — тогда, и только
// тогда, ждём сеть.
function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const networkUpdate = fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => cached);
    return cached || networkUpdate;
  });
}

self.addEventListener('fetch', (event) => {
  event.respondWith(staleWhileRevalidate(event.request));
});
