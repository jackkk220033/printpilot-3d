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
const CFG = window.PRINTPILOT_FIREBASE_CONFIG;
const LINK_UID = 'printpilot-cloud-linked-uid-v3';
const DIGEST_KEY = 'printpilot-cloud-synced-snapshot-v3';
const configOK = CFG && typeof CFG.apiKey === 'string' && CFG.apiKey.length > 12 && !CFG.apiKey.startsWith('REMPLACER') && CFG.projectId && !CFG.projectId.startsWith('REMPLACER') && CFG.appId && !CFG.appId.startsWith('REMPLACER');
let auth=null, db=null, firebase=null, currentUser=null, remote=null, unsubscribe=null;
let baseRevision=null, active=false, pending=false, busy=false, conflict=false, timer=null, observedOnce=false;
const localJSON=()=>JSON.stringify(adapter.exportState());
const stamp=()=>new Date().toLocaleString('fr-CA');
const describe=doc=> doc ? `Version cloud ${doc.revision || 0} • ${doc.savedAt?.toDate?.()?.toLocaleString('fr-CA') || 'date indisponible'} • ${doc.data?.rolls?.length ?? 0} bobines, ${doc.data?.products?.length ?? 0} produits` : 'Aucune sauvegarde cloud pour ce compte.';
function setStatus(message,isError=false){status.textContent=message;status.style.borderColor=isError?'#b45366':'#3b4e77';document.getElementById('sidebar-storage').textContent=active&&!conflict?'☁ Synchronisation active': '● Stockage local actif';}
function showError(e){console.error('PrintPilot cloud:',e); const message=e?.code ==='auth/invalid-credential'?'Courriel ou mot de passe incorrect.': e?.code==='auth/email-already-in-use'?'Ce courriel possède déjà un compte.':e?.code==='auth/weak-password'?'Mot de passe trop faible.':e?.code==='permission-denied'?'Permission refusée : vérifie les règles Firestore et le projet Firebase.':String(e?.message||e);errorEl.textContent=message;setStatus('Synchronisation interrompue — données locales conservées.',true);}
function resetCloud(){active=false;pending=false;conflict=false;busy=false;remote=null;baseRevision=null;observedOnce=false;clearTimeout(timer);if(unsubscribe){unsubscribe();unsubscribe=null;}setStatus('Connecte-toi pour retrouver tes données.');}
function setRemoteData(record){remote=record;remoteInfo.textContent=describe(record);document.getElementById('cloud-download').disabled=!record;}
function rememberSynced(){localStorage.setItem(LINK_UID,currentUser.uid);localStorage.setItem(DIGEST_KEY,localJSON());}
function safeSyncRemote(record){
  const old=localJSON();
  if(record?.data && JSON.stringify(record.data)!==old){adapter.closeAllDialogs();adapter.applyState(record.data);}
  baseRevision=record.revision;rememberSynced();active=true;pending=false;conflict=false;
  setStatus(`☁ Synchronisé avec Firebase • ${stamp()}`);
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
  // Another edit may have happened while awaiting network; don't mark those changes synced.
  localStorage.setItem(LINK_UID,currentUser.uid);
  localStorage.setItem(DIGEST_KEY,serialized);
  setStatus(`☁ Sauvegardé dans Firebase • ${stamp()}`);
 }catch(e){
  active=false;conflict=true;showError(e);
  setStatus('⚠ Échec / conflit : changements locaux conservés, non synchronisés. Export JSON conseillé.',true);
 }finally{
  busy=false;pending=false;
  if(active && localJSON()!==localStorage.getItem(DIGEST_KEY))scheduleUpload();
 }
}
function scheduleUpload(){
 if(!active||conflict)return;
 pending=true;setStatus('☁ Modifications locales en attente de synchronisation…');
 clearTimeout(timer);timer=setTimeout(()=>{if(busy){scheduleUpload();return;}uploadSnapshot();},1100);
}
window.addEventListener('printpilot:changed',()=>{if(active)scheduleUpload();else if(currentUser)setStatus('Données modifiées localement. Active le cloud pour les synchroniser.');});
openBtn.addEventListener('click',()=>modal.showModal());
closeBtn.addEventListener('click',()=>modal.close());
if(!configOK){
  setStatus('☁ Firebase à configurer : ouvre js/firebase-config.js. L’inventaire local reste accessible.');
  authArea.hidden=true;
  document.getElementById('cloud-account-area').hidden=true;
}else{
 try{
  const sdkVersion='13.1.0';
  const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,onSnapshot,runTransaction,serverTimestamp}]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`)
  ]);
  const firebaseApp=initializeApp(CFG);auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);
  firebase={doc,getDoc,onSnapshot,runTransaction,serverTimestamp};
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
   accountLabel.textContent=`Compte privé : ${user.email || user.uid}`;
   setStatus('☁ Connecté : choisis une copie locale ou cloud.');
   beginListener();
  });
 }catch(e){showError(e);authArea.hidden=true;}
}
