/* PrintPilot 3D v3.0 — Cloud Firestore optional, no Node.js.
   No automatic upload or import until explicit consent, except resuming a previously linked device
   whose local snapshot still matches its last confirmed cloud sync. */
const modal = document.getElementById('cloud-dialog');
const status = document.getElementById('cloud-status');
const errorEl = document.getElementById('cloud-error');
const authArea = document.getElementById('cloud-auth-area');
const accountArea = document.getElementById('cloud-account-area');
const accountLabel = document.getElementById('cloud-account-label');
const remoteInfo = document.getElementById('cloud-remote-info');
const openBtn = document.getElementById('open-cloud');
const closeBtn = document.getElementById('close-cloud');
const adapter = window.PrintPilotCloudAdapter;
const photoStatus=document.getElementById('photo-cloud-status');
const photoMigrateButton=document.getElementById('cloud-migrate-photos');
let photoUnsub=null,photoReady=false;
let boutiqueAutoRequested=false, boutiqueAutoTimer=null, boutiqueAutoRunning=false, boutiqueAutoRetry=false;
let cataloguePublishedKnown=false, lastPhotoPublication=new Map();
let boutiqueLastSignature=null, boutiqueForcePublication=false;
let unreadUnsub=null,requestsUnsub=null,ordersUnsub=null,invoiceOrdersUnsub=null,deliveryReceiptsUnsub=null,specialRequestsUnsub=null;let jj3dNotificationSeen=null;
window.JJ3DClientOrders={ready:false,records:[]};
function setInvoiceOrders(records,ready){window.JJ3DClientOrders={ready,records};window.dispatchEvent(new Event("jj3d:orders-updated"));}
let ppRequestCount=0,ppOrderCount=0,ppUnreadCount=0;
function showNotificationLocations(){
 const area=document.getElementById('pp-notification-where');if(!area)return;
 const parts=[];
 if(ppRequestCount+ppOrderCount)parts.push(`<a href="#atelier-demandes">📨 Demandes et commandes Boutique : ${ppRequestCount+ppOrderCount} à traiter</a>`);
 if(ppUnreadCount)parts.push(`<a href="messages.html">✉ Messages Boutique : ${ppUnreadCount} non lu(s)</a>`);
 area.hidden=!parts.length;area.innerHTML=parts.join('');
}
function setRequestBadge(count){ppRequestCount=count;updateRequestBadges();}
function setOrderBadge(count){ppOrderCount=count;updateRequestBadges();}
function updateRequestBadges(){const count=ppRequestCount+ppOrderCount;showNotificationLocations();document.querySelectorAll("[data-boutique-requests]").forEach(el=>{el.hidden=!count;el.textContent=count>99?"99+":String(count);el.setAttribute("aria-label",count+" demande(s) et commande(s) en attente");});}
function setUnreadBadge(count){ppUnreadCount=count;showNotificationLocations();
 document.querySelectorAll('[data-boutique-unread]').forEach(el=>{
  el.hidden=!count; el.textContent=count>99?'99+':String(count);
  el.setAttribute('aria-label', count+' message(s) non lu(s)');
 });
}
function stopUnreadBadge(){if(specialRequestsUnsub){specialRequestsUnsub();specialRequestsUnsub=null;}jj3dNotificationSeen=null;if(deliveryReceiptsUnsub){deliveryReceiptsUnsub();deliveryReceiptsUnsub=null;}window.JJ3DDeliveryReceipts=[];if(invoiceOrdersUnsub){invoiceOrdersUnsub();invoiceOrdersUnsub=null;}setInvoiceOrders([],false);if(unreadUnsub){unreadUnsub();unreadUnsub=null;}if(requestsUnsub){requestsUnsub();requestsUnsub=null;}if(ordersUnsub){ordersUnsub();ordersUnsub=null;}setUnreadBadge(0);setRequestBadge(0);setOrderBadge(0);}

let photoCache=new Map();
const photoId=key=>Array.from(new TextEncoder().encode(key),b=>b.toString(16).padStart(2,'0')).join('');
const photoNotice=msg=>{if(photoStatus)photoStatus.textContent=msg;};
const CFG = window.PRINTPILOT_FIREBASE_CONFIG;
const LINK_UID = 'printpilot-cloud-linked-uid-v3';
const DIGEST_KEY = 'printpilot-cloud-synced-snapshot-v3';
const configOK = CFG && typeof CFG.apiKey === 'string' && CFG.apiKey.length > 12 && !CFG.apiKey.startsWith('REMPLACER') && CFG.projectId && !CFG.projectId.startsWith('REMPLACER') && CFG.appId && !CFG.appId.startsWith('REMPLACER');
let auth=null, db=null, firebase=null, currentUser=null, remote=null, unsubscribe=null;
let baseRevision=null, active=false, pending=false, busy=false, conflict=false, timer=null, observedOnce=false;
let jj3dLastPublishedRevision=null;
const localJSON=()=>JSON.stringify(adapter.exportState());
const stamp=()=>new Date().toLocaleString('fr-CA');
const describe=doc=> doc ? `Version cloud ${doc.revision || 0} • ${doc.savedAt?.toDate?.()?.toLocaleString('fr-CA') || 'date indisponible'} • ${doc.data?.rolls?.length ?? 0} bobines, ${doc.data?.products?.length ?? 0} produits` : 'Aucune sauvegarde cloud pour ce compte.';
function setStatus(message,isError=false){status.textContent=message;status.style.borderColor=isError?'#b45366':'#3b4e77';document.getElementById('sidebar-storage').textContent=active&&!conflict?'☁ Synchronisation active': '● Stockage local actif';}
function boutiqueSyncState(message,kind='idle'){
 const el=document.getElementById('jj3d-boutique-sync-indicator');
 if(el){el.textContent=message;el.dataset.state=kind;el.title='État de publication du catalogue Boutique';}
}
function showError(e){console.error('PrintPilot cloud:',e); const message=e?.code ==='auth/invalid-credential'?'Courriel ou mot de passe incorrect.': e?.code==='auth/email-already-in-use'?'Ce courriel possède déjà un compte.':e?.code==='auth/weak-password'?'Mot de passe trop faible.':e?.code==='permission-denied'?'Permission refusée : vérifie les règles Firestore et le projet Firebase.':String(e?.message||e);errorEl.textContent=message;setStatus('Synchronisation interrompue — données locales conservées.',true);}
// Réinitialiser l'état d'une session Firebase sans supprimer les fonctions de
// publication installées une seule fois au chargement de ce module. Au premier
// onAuthStateChanged, les supprimer débranchait définitivement Enregistrer -> Boutique.
function resetCloud(){boutiqueSyncState('Boutique : hors ligne','idle');jj3dLastPublishedRevision=null;clearTimeout(boutiqueAutoTimer);boutiqueAutoRequested=false;boutiqueAutoRunning=false;boutiqueAutoRetry=false;cataloguePublishedKnown=false;boutiqueLastSignature=null;boutiqueForcePublication=false;lastPhotoPublication.clear();stopUnreadBadge();if(photoUnsub){photoUnsub();photoUnsub=null;}photoCache.clear();photoReady=false;photoNotice('Connecte-toi pour synchroniser les photos.');window.dispatchEvent(new Event('printpilot:photos-changed'));active=false;pending=false;conflict=false;busy=false;remote=null;baseRevision=null;observedOnce=false;clearTimeout(timer);if(unsubscribe){unsubscribe();unsubscribe=null;}setStatus('Connecte-toi pour retrouver tes données.');}
function setRemoteData(record){remote=record;remoteInfo.textContent=describe(record);document.getElementById('cloud-download').disabled=!record;}
function rememberSynced(){localStorage.setItem(LINK_UID,currentUser.uid);localStorage.setItem(DIGEST_KEY,localJSON());}
function safeSyncRemote(record){
  const old=localJSON();
  if(record?.data && JSON.stringify(record.data)!==old){adapter.closeAllDialogs();adapter.applyState(record.data);}
  baseRevision=record.revision;rememberSynced();active=true;pending=false;conflict=false;
  setStatus(`☁ Synchronisé avec Firebase • ${stamp()}`);window.JJ3DPublishDeliveries?.(record.data)?.catch(e=>console.warn('Publication livraisons :',e));
  window.JJ3DReconcileOrderQueue?.(record.data)?.catch(e=>console.warn('Liaison des commandes:',e));
}
function beginListener(){
 if(unsubscribe)unsubscribe();
 const ref=firebase.doc(db,'workspaces',currentUser.uid);
 unsubscribe=firebase.onSnapshot(ref,snap=>{
  const record=snap.exists()?snap.data():null;setRemoteData(record);
  if(!active){
   if(!observedOnce){observedOnce=true;
     // Resume ONLY a previously confirmed device, with identical local state.
     if(record && localStorage.getItem(LINK_UID)===currentUser.uid && localStorage.getItem(DIGEST_KEY)===localJSON()){
       try{safeSyncRemote(record);}catch(e){showError(e);}
     }
   }
   return;
  }
  if(!record){active=false;conflict=true;setStatus('La sauvegarde cloud a été supprimée. Vérifie avant de continuer.',true);return;}
  if(baseRevision===null){baseRevision=record.revision;return;}
  if(record.revision===baseRevision)return;
  if(busy)return; // la transaction locale mettra à jour sa propre version.
  if(pending || localStorage.getItem(DIGEST_KEY)!==localJSON()){
    conflict=true;active=false;clearTimeout(timer);
    setStatus('⚠ Conflit entre appareils : aucune donnée n’a été écrasée. Choisis Charger cloud ou conserver puis exporter la copie locale.',true);
    return;
  }
  try{safeSyncRemote(record);}catch(e){showError(e);}
 },e=>{active=false;showError(e);});
}
async function uploadSnapshot(){
 if(!active||!currentUser||busy||conflict)return;
 busy=true;pending=true;const snapshot=adapter.exportState();const serialized=JSON.stringify(snapshot);
 if(new Blob([serialized]).size>950000){busy=false;active=false;setStatus('Sauvegarde trop volumineuse pour un seul document Firestore. Export JSON recommandé.',true);return;}
 const expected=baseRevision;
 try{
  const newRev=await firebase.runTransaction(db,async tx=>{
   const ref=firebase.doc(db,'workspaces',currentUser.uid);
   const snap=await tx.get(ref);
   const actual=snap.exists()?(snap.data().revision||0):0;
   if(actual!==expected)throw new Error('CONFLIT: données modifiées sur un autre appareil');
   const rev=actual+1;
   tx.set(ref,{revision:rev,data:snapshot,savedAt:firebase.serverTimestamp()});
   return rev;
  });
  baseRevision=newRev;
  // Les réceptions ne sont marquées traitées qu'APRÈS confirmation du stockage cloud.
  for(const slip of snapshot.stockSlips||[]){
   if(slip.status==='received' && (window.JJ3DDeliveryReceipts||[]).some(r=>r.slipId===slip.id&&r.status==='pending')){
    await window.JJ3DReceiptResolve?.(slip.id);
   }
  }
  // Publie une copie filtrée des bons Boutique, sans facture ni données privées.
  try{await window.JJ3DPublishDeliveries?.(snapshot);}catch(e){console.warn('Publication livraisons Boutique :',e);}
  try{await window.JJ3DReconcileOrderQueue?.(snapshot);}catch(e){console.warn('Liaison commandes :',e);}
  // Le catalogue est publié APRÈS la fin de cette transaction, pas pendant busy/pending.
  // Another edit may have happened while awaiting network; don't mark those changes synced.
  localStorage.setItem(LINK_UID,currentUser.uid);
  localStorage.setItem(DIGEST_KEY,serialized);
  setStatus(`☁ Sauvegardé dans Firebase • ${stamp()}`);
 }catch(e){
  active=false;conflict=true;showError(e);
  setStatus('⚠ Échec / conflit : changements locaux conservés, non synchronisés. Export JSON conseillé.',true);
 }finally{
  busy=false;pending=false;
  const noMoreLocalEdits=localJSON()===serialized;
  // La Boutique possède désormais sa propre file de publication indépendante.
  // Ne pas attendre la fin du stockage privé pour la mettre à jour.
  if(active && localJSON()!==localStorage.getItem(DIGEST_KEY))scheduleUpload();
 }
}
function scheduleUpload(){
 if(!active||conflict)return;
 pending=true;setStatus('☁ Modifications locales en attente de synchronisation…');boutiqueSyncState('Boutique : mise à jour en attente','pending');
 clearTimeout(timer);timer=setTimeout(()=>{if(busy){scheduleUpload();return;}uploadSnapshot();},1100);
}
window.addEventListener('printpilot:changed',()=>{
 if(active)scheduleUpload();else if(currentUser)setStatus('Modifications locales enregistrées. Synchronisation privée à activer séparément.');
 // Événement émis uniquement APRÈS que l'enregistrement local est confirmé.
 // La publication Boutique n'attend pas la transaction /workspaces.
 if(currentUser && !conflict)window.JJ3DAutoPublishCatalogue?.();
});
openBtn.addEventListener('click',()=>modal.showModal());
closeBtn.addEventListener('click',()=>modal.close());
if(!configOK){
  setStatus('☁ Firebase à configurer : ouvre js/firebase-config.js. L’inventaire local reste accessible.');
  authArea.hidden=true;
  document.getElementById('cloud-account-area').hidden=true;
}else{
 try{
  const sdkVersion='13.1.0';
  const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,onSnapshot,runTransaction,serverTimestamp,collection,setDoc,updateDoc,deleteDoc,query,where}]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`)
  ]);
  const firebaseApp=initializeApp(CFG);auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);
  firebase={doc,getDoc,onSnapshot,runTransaction,serverTimestamp};
  window.PrintPilotPhotos={
    isReady:()=>Boolean(currentUser&&photoReady),
    getPhoto:async key=>photoCache.get(key)||null,
    hasPhoto:async key=>photoCache.has(key),
    savePhoto:async(key,image)=>{
      if(!currentUser||!photoReady)throw Error('Photos cloud non prêtes : reconnecte-toi à Firebase.');
      if(typeof image!=='string'||!image.startsWith('data:image/jpeg;base64,')||image.length>285000)throw Error('Photo non compatible ou trop grande.');
      const ref=doc(db,'workspaces',currentUser.uid,'photos',photoId(key));
      await setDoc(ref,{key,image,updatedAt:serverTimestamp()});
      photoCache.set(key,image);
      window.JJ3DAutoPublishCatalogue?.(true);
      window.dispatchEvent(new Event('printpilot:photos-changed'));
    }
  };
  // 4.11.44 — Commandes personnalisées ↔ file Atelier+ (même document Firebase).
  // Identifiant stable : enregistrer plusieurs fois la commande ne crée jamais un deuxième print.
  const orderQueueRef=()=>doc(db,'boutiques',currentUser.uid,'management','current');
  const queueTaskForOrder=(order,previous)=>{
   const finished=previous&&['done','failed'].includes(previous.status);
   const cancelled=order.status==='cancelled'||order.deleted;
   const note=['Commande personnalisée '+String(order.number||''),String(order.colors||''),String(order.filamentType||'')].filter(Boolean).join(' · ').slice(0,200);
   return {...previous,id:previous?.id||('order-'+order.id),customOrderId:order.id,boutiqueOrigin:order.source==='boutique'||!!order.boutiqueRequestId,audience:order.source==='boutique'||!!order.boutiqueRequestId?'boutique':'private',customOrderNumber:String(order.number||''),productId:String(order.productId||''),name:String(order.item||'Commande personnalisée').slice(0,120),quantity:Math.max(1,Math.min(500,Number(order.quantity)||1)),printer:previous?.printer||'Anycubic Kobra X',minutes:Number(previous?.minutes)||0,startAt:previous?.startAt||'',priority:previous?.priority||'normal',note,status:cancelled&&!finished?'failed':previous?.cancelledByOrder?'todo':previous?.status||'todo',cancelledByOrder:!!(cancelled&&!finished),date:previous?.date||String(order.orderedAt||'').slice(0,10)||new Date().toISOString().slice(0,10),hasPhoto:!!previous?.hasPhoto,orderDueAt:String(order.dueAt||'')};
  };
  // Sync a SHAREABLE invoice snapshot, never the private invoice or supplier costs.
  window.JJ3DShareBoutiqueQuote=async(order,invoice)=>{
   if(!order?.boutiqueRequestId)return;
   if(!currentUser||!db)throw Error('Connecte Firebase avant de partager la soumission');
   const lines=(invoice?.lines||[]).slice(0,8).map(l=>({name:String(l.name||'').slice(0,160),qty:Math.max(1,Math.min(999,Number(l.qty)||1)),price:Math.max(0,Math.min(100000,Number(l.price)||0))}));
   const subtotal=lines.reduce((sum,l)=>sum+l.qty*l.price,0);
   const discount=Math.min(subtotal,Math.max(0,Number(invoice?.discount)||0));
   const base=subtotal-discount+Math.max(0,Number(invoice?.shipping)||0);
   const tax=base*Math.max(0,Math.min(100,Number(invoice?.taxRate)||0))/100;
   const total=Math.round((base+tax)*100)/100;
   const ref=doc(db,'boutiques',currentUser.uid,'customRequests',order.boutiqueRequestId);
   await updateDoc(ref,{quoteTotal:total,quoteInvoiceNumber:String(invoice?.number||'').slice(0,60),quotePreviewUrl:String(order.previewUrl||'').slice(0,600),quoteLines:lines,quoteInvoiceStatus:String(invoice?.status||'draft'),quoteDiscount:discount,quoteShipping:Math.max(0,Number(invoice?.shipping)||0),quoteTax:Math.round(tax*100)/100});
  };
  window.JJ3DSyncOrderQueue=async order=>{
   if(!currentUser||!db)throw Error('Firebase non connecté');
   if(!order?.id)throw Error('Identifiant de commande manquant');
   const ref=orderQueueRef();
   await runTransaction(db,async tx=>{
    const snap=await tx.get(ref),existing=snap.exists()?snap.data():{};
    const queue=Array.isArray(existing.queue)?[...existing.queue]:[];
    const at=queue.findIndex(q=>q.customOrderId===order.id||q.id==='order-'+order.id||(order.boutiqueRequestId&&q.customRequestId===order.boutiqueRequestId));
    const prev=at>=0?queue[at]:null;
    const cancel=order.deleted||order.status==='cancelled';
    // Demandes Boutique restent hors production jusqu'au paiement vérifié par l'admin.
    // Held requests remain visible for planning, but cannot be started until payment is verified.
    if(order.productionHold&&!cancel&&at>=0&&prev?.customRequestId&&!prev?.customOrderId){/* preserve existing request task */}
    if(at<0&&cancel)return; // Ne pas recréer une commande annulée.
    if(at<0&&queue.length>=80)throw Error('File À imprimer pleine (80 tâches). Archive des impressions avant de continuer.');
    const next=queueTaskForOrder(order,prev); next.productionHold=!!order.productionHold; next.customRequestId=order.boutiqueRequestId||prev?.customRequestId||''; next.id=prev?.id||next.id;
    if(at<0)queue.unshift(next);else queue[at]=next;
    tx.set(ref,{...existing,queue,updatedAt:serverTimestamp()});
    const perPrinter=new Map(),blocked=new Set(),anchor=Math.max(Date.now(),Date.parse(existing.planStart||'')||0),estimated=new Map();
    for(const item of [...queue].reverse()){
     if(item.productionHold||['done','failed'].includes(item.status))continue;
     const machine=item.printer||'Anycubic Kobra X';
     if(blocked.has(machine))continue;
     if(item.status==='paused'||!(Number(item.minutes)>0)){blocked.add(machine);continue;}
     const started=Date.parse(item.startedAt||'')||0;
     const elapsed=(Number(item.elapsedMs)||0)+(item.status==='doing'&&started?Math.max(0,Date.now()-started):0);
     const remaining=Math.max(0,Number(item.minutes)*60000-elapsed);
     const begin=Math.max(perPrinter.get(machine)||anchor,Date.parse(item.startAt||'')||0);
     const start=item.status==='doing'?Math.max(Date.now(),begin):begin;
     const end=start+remaining;estimated.set(item.id,{start:new Date(start).toISOString(),end:new Date(end).toISOString()});perPrinter.set(machine,end);
    }
    // Mise à jour immédiate de la vue Boutique sans attendre une ouverture d'Atelier+.
    const items=queue.filter(x=>!x.cancelledByOrder&&!x.productionHold&&(x.orderId||x.requestId||x.customRequestId||(x.customOrderId&&x.boutiqueOrigin===true)||(!x.customOrderId&&x.audience==='boutique'))).slice(0,80).map(x=>({kind:x.customRequestId||(x.customOrderId&&x.boutiqueOrigin===true)?'custom':'boutique',id:String(x.id||''),name:String(x.name||''),quantity:Number(x.quantity)||1,printer:String(x.printer||'Anycubic Kobra X'),minutes:Number(x.minutes)||0,startAt:String(x.startAt||''),status:String(x.status||'todo'),note:(x.customOrderId||x.customRequestId?'':String(x.note||'')),hasPhoto:!!x.hasPhoto,estimatedStart:estimated.get(x.id)?.start||'',estimatedEnd:estimated.get(x.id)?.end||''}));
    tx.set(doc(db,'boutiques',currentUser.uid,'planning','current'),{items,updatedAt:serverTimestamp()});
   });
  };
  window.JJ3DSyncOrderQueuePhoto=async (orderId,image)=>{
   if(!currentUser||!orderId)throw Error('Connexion Firebase requise pour la photo de la file');
   if(typeof image!=='string'||!image.startsWith('data:image/jpeg;base64,')||image.length>175000)throw Error('Photo de la file trop volumineuse');
   const taskId='order-'+orderId;
   const ref=orderQueueRef(),planningRef=doc(db,'boutiques',currentUser.uid,'planning','current');
   await setDoc(doc(db,'boutiques',currentUser.uid,'planningPhotos',taskId),{image,updatedAt:serverTimestamp()});
   await runTransaction(db,async tx=>{
    const [m,p]=await Promise.all([tx.get(ref),tx.get(planningRef)]);
    if(!m.exists())return;
    const current=m.data(),queue=Array.isArray(current.queue)?current.queue.map(x=>x.id===taskId?{...x,hasPhoto:true}:x):[];
    tx.set(ref,{...current,queue,updatedAt:serverTimestamp()});
    const planning=p.exists()?p.data():{items:[]};
    tx.set(planningRef,{items:(planning.items||[]).map(x=>x.id===taskId?{...x,hasPhoto:true}:x),updatedAt:serverTimestamp()});
   });
  };
  window.JJ3DReconcileOrderQueue=async snapshot=>{
   if(!currentUser||!Array.isArray(snapshot?.customOrders)||!snapshot.customOrders.length)return;
   const snap=await getDoc(orderQueueRef()),queue=snap.data()?.queue||[];
   const byOrder=new Map(queue.filter(q=>q.customOrderId).map(q=>[q.customOrderId,q]));
   for(const order of snapshot.customOrders){
    const prev=byOrder.get(order.id);
    if(!prev||prev.name!==String(order.item||'').slice(0,120)||Number(prev.quantity)!==Number(order.quantity)||prev.customOrderNumber!==String(order.number||'')|| (order.status==='cancelled'&&prev.status!=='failed'&&prev.status!=='done')){
     await window.JJ3DSyncOrderQueue(order);
    }
   }
  };
  window.JJ3DPublishDeliveries=async snapshot=>{
    if(!currentUser||!active)return;
    const raw=Array.isArray(snapshot.stockSlips)?snapshot.stockSlips:[];
    const items=raw.slice(-120).map(d=>({id:String(d.id||''),number:String(d.number||''),date:String(d.date||''),destination:String(d.destination||'Boutique'),status:String(d.status||'draft'),lines:(d.lines||[]).map(l=>({shopId:String(l.shopId||''),id:String(l.id||''),name:String(l.name||''),qty:Math.max(0,Number(l.qty)||0)})),receivedQuantities:d.receivedQuantities||{}}));
    await setDoc(doc(db,'boutiques',currentUser.uid,'deliveries','current'),{items,updatedAt:serverTimestamp()});
  };
  window.JJ3DReceiptResolve=async slipId=>{
    if(!currentUser)return;
    try{const ref=doc(db,'boutiques',currentUser.uid,'deliveryReceipts',slipId);await updateDoc(ref,{status:'processed',resolvedAt:serverTimestamp()});}catch(e){console.warn('Réception déjà traitée :',e);}
  };
  // Portail boutique : publication distincte (aucun accès au document /workspaces).
  const bStatus=document.getElementById('boutique-admin-status');
  const bUid=document.getElementById('boutique-member-uid');
  const bLink=document.getElementById('boutique-link');
  let boutiqueBusy=false;
  function boutiqueNotice(msg,fail=false){if(bStatus){bStatus.textContent=msg;bStatus.style.color=fail?'#ffa1ac':'';}}
  function boutiqueLink(){
    if(!currentUser)return '';
    const url=new URL('boutique.html',location.href);
    url.search='';url.hash='';url.searchParams.set('atelier',currentUser.uid);
    return url.toString();
  }
  function ownerRequired(){
    if(!currentUser||!active||conflict)throw Error('Connecte-toi à ton compte ADMIN et active la synchronisation Firebase avant cette action.');
  }
  function memberUid(){
    const v=bUid.value.trim();
    if(!/^[a-zA-Z0-9_-]{10,128}$/.test(v))throw Error('Entre le UID Firebase exact du compte Boutique (pas son courriel).');
    if(v===currentUser?.uid)throw Error('Ne donne pas un accès Boutique au compte administrateur.');
    return v;
  }
  document.getElementById('boutique-approve').addEventListener('click',async()=>{
    try{
      ownerRequired();const uid=memberUid();
      if(!confirm('Autoriser le compte UID '+uid+' à consulter ton catalogue publié (lecture seule)?'))return;
      await setDoc(doc(db,'boutiques',currentUser.uid,'members',uid),{role:'viewer',addedAt:serverTimestamp()});
      boutiqueNotice('✓ Compte Boutique autorisé. Publie maintenant le catalogue et envoie son lien privé.');
    }catch(e){console.error(e);boutiqueNotice('Erreur : '+e.message,true);}
  });
  document.getElementById('boutique-revoke').addEventListener('click',async()=>{
    try{
      ownerRequired();const uid=memberUid();
      if(!confirm('RÉVOQUER immédiatement l’accès au catalogue pour ce UID?'))return;
      await deleteDoc(doc(db,'boutiques',currentUser.uid,'members',uid));
      boutiqueNotice('✓ Accès révoqué. Le compte ne peut plus lire le catalogue dans Firebase.');
    }catch(e){console.error(e);boutiqueNotice('Erreur : '+e.message,true);}
  });
  document.getElementById('boutique-copy-link').addEventListener('click',async()=>{
    try{const link=boutiqueLink();if(!link)throw Error('Connecte-toi en admin.');await navigator.clipboard.writeText(link);boutiqueNotice('✓ Lien Boutique copié.');}
    catch(e){boutiqueNotice('Copie manuellement le lien affiché dans le champ.',true);}
  });
  // Synchronisation du catalogue Boutique. Les données privées ne sont jamais publiées.
  // La publication automatique ne démarre qu'après une publication manuelle initiale.
  const catalogButton=document.getElementById('boutique-publish');
  let lastCatalogueRevision=null;
  let didLoadExistingCatalogue=false;
  async function publishBoutique(auto=false, snapshotOverride=null){
    if(boutiqueBusy){boutiqueAutoRequested=true;return;}
    if(auto){
      if(!currentUser || conflict)throw Error('Compte administrateur non connecté ou conflit Firebase.');
    }else{
      ownerRequired();
      if(pending||busy)throw Error('Attends la fin de la synchronisation avant de publier.');
    }
    // Les prix et le stock doivent se publier même si le stockage photo est indisponible.
    if(!auto && !photoReady)boutiqueNotice('Photos cloud indisponibles : publication des informations produit uniquement.');
    if(!auto && !confirm('Publier les noms, photos, prix et stocks des produits commerciaux vers le portail Boutique?'))return;
    boutiqueBusy=true;catalogButton.disabled=true;
    try{
      const state=snapshotOverride || adapter.exportState();
      const entries=(state.products||[]).filter(p=>Number(p.stock)>0 && p.hiddenOffProduction!==true && p.commercialHidden!==true && p.hiddenFromCatalog!==true);
      const existingSnap=await getDoc(doc(db,'boutiques',currentUser.uid,'catalogue','current'));
      const prior=existingSnap.exists()&&Array.isArray(existingSnap.data().products)?existingSnap.data().products:null;
      // Un nouveau catalogue peut aussi être créé sans action manuelle.
      const priorById=new Map((prior||[]).map(p=>[String(p.shopId||p.id),p]));
      const firstPublication=new Date().toISOString();
      const products=entries.map(p=>({
        firstPublishedAt:prior===null?null:(priorById.has(String(p.shopId||p.id))?(priorById.get(String(p.shopId||p.id)).firstPublishedAt||null):firstPublication),
        id:String(p.id||'').slice(0,160),shopId:String(p.shopId||'').slice(0,32),
        name:String(p.name||'Sans nom').slice(0,160),category:String(p.category||'').slice(0,90),
        colors:String(p.colors||'').slice(0,140),price:Math.max(0,Number(p.price)||0),
        stock:Math.max(0,Math.floor(Number(p.stock)||0))
      }));
      if(products.length>450)throw Error('Catalogue trop grand : maximum 450 variantes dans cette version.');
      boutiqueNotice(auto?'☁ Mise à jour automatique du catalogue Boutique…':'Publication du catalogue Boutique…');boutiqueSyncState('Boutique : publication en cours…','pending');
      // Index publié même lorsque des produits sont retirés du stock.
      await setDoc(doc(db,'boutiques',currentUser.uid,'catalogue','current'),{version:1,products,publishedAt:serverTimestamp()});
      cataloguePublishedKnown=true;
      let uploaded=0,missing=0,failed=0;
      for(const product of (photoReady?products:[])){
        const original=entries.find(p=>String(p.shopId)===String(product.shopId));
        const photo=photoCache.get('print:product-shop:'+product.shopId)||photoCache.get('print:product:'+(original?.legacyPhotoId||product.id));
        if(!photo||!photo.startsWith('data:image/jpeg;base64,')){missing++;continue;}
        if(photo.length>285000){failed++;continue;}
        const key=String(product.shopId);
        // Avoid writing every photo after every simple stock or price change.
        if(lastPhotoPublication.get(key)===photo)continue;
        try{
          await setDoc(doc(db,'boutiques',currentUser.uid,'photos',photoId('shop:'+key)),{image:photo,updatedAt:serverTimestamp()});
          lastPhotoPublication.set(key,photo);uploaded++;
        }catch(e){failed++;console.warn('Publication photo Boutique:',key,e);}
      }
      boutiqueNotice(`✓ Catalogue Boutique à jour • ${products.length} produits${uploaded?' • '+uploaded+' photo(s) mise(s) à jour':''}${failed?' • '+failed+' erreur(s) de photo':''} • ${stamp()}`,failed>0);
      boutiqueLastSignature=JSON.stringify(state.products||[]);
      if(!boutiqueAutoRequested)boutiqueForcePublication=false;
      boutiqueSyncState(failed?'Boutique : données à jour, photo(s) à vérifier':'Boutique : à jour ✓',failed?'error':'success');
      if(failed)boutiqueAutoRetry=true;
    }finally{
      boutiqueBusy=false;catalogButton.disabled=false;
      if(boutiqueAutoRequested){requestAutoBoutiquePublication();}
    }
  }
  // Publication Boutique AUTONOME : jamais bloquée par pending/busy du cloud privé.
  // Chaque sauvegarde de produit déclenche ce planificateur, même si le panneau
  // Synchronisation n'a jamais été ouvert. Une écriture en cours est sérialisée.
  function requestAutoBoutiquePublication(force=false){
    if(!currentUser)return;
    if(conflict){boutiqueSyncState('Boutique : conflit Firebase — vérifier les données','error');return;}
    if(force)boutiqueForcePublication=true;
    boutiqueAutoRequested=true;
    boutiqueSyncState('Boutique : publication automatique prévue…','pending');
    clearTimeout(boutiqueAutoTimer);
    boutiqueAutoTimer=setTimeout(async()=>{
      if(!boutiqueAutoRequested||!currentUser||conflict)return;
      if(boutiqueBusy)return; // finally publiera les changements plus récents.
      boutiqueAutoRequested=false;
      const signature=JSON.stringify(adapter.exportState().products||[]);
      if(!boutiqueForcePublication && signature===boutiqueLastSignature){
        boutiqueSyncState('Boutique : à jour ✓','success');return;
      }
      try{await publishBoutique(true);}catch(e){
        console.error('Publication automatique JJ3D:',e);
        boutiqueNotice('⚠ Boutique non mise à jour : '+e.message+' — vérifie Firebase ou réessaie manuellement.',true);
        boutiqueSyncState('Boutique : erreur de publication — '+String(e.code||e.message).slice(0,90),'error');
      }
    },650);
  }
  // Compatibilité avec les autres modules qui publient des photos / commandes.
  window.JJ3DAutoPublishCatalogue=requestAutoBoutiquePublication;
  window.JJ3DPublishCatalogueAfterSave=async()=>{requestAutoBoutiquePublication();};
  catalogButton.addEventListener('click',async()=>{
    try{await publishBoutique(false);}catch(e){console.error('Publication boutique:',e);boutiqueNotice('Publication impossible : '+e.message,true);}
  });
  // Une seule première publication manuelle est nécessaire; ensuite le bouton Enregistrer suffit.
  async function detectPublishedCatalogue(){
    if(!currentUser)return;
    const uid=currentUser.uid;
    try{const snap=await getDoc(doc(db,'boutiques',uid,'catalogue','current'));
      if(currentUser?.uid!==uid)return;
      cataloguePublishedKnown=snap.exists();didLoadExistingCatalogue=true;if(!cataloguePublishedKnown)boutiqueSyncState('Boutique : publication initiale requise','pending');
      if(cataloguePublishedKnown){
        boutiqueNotice('✓ Publication automatique prête. Les enregistrements actualiseront le catalogue Boutique.');boutiqueSyncState(window.JJ3DAutoPublishCatalogue?'Boutique : publication automatique prête':'Boutique : erreur — publication indisponible',window.JJ3DAutoPublishCatalogue?'success':'error');
        // Ne pas republier au simple chargement de la page : les données locales
        // peuvent être plus anciennes que la sauvegarde Firebase privée.
      }
    }catch(e){console.warn('Détection catalogue:',e);boutiqueSyncState('Boutique : détection impossible','error');}
  }
  // Lorsqu'une photo cloud est changée, publier la photo vers Boutique sans bouton manuel.
  // Premier chargement traité séparément pour éviter une publication prématurée.
  let initialPhotoSnapshot=true;
  function watchPhotos(){
    if(photoUnsub)photoUnsub();photoReady=false;photoCache.clear();
    photoNotice('Chargement des photos depuis Firebase…');
    const ref=collection(db,'workspaces',currentUser.uid,'photos');
    photoUnsub=onSnapshot(ref,snap=>{
      photoCache=new Map(snap.docs.filter(d=>typeof d.data().key==='string'&&typeof d.data().image==='string').map(d=>[d.data().key,d.data().image]));
      photoReady=true;
      photoNotice(`${photoCache.size} photo(s) cloud disponibles. Les nouvelles photos sont synchronisées avec ton compte.`);
      window.dispatchEvent(new Event('printpilot:photos-changed'));
      if(initialPhotoSnapshot)initialPhotoSnapshot=false;
      // Le déclenchement des photos enregistrées localement est fait dans savePhoto.
      // Une mise à jour externe de cache ne doit pas publier un catalogue local périmé.
      if(boutiqueAutoRequested)requestAutoBoutiquePublication();
    },err=>{photoReady=false;photoNotice('Erreur photos cloud : '+(err.code||err.message)+'. Vérifie les règles Firestore.');console.error('Photos cloud:',err);});
  }
  photoMigrateButton?.addEventListener('click',async()=>{
    if(!window.PrintPilotPhotos.isReady()){photoNotice('Attends le chargement des photos cloud et vérifie les règles Firestore.');return;}
    if(!confirm('Envoyer les anciennes photos stockées SUR CET APPAREIL vers le cloud? Les photos existantes dans le cloud seront conservées.'))return;
    photoMigrateButton.disabled=true;
    try{
      const result=await window.PrintPilotLocalPhotos.migrateLocalPhotos(({sent,skipped,failed,total})=>photoNotice(`Migration : ${sent} envoyées · ${skipped} déjà présentes · ${failed} erreurs / ${total}`));
      photoNotice(`Terminé : ${result.sent} envoyées, ${result.skipped} ignorées, ${result.failed} échecs sur ${result.total}.`);
    }catch(e){console.error(e);photoNotice('Migration impossible : '+e.message);}
    finally{photoMigrateButton.disabled=false;}
  });
  const f=document.getElementById('cloud-auth-form');
  f.addEventListener('submit',async e=>{e.preventDefault();errorEl.textContent='';try{await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(err){showError(err);}});
  document.getElementById('cloud-signup').addEventListener('click',async()=>{errorEl.textContent='';if(!confirm('Créer un nouveau compte privé PrintPilot avec ce courriel?'))return;try{await createUserWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(e){showError(e);}});
  document.getElementById('cloud-logout').addEventListener('click',async()=>{try{await signOut(auth);}catch(e){showError(e);}});
  document.getElementById('cloud-upload').addEventListener('click',async()=>{
   if(!currentUser)return;errorEl.textContent='';
   // Remote data may be present: don't overwrite without explicit strong acknowledgement.
   const isOverwrite=Boolean(remote);
   if(isOverwrite){
     const response=prompt('DANGER : les données cloud existantes seront remplacées par CE navigateur. Pour confirmer, écris REMPLACER. Sinon, annule.');
     if(response!=='REMPLACER')return;
   }else if(!confirm('Envoyer une copie des données de ce navigateur dans TON espace privé Firebase et activer la synchronisation?'))return;
   // Acquire expected cloud revision from fresh server before enabling.
   try{
    const snap=await firebase.getDoc(firebase.doc(db,'workspaces',currentUser.uid));
    const live=snap.exists()?snap.data():null;
    if(Boolean(live)!==isOverwrite || (live && remote && live.revision!==remote.revision)){setRemoteData(live);throw Error('Le cloud a changé. Relis la version cloud avant de recommencer.');}
    baseRevision=live?.revision||0;active=true;conflict=false;pending=true;
    await uploadSnapshot();
   }catch(e){active=false;showError(e);}
  });
  document.getElementById('cloud-download').addEventListener('click',async()=>{
   if(!currentUser)return;errorEl.textContent='';
   if(!confirm('Remplacer les données locales de CE navigateur par celles du cloud? Fais une sauvegarde JSON locale avant si tu as des modifications non synchronisées.'))return;
   try{
    const snap=await firebase.getDoc(firebase.doc(db,'workspaces',currentUser.uid));
    if(!snap.exists())throw Error('Aucune sauvegarde cloud disponible');
    const record=snap.data();
    safeSyncRemote(record);setRemoteData(record);
   }catch(e){active=false;showError(e);}
  });
  onAuthStateChanged(auth,async user=>{
   resetCloud();currentUser=user;errorEl.textContent='';
   authArea.hidden=Boolean(user);accountArea.hidden=!user;
   if(!user){setStatus('☁ Déconnecté. Connecte-toi pour synchroniser.');return;}
   bLink.value=boutiqueLink();
   accountLabel.textContent=`Compte privé : ${user.email || user.uid}`;
   setStatus('☁ Connecté : choisis une copie locale ou cloud.');
   beginListener();watchPhotos();
   // Indispensable : détecter l'index Boutique déjà publié sur ce compte.
   // Sans cet appel, cataloguePublishedKnown reste false et l'auto-publication ne démarre jamais.
   detectPublishedCatalogue();
   // Badge live : lit uniquement les messages non lus de l'atelier du propriétaire.
   try {
    unreadUnsub=onSnapshot(query(collection(db,'boutiques',user.uid,'messages'),where('read','==',false)),snapshot=>{
      setUnreadBadge(snapshot.size);
    },err=>{console.warn('Badge Messages Boutique:',err);setUnreadBadge(0);});
    try{requestsUnsub=onSnapshot(query(collection(db,'boutiques',user.uid,'requests'),where('status','==','pending')),snap=>setRequestBadge(snap.size),err=>{console.warn('Badge demandes:',err);setRequestBadge(0);});}catch(err){console.warn('Badge demandes:',err);setRequestBadge(0);}
    try{ordersUnsub=onSnapshot(query(collection(db,'boutiques',user.uid,'orders'),where('status','==','pending')),snap=>setOrderBadge(snap.size),err=>{console.warn('Badge commandes:',err);setOrderBadge(0);});}catch(err){console.warn('Badge commandes:',err);setOrderBadge(0);}
    try{specialRequestsUnsub=onSnapshot(collection(db,'boutiques',user.uid,'customRequests'),snapshot=>{
      const list=snapshot.docs.map(d=>({id:d.id,...d.data()}));
      const seen=new Map(list.map(r=>[r.id,String(r.status||'')]));
      const count=list.filter(r=>['pending','payment_reported'].includes(r.status)).length;
      const bell=document.getElementById('jj3d-live-bell-count');if(bell)bell.textContent=String(count);
      const link=document.getElementById('jj3d-live-bell');if(link){link.classList.toggle('is-alert',count>0);link.title=count?`${count} demande(s) spéciale(s) à traiter`:'Aucune demande spéciale en attente';}
      if(jj3dNotificationSeen){const fresh=list.filter(r=>!jj3dNotificationSeen.has(r.id));const changed=list.filter(r=>jj3dNotificationSeen.has(r.id)&&jj3dNotificationSeen.get(r.id)!==r.status);
        if(fresh.length||changed.length){const msg=fresh.length?`🔔 ${fresh.length} nouvelle(s) demande(s) spéciale(s) reçue(s)`:`🔔 Mise à jour Boutique : ${changed[0].item||'Projet'} (${changed[0].status})`;
          const a=document.getElementById('pp-notification-where');if(a){a.hidden=false;a.innerHTML=`<a href="#atelier-demandes">${msg.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</a>`;}
          if(document.hidden&&window.Notification?.permission==='granted')try{new Notification('JJ3D',{body:msg,icon:'icons/icon-192.png'});}catch(_){}
        }
      }
      jj3dNotificationSeen=seen;
    },err=>console.warn('Alertes demandes spéciales:',err));}catch(err){console.warn('Alertes demandes spéciales:',err);}
    try{invoiceOrdersUnsub=onSnapshot(collection(db,'boutiques',user.uid,'orders'),snap=>{setInvoiceOrders(snap.docs.map(d=>({id:d.id,...d.data()})),true);},err=>{console.warn('Factures commandes:',err);setInvoiceOrders([],false);});}catch(err){console.warn('Factures commandes:',err);setInvoiceOrders([],false);}
    try{deliveryReceiptsUnsub=onSnapshot(collection(db,'boutiques',user.uid,'deliveryReceipts'),snap=>{window.JJ3DDeliveryReceipts=snap.docs.map(d=>({id:d.id,...d.data()}));window.dispatchEvent(new Event('jj3d:receipts-updated'));},err=>console.warn('Rapports Boutique:',err));}catch(err){console.warn('Rapports Boutique:',err);}
   } catch(err){console.warn('Badge Messages Boutique:',err);setUnreadBadge(0);}

  });
 }catch(e){showError(e);authArea.hidden=true;}
}
