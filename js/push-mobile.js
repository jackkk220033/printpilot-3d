/* JJ3D v4.11.54 — Inscription aux notifications FCM (VAPID à configurer). */
(()=>{'use strict';let auth=null,db=null,user=null,sdk=null,unsubscribeToken=null;
const cfg=window.PRINTPILOT_FIREBASE_CONFIG;
const status=t=>{document.querySelectorAll('[data-jj3d-push-status]').forEach(e=>{e.textContent=t})};
const vapid=()=>String(window.JJ3D_WEB_PUSH_VAPID_PUBLIC_KEY||'').trim();
async function register(){if(!user||!auth||!db){status('Connecte-toi à ton compte JJ3D avant d’activer les notifications.');return}
if(!('serviceWorker'in navigator)||!('Notification'in window)||!('PushManager'in window)){status('Ce navigateur ne prend pas en charge les notifications push. Sur iPhone, installe JJ3D sur l’écran d’accueil et ouvre-le depuis son icône.');return}
if(!window.isSecureContext){status('HTTPS requis.');return}
if(!vapid()){status('Configuration Firebase requise : ajoute ta clé VAPID publique dans js/firebase-config.js (voir README).');return}
try{const p=await Notification.requestPermission();if(p!=='granted'){status(p==='denied'?'Notifications bloquées : autorise JJ3D dans les réglages de ton téléphone.':'Autorisation non accordée.');return}
status('Connexion aux notifications push…');const {getMessaging,isSupported,getToken,onMessage}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging.js');if(!await isSupported()){status('Firebase Messaging n’est pas disponible ici.');return}
const reg=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
const messaging=getMessaging(auth.app),token=await getToken(messaging,{vapidKey:vapid(),serviceWorkerRegistration:reg});if(!token)throw Error('Firebase n’a pas retourné de jeton.');
const {doc,setDoc,serverTimestamp}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js');
// Hash a token so no token value is stored in the document path.
const bytes=new TextEncoder().encode(token);const sha=await crypto.subtle.digest('SHA-256',bytes);const id=[...new Uint8Array(sha)].map(b=>b.toString(16).padStart(2,'0')).join('');
await setDoc(doc(db,'workspaces',user.uid,'pushTokens',id),{token,updatedAt:serverTimestamp(),platform:navigator.userAgent.slice(0,180)});
status('✓ Téléphone inscrit! Les alertes push fonctionneront après le déploiement des fonctions Firebase.');
if(!unsubscribeToken)unsubscribeToken=onMessage(messaging,()=>{window.JJ3DNotifications?.render()});
}catch(e){console.warn('FCM JJ3D',e);status('Activation impossible : '+(e.code||e.message))}}
window.JJ3DPush={attach(a,d,u){auth=a;db=d;user=u},detach(){auth=null;db=null;user=null},register};
document.addEventListener('click',e=>{if(e.target.closest('[data-jj3d-push]'))register()});
})();
