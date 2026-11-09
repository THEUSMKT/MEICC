/* Guarda a apresentacao no aparelho para ela abrir sem internet depois da primeira visita.
   Com internet, a versao nova sempre tem preferencia; sem internet ou com rede lenta, abre a guardada. */
const CACHE = 'dopamina-v1';
const PAGE = new URL('index.html', self.registration.scope).href;
const EXTRAS = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map(f => new URL(f, self.registration.scope).href);
const ESPERA_REDE = 3000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([PAGE, ...EXTRAS].map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    const aberto = caches.open(CACHE);
    const rede = aberto.then(c => fetch(new Request(PAGE, { cache: 'no-cache' })).then(r => {
      if (r.ok) c.put(PAGE, r.clone());
      return r;
    }));
    e.waitUntil(rede.catch(() => {}));
    e.respondWith(aberto.then(async c => {
      const salva = await c.match(PAGE);
      if (!salva) return rede;
      const lenta = new Promise(res => setTimeout(() => res(salva), ESPERA_REDE));
      return Promise.race([rede.then(r => (r.ok ? r : salva)).catch(() => salva), lenta]);
    }));
    return;
  }
  if (EXTRAS.includes(req.url)) e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
