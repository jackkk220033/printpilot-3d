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
let unreadUnsub=null,requestsUnsub=null,ordersUnsub=null,invoiceOrdersUnsub=null,deliveryReceiptsUnsub=null;
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
function stopUnreadBadge(){if(deliveryReceiptsUnsub){deliveryReceiptsUnsub();deliveryReceiptsUnsub=null;}window.JJ3DDeliveryReceipts=[];if(invoiceOrdersUnsub){invoiceOrdersUnsub();invoiceOrdersUnsub=null;}setInvoiceOrders([],false);if(unreadUnsub){unreadUnsub();unreadUnsub=null;}if(requestsUnsub){requestsUnsub();requestsUnsub=null;}if(ordersUnsub){ordersUnsub();ordersUnsub=null;}setUnreadBadge(0);setRequestBadge(0);setOrderBadge(0);}

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
function resetCloud(){window.JJ3DAutoPublishCatalogue=null;window.JJ3DPublishCatalogueAfterSave=null;boutiqueSyncState('Boutique : hors ligne','idle');jj3dLastPublishedRevision=null;clearTimeout(boutiqueAutoTimer);boutiqueAutoRequested=false;boutiqueAutoRunning=false;boutiqueAutoRetry=false;cataloguePublishedKnown=false;boutiqueLastSignature=null;boutiqueForcePublication=false;lastPhotoPublication.clear();stopUnreadBadge();if(photoUnsub){photoUnsub();photoUnsub=null;}photoCache.clear();photoReady=false;photoNotice('Connecte-toi pour synchroniser les photos.');window.dispatchEvent(new Event('printpilot:photos-changed'));active=false;pending=false;conflict=false;busy=false;remote=null;baseRevision=null;observedOnce=false;clearTimeout(timer);if(unsubscribe){unsubscribe();unsubscribe=null;}setStatus('Connecte-toi pour retrouver tes données.');}
function setRemoteData(record){remote=record;remoteInfo.textContent=describe(record);document.getElementById('cloud-download').disabled=!record;}
function rememberSynced(){localStorage.setItem(LINK_UID,currentUser.uid);localStorage.setItem(DIGEST_KEY,localJSON());}
function safeSyncRemote(record){
  const old=localJSON();
  if(record?.data && JSON.stringify(record.data)!==old){adapter.closeAllDialogs();adapter.applyState(record.data);}
  baseRevision=record.revision;rememberSynced();active=true;pending=false;conflict=false;
  setStatus(`☁ Synchronisé avec Firebase • ${stamp()}`);window.JJ3DPublishDeliveries?.(record.data)?.catch(e=>console.warn('Publication livraisons :',e));
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
        boutiqueNotice('✓ Publication automatique activée. Les sauvegardes Firebase actualiseront le catalogue Boutique.');boutiqueSyncState('Boutique : publication automatique active','success');
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
    try{invoiceOrdersUnsub=onSnapshot(collection(db,'boutiques',user.uid,'orders'),snap=>{setInvoiceOrders(snap.docs.map(d=>({id:d.id,...d.data()})),true);},err=>{console.warn('Factures commandes:',err);setInvoiceOrders([],false);});}catch(err){console.warn('Factures commandes:',err);setInvoiceOrders([],false);}
    try{deliveryReceiptsUnsub=onSnapshot(collection(db,'boutiques',user.uid,'deliveryReceipts'),snap=>{window.JJ3DDeliveryReceipts=snap.docs.map(d=>({id:d.id,...d.data()}));window.dispatchEvent(new Event('jj3d:receipts-updated'));},err=>console.warn('Rapports Boutique:',err));}catch(err){console.warn('Rapports Boutique:',err);}
   } catch(err){console.warn('Badge Messages Boutique:',err);setUnreadBadge(0);}

  });
 }catch(e){showError(e);authArea.hidden=true;}
}
