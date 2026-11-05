// Portail Boutique v4.7 — aucun accès aux données privées /workspaces.
const $=id=>document.getElementById(id);
const owner=new URL(location.href).searchParams.get('atelier')||'';
const msg=(s,ok=false)=>{$('message').textContent=s;$('message').classList.toggle('success',ok)};
let auth,db,api,current=null,products=[],images=new Map(),detach=null;
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoId=key=>Array.from(new TextEncoder().encode(key),b=>b.toString(16).padStart(2,'0')).join('');
const cad=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(v||0);
function render(){
 const q=$('search').value.trim().toLocaleLowerCase('fr');const cat=$('category').value;const avail=$('availability').value;
 const list=products.filter(p=>(!cat||p.category===cat)&&(avail!=='instock'||p.stock>0)&&[p.name,p.colors,p.shopId,p.id,p.category].join(' ').toLocaleLowerCase('fr').includes(q));
 $('result-count').textContent=list.length+' produit(s)';$('empty').hidden=Boolean(list.length);
 $('cards').innerHTML=list.map(p=>`<article class="product"><div class="photo" data-photo="${escapeHTML(p.id)}">▧</div><div class="details"><h3>${escapeHTML(p.name)}</h3><div class="price">${cad(p.price)}</div><p class="sub">#${escapeHTML(p.shopId)} · ${escapeHTML(p.category||'Autre')}</p><p class="sub">${escapeHTML(p.colors||'')}</p><span class="stock ${p.stock>0?'':'zero'}">${p.stock>0?p.stock+' disponible(s)':'Épuisé'}</span></div></article>`).join('');
 for(const element of document.querySelectorAll('[data-photo]')){
  const pId=element.dataset.photo;if(images.has(pId)){const img=document.createElement('img');img.src=images.get(pId);img.alt='Photo de '+(products.find(p=>p.id===pId)?.name||'produit');img.loading='lazy';element.replaceChildren(img);}
 }
}
function resetUI(){products=[];images.clear();$('catalogue-panel').hidden=true;$('login-panel').hidden=false;$('logout').hidden=true;$('who').textContent='';if(detach){detach();detach=null;}}
function fillCategories(){const selected=$('category').value;const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));$('category').replaceChildren(new Option('Toutes les catégories',''),...cats.map(x=>new Option(x,x)));$('category').value=cats.includes(selected)?selected:'';}
async function getCatalogue(user){
 if(!owner||!/^[A-Za-z0-9_-]{10,128}$/.test(owner))throw Error('Le lien de la boutique est incomplet. Demande le lien généré depuis PrintPilot.');
 const role=await api.getDoc(api.doc(db,'boutiques',owner,'members',user.uid));
 if(!role.exists()&&user.uid!==owner)throw Error('Ce compte n’est pas encore autorisé. Demande à l’administrateur de copier ton UID Firebase dans « Autoriser ce compte ».');
 const reference=api.doc(db,'boutiques',owner,'catalogue','current');
 detach=api.onSnapshot(reference,async snap=>{
  if(!snap.exists()){msg('Le catalogue n’a pas encore été publié par l’atelier.');products=[];render();return;}
  products=Array.isArray(snap.data().products)?snap.data().products:[];
  fillCategories();render();msg('Catalogue publié · lecture seule',true);
  // Les photos partagées se trouvent dans une collection distincte et sécurisée.
  for(const p of products){
   if(!current||current.uid!==user.uid)return;
   try{const photo=await api.getDoc(api.doc(db,'boutiques',owner,'photos',photoId('product:'+p.id)));
    if(photo.exists()&&typeof photo.data().image==='string'&&photo.data().image.startsWith('data:image/jpeg;base64,')){images.set(p.id,photo.data().image);const el=[...document.querySelectorAll('[data-photo]')].find(e=>e.dataset.photo===p.id);if(el){const img=document.createElement('img');img.src=photo.data().image;img.alt='Photo de '+p.name;img.loading='lazy';el.replaceChildren(img);}}
   }catch(e){console.warn('Photo boutique:',p.id,e.code||e.message);}
  }
 },err=>msg('Accès refusé au catalogue : '+(err.code||err.message)));
 $('login-panel').hidden=true;$('catalogue-panel').hidden=false;$('logout').hidden=false;$('who').textContent=user.email||'Boutique';
}
$('search').addEventListener('input',render);$('category').addEventListener('change',render);$('availability').addEventListener('change',render);
try{
 const cfg=window.PRINTPILOT_FIREBASE_CONFIG;
 if(!cfg?.apiKey)throw Error('Configuration Firebase absente.');
 const v='13.1.0';
 const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,onSnapshot}]=await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);
 const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);api={doc,getDoc,onSnapshot};
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button[type=submit]');b.disabled=true;msg('Connexion en cours…');try{await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(e){msg('Connexion impossible : '+(e.code||e.message));}finally{b.disabled=false;}});
 $('logout').addEventListener('click',()=>signOut(auth));
 onAuthStateChanged(auth,async u=>{resetUI();current=u;msg('');if(!u)return;try{await getCatalogue(u);}catch(e){msg(e.message||String(e));$('who').textContent=u.email||'';$('logout').hidden=false;}});
}catch(e){msg('Erreur de configuration : '+e.message);console.error(e);}
