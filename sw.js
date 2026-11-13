/* JJ3D — PWA 4.11.66
   Cache uniquement les ressources locales statiques et les pages publiques.
   Les requêtes Firebase, APIs, auth et images distantes ne sont pas interceptées.
   L'installation ne garantit pas le fonctionnement hors ligne des données Firebase. */
const CACHE = 'printpilot-static-v4.11.66';
const STATIC = [
  './', './index.html', './boutique.html', './atelier-plus.html', './messages.html',
  './css/style.css', './css/boutique.css', './css/atelier-plus.css',
  './js/app.js', './js/boutique.js', './js/atelier-plus.js',
  './js/messages.js', './js/notifications.js', './js/push-mobile.js', './js/invoices.js', './css/invoices.css', './facture.html', './bon-boutique.html', './js/dialog-dismiss.js',
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

// Notifications FCM recues même si JJ3D est fermé (data-only, sans notification automatique doublée).
try {
 importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
 importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
 firebase.initializeApp({apiKey:'AIzaSyAblMDwrhKPXWOhvjd8IO5DxI9OwyfUc1M',authDomain:'printpilot-3d.firebaseapp.com',projectId:'printpilot-3d',messagingSenderId:'1039447948278',appId:'1:1039447948278:web:97dd2bd97d9dd17ce765d7'});
 firebase.messaging().onBackgroundMessage(payload=>{
  const d=payload.data||{};const link=new URL('./index.html#notifications',self.registration.scope).href;
  self.registration.showNotification(d.title||'JJ3D — Boutique',{body:d.body||'Nouvelle activité',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:d.eventKey||'jj3d-alert',data:{url:link}});
  if(self.navigator.setAppBadge)self.navigator.setAppBadge(Number(d.unread||1)).catch(()=>{});
 });
} catch(err){console.warn('Firebase Messaging service worker indisponible',err)}
self.addEventListener('notificationclick',e=>{e.notification.close();const target=e.notification.data?.url||new URL('./index.html#notifications',self.registration.scope).href;e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const c of clients){if(new URL(c.url).origin===new URL(target).origin){c.navigate(target);return c.focus()}}return self.clients.openWindow(target)}))});
self.addEventListener('message',e=>{if(e.data?.type==='JJ3D_BADGE'){const n=Number(e.data.count)||0;if(self.navigator.setAppBadge){const p=n?self.navigator.setAppBadge(n):self.navigator.clearAppBadge();p.catch(()=>{})}}});
