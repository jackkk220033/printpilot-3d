/* JJ3D — PWA 4.11.28
   Cache uniquement les ressources locales statiques et les pages publiques.
   Les requêtes Firebase, APIs, auth et images distantes ne sont pas interceptées.
   L'installation ne garantit pas le fonctionnement hors ligne des données Firebase. */
const CACHE = 'printpilot-static-v4.11.28';
const STATIC = [
  './', './index.html', './boutique.html', './atelier-plus.html', './messages.html',
  './css/style.css', './css/boutique.css', './css/atelier-plus.css',
  './js/app.js', './js/boutique.js', './js/atelier-plus.js',
  './js/messages.js', './js/invoices.js', './css/invoices.css', './facture.html', './bon-boutique.html', './js/dialog-dismiss.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/splash-logo.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.allSettled(STATIC.map(async path => {
      const resp = await fetch(new Request(path,{cache:'reload'}));
      if(resp.ok) await cache.put(path,resp);
    }));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(async keys => {
    await Promise.all(keys.filter(k => k.startsWith('printpilot-static-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  }));
});
self.addEventListener('fetch', e => {
  const req=e.request;
  if(req.method!=='GET' || new URL(req.url).origin !== self.location.origin) return;
  const url=new URL(req.url);
  // Never cache dynamic Firebase endpoints, auth, user-generated images, or uploads.
  const path=url.pathname;
  if (path.includes('/__/') || /\/(?:api|uploads|storage)\//i.test(path)) return;
  if(req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||Response.error())));
    return;
  }
  const allowed = /\/(?:css|js|icons)\/[^/]+\.(?:css|js|png|webp|svg)$/.test(path);
  if(!allowed || /firebase-config\.js$/.test(path)) return;
  e.respondWith(fetch(req).then(r=>{
    if(r.ok) {
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
    }
    return r;
  }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||Response.error())));
});
