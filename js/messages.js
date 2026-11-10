// v4.9.1 — messages admin, isolés du document privé, synchronisés en direct.
const $=id=>document.getElementById(id),msg=(s)=>{$('message').textContent=s};
let auth,db,api,user=null,stop=null,items=[];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const filter=$('filter').value;const visible=items.filter(x=>filter==='all'||(filter==='read'===Boolean(x.read)));const unread=items.filter(x=>!x.read).length;$('count').textContent=visible.length+' message(s) · '+unread+' non lu(s)';document.title=(unread?'('+unread+') ':'')+'JJ3D v4.11.9 — Messages Boutique';$('messages').innerHTML=visible.map(x=>`<article class="inbox-message ${x.read?'':'is-unread'}"><div class="inbox-top"><strong>${escapeHTML(x.productName||'Commentaire général')}</strong><span>${x.read?'Lu':'Nouveau'}</span></div><p class="inbox-meta">${escapeHTML(x.senderEmail||'Compte Boutique')} · ${x.createdAt?.toDate?.()?.toLocaleString('fr-CA')||'Date en attente'}</p>${x.productId?`<p class="inbox-meta">ID : ${escapeHTML(x.productId)}</p>`:''}<p class="inbox-body">${escapeHTML(x.body)}</p><div class="inbox-actions"><button type="button" data-toggle="${escapeHTML(x.id)}">${x.read?'Marquer non lu':'Marquer comme lu'}</button><button type="button" class="delete-message" data-delete="${escapeHTML(x.id)}">🗑 Supprimer</button></div></article>`).join('')||'<p class="empty">Aucun message pour ce filtre.</p>';}
$('filter').addEventListener('change',render);
$('messages').addEventListener('click',async e=>{
 const del=e.target.closest('[data-delete]');
 if(del){
  const m=items.find(x=>x.id===del.dataset.delete);if(!m)return;
  if(!confirm('Supprimer définitivement ce message Boutique ? Cette action est irréversible.'))return;
  del.disabled=true;
  try{await api.deleteDoc(api.doc(db,'boutiques',user.uid,'messages',m.id));msg('✓ Message supprimé');}
  catch(err){msg('Suppression impossible : '+(err.code||err.message));}
  finally{del.disabled=false;}
  return;
 }
 const b=e.target.closest('[data-toggle]');if(!b)return;const m=items.find(x=>x.id===b.dataset.toggle);if(!m)return;b.disabled=true;try{await api.updateDoc(api.doc(db,'boutiques',user.uid,'messages',m.id),{read:!m.read});}catch(err){msg('Impossible de changer le statut : '+(err.code||err.message));}finally{b.disabled=false;}});
$('refresh').addEventListener('click',()=>render());
try{
 const cfg=window.PRINTPILOT_FIREBASE_CONFIG;if(!cfg?.apiKey)throw Error('Configuration Firebase manquante');
 const v='13.1.0';const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword},{getFirestore,collection,doc,onSnapshot,query,orderBy,updateDoc,deleteDoc}]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);
 const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);api={doc,updateDoc,deleteDoc};
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button');b.disabled=true;try{await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(err){msg('Connexion impossible : '+(err.code||err.message));}finally{b.disabled=false;}});
 onAuthStateChanged(auth,u=>{if(stop){stop();stop=null;}user=u;items=[];render();$('account').textContent=u?.email||'';$('inbox').hidden=!u;$('login-panel').hidden=!!u;
 if(!u){msg('Connecte-toi avec le compte administrateur de JJ3D.');return;}
 msg('Chargement des messages…');stop=onSnapshot(query(collection(db,'boutiques',u.uid,'messages'),orderBy('createdAt','desc')),snapshot=>{items=snapshot.docs.map(d=>({id:d.id,...d.data()}));render();msg('✓ Messages synchronisés automatiquement');},err=>{msg('Impossible d’ouvrir les messages de cet atelier : '+(err.code||err.message)+'. Utilise le compte administrateur et vérifie les règles v4.9.1.');});});
}catch(err){msg('Erreur : '+err.message);console.error(err);}
