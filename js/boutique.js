// Portail Boutique v4.9.1 — aucun accès aux données privées /workspaces.
const $=id=>document.getElementById(id);
const owner=new URL(location.href).searchParams.get('atelier')||'';
const msg=(s,ok=false)=>{$('message').textContent=s;$('message').classList.toggle('success',ok)};
let auth,db,api,current=null,products=[],images=new Map(),detach=null,detachPlanning=null,selectedProductId=null;
let boutiqueTab="catalogue",cart=[],planning=[],planningImages=new Map();
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoId=key=>Array.from(new TextEncoder().encode(key),b=>b.toString(16).padStart(2,'0')).join('');
const cad=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(v||0);
function render(){
 const q=$('search').value.trim().toLocaleLowerCase('fr');const cat=$('category').value;const avail=$('availability').value;
 const list=products.filter(p=>(!cat||p.category===cat)&&(avail!=='instock'||p.stock>0)&&[p.name,p.colors,p.shopId,p.id,p.category].join(' ').toLocaleLowerCase('fr').includes(q));
 $('result-count').textContent=list.length+' produit(s)';$('empty').hidden=Boolean(list.length);
 $('cards').innerHTML=list.map(p=>`<article class="product"><button type="button" class="product-open" data-open-product="${escapeHTML(p.id)}" aria-label="Voir ${escapeHTML(p.name)} en détail"><div class="photo" data-photo="${escapeHTML(p.id)}">▧</div><div class="details"><h3>${escapeHTML(p.name)}</h3><div class="price">${cad(p.price)}</div><p class="sub">#${escapeHTML(p.shopId)} · ${escapeHTML(p.category||'Autre')}</p><p class="sub">${escapeHTML(p.colors||'')}</p><span class="stock ${p.stock>0?'':'zero'}">${p.stock>0?p.stock+' disponible(s)':'Épuisé'}</span></div></button></article>`).join('');
 for(const element of document.querySelectorAll('[data-photo]')){
  const pId=element.dataset.photo;if(images.has(pId)){const img=document.createElement('img');img.src=images.get(pId);img.alt='Photo de '+(products.find(p=>p.id===pId)?.name||'produit');img.loading='lazy';element.replaceChildren(img);}
 }
}
function resetUI(){selectedProductId=null;if($('product-dialog').open)$('product-dialog').close();products=[];images.clear();$('catalogue-panel').hidden=true;$('login-panel').hidden=false;$('logout').hidden=true;$('who').textContent='';if(detach){detach();detach=null;}if(detachPlanning){detachPlanning();detachPlanning=null;}$('boutique-tabs').hidden=true;cart=[];planning=[];planningImages.clear();$('orders-panel').hidden=true;$('planning-panel').hidden=true;}
function fillCategories(){const selected=$('category').value;const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));$('category').replaceChildren(new Option('Toutes les catégories',''),...cats.map(x=>new Option(x,x)));$('category').value=cats.includes(selected)?selected:'';}
async function getCatalogue(user){
 if(!owner||!/^[A-Za-z0-9_-]{10,128}$/.test(owner))throw Error('Le lien de la boutique est incomplet. Demande le lien généré depuis PrintPilot.');
 const role=await api.getDoc(api.doc(db,'boutiques',owner,'members',user.uid));
 if(!role.exists()&&user.uid!==owner)throw Error('Ce compte n’est pas encore autorisé. Demande à l’administrateur de copier ton UID Firebase dans « Autoriser ce compte ».');
 const reference=api.doc(db,'boutiques',owner,'catalogue','current');
 detach=api.onSnapshot(reference,async snap=>{
  if(!snap.exists()){msg('Le catalogue n’a pas encore été publié par l’atelier.');products=[];render();return;}
  products=Array.isArray(snap.data().products)?snap.data().products:[];
  fillCategories();render();msg('Catalogue publié · lecture seule',true);const targetProduct=new URL(location.href).searchParams.get('produit');if(targetProduct&&products.some(p=>p.id===targetProduct))setTimeout(()=>openProduct(targetProduct),50);
  updateOrderOptions();const selector=$('boutique-request-product');if(selector)selector.innerHTML=products.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+' (#'+escapeHTML(p.shopId)+')</option>').join('');
  // Les photos partagées se trouvent dans une collection distincte et sécurisée.
  for(const p of products){
   if(!current||current.uid!==user.uid)return;
   try{let photo=await api.getDoc(api.doc(db,'boutiques',owner,'photos',photoId('shop:'+p.shopId)));if(!photo.exists())photo=await api.getDoc(api.doc(db,'boutiques',owner,'photos',photoId('product:'+p.id)));
    if(photo.exists()&&typeof photo.data().image==='string'&&photo.data().image.startsWith('data:image/jpeg;base64,')){images.set(p.id,photo.data().image);const el=[...document.querySelectorAll('[data-photo]')].find(e=>e.dataset.photo===p.id);if(el){const img=document.createElement('img');img.src=photo.data().image;img.alt='Photo de '+p.name;img.loading='lazy';el.replaceChildren(img);}}
   }catch(e){console.warn('Photo boutique:',p.id,e.code||e.message);}
  }
 },err=>msg('Accès refusé au catalogue : '+(err.code||err.message)));
 $('login-panel').hidden=true;$('boutique-tabs').hidden=false;$('logout').hidden=false;$('who').textContent=user.email||'Boutique';setBoutiqueTab(boutiqueTab);loadPlanning();
}
function openProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;selectedProductId=id;
 $('detail-name').textContent=p.name||'Produit';$('detail-price').textContent=cad(p.price);
 $('detail-meta').textContent='ID boutique #'+(p.shopId||'—')+' · ID Excel '+(p.id||'—')+' · '+(p.category||'Autre');
 $('detail-colors').textContent='Couleur(s) : '+(p.colors||'—');
 $('detail-stock').textContent=p.stock>0?p.stock+' disponible(s)':'Épuisé';
 const wrap=$('detail-photo');wrap.replaceChildren();
 if(images.has(id)){const im=document.createElement('img');im.src=images.get(id);im.alt='Photo de '+p.name;wrap.append(im);}else wrap.textContent='Aucune photo disponible';
 const f=$('product-note-form');f.reset();f.querySelector('.send-status').textContent='';$('product-dialog').showModal();
}

function setBoutiqueTab(next){boutiqueTab=next;['catalogue','orders','planning'].forEach(t=>{const el=$(t+'-panel');el.hidden=t!==next;});document.querySelectorAll('[data-btab]').forEach(b=>b.classList.toggle('selected',b.dataset.btab===next));if(next==='orders')renderCart();if(next==='planning')renderPlanning();}
$('boutique-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-btab]');if(b)setBoutiqueTab(b.dataset.btab);});
function updateOrderOptions(){const select=$('order-product');if(!select)return;const previous=select.value;select.replaceChildren(...products.map(p=>new Option(`${p.name} — ${p.colors||''} (#${p.shopId||'—'})`,p.id)));if(products.some(p=>p.id===previous))select.value=previous;}
function renderCart(){const el=$('order-cart');$('order-count').textContent=`(${cart.reduce((a,x)=>a+x.quantity,0)} unités)`;el.innerHTML=cart.length?cart.map((item,i)=>`<div class="cart-row"><div><strong>${escapeHTML(item.name)}</strong><small> ${escapeHTML(item.colors||'')} · ${item.quantity} unité(s)</small></div><button type="button" data-remove-cart="${i}" aria-label="Retirer">✕</button></div>`).join(''):'<p class="sub">Aucun produit ajouté.</p>';$('order-send').disabled=cart.length===0;}
$('order-add').addEventListener('click',()=>{const p=products.find(x=>x.id===$('order-product').value),q=Number($('order-qty').value);const status=$('order-status');if(!p||!Number.isInteger(q)||q<1||q>300){status.textContent='Choisis un produit et une quantité de 1 à 300.';return;}const item=cart.find(x=>x.productId===p.id);if(item){if(item.quantity+q>300){status.textContent='Maximum de 300 unités par produit.';return;}item.quantity+=q;}else{if(cart.length>=25){status.textContent='Maximum de 25 produits différents par commande.';return;}cart.push({productId:p.id,name:String(p.name).slice(0,120),colors:String(p.colors||'').slice(0,120),shopId:String(p.shopId||'').slice(0,32),quantity:q});}status.textContent='✓ Ajouté à la commande';renderCart();});
$('order-cart').addEventListener('click',e=>{const b=e.target.closest('[data-remove-cart]');if(b){cart.splice(Number(b.dataset.removeCart),1);renderCart();}});
$('order-send').addEventListener('click',async()=>{const button=$('order-send'),status=$('order-status');if(!current||!owner||!cart.length)return;button.disabled=true;status.textContent='Envoi en cours…';try{await api.addDoc(api.collection(db,'boutiques',owner,'orders'),{items:cart.map(({productId,name,colors,shopId,quantity})=>({productId,productName:name,colors,shopId,quantity})),note:$('order-note').value.trim().slice(0,400),senderUid:current.uid,senderEmail:String(current.email||''),status:'pending',createdAt:api.serverTimestamp()});cart=[];$('order-note').value='';renderCart();status.textContent='✓ Commande envoyée à l’atelier!';}catch(e){status.textContent='Envoi impossible : '+(e.code||e.message)+'. La commande est conservée.';button.disabled=false;}});
function renderPlanning(){const states={todo:'En attente',doing:'En impression',paused:'En pause',done:'Terminé',failed:'Échec'};const target=$('planning-cards');$('planning-empty').hidden=planning.length>0;target.innerHTML=planning.map(x=>`<article class="planning-card"><div class="planning-image" data-planning-photo="${escapeHTML(x.id)}">${x.hasPhoto?'Chargement de la capture…':'🖨'}</div><div class="planning-content"><span class="planning-status">${states[x.status]||'En attente'}</span><h3>${escapeHTML(x.name)}</h3><p class="sub">${Number(x.quantity)||1} unité(s)</p>${x.note?`<p>${escapeHTML(x.note)}</p>`:''}</div></article>`).join('');for(const x of planning.filter(x=>x.hasPhoto)){const el=[...target.querySelectorAll('[data-planning-photo]')].find(e=>e.dataset.planningPhoto===x.id);if(!el)continue;if(planningImages.has(x.id)){const im=document.createElement('img');im.src=planningImages.get(x.id);im.alt='Capture du projet '+x.name;el.replaceChildren(im);}else api.getDoc(api.doc(db,'boutiques',owner,'planningPhotos',x.id)).then(doc=>{const src=doc.data()?.image;if(typeof src==='string'&&src.startsWith('data:image/jpeg;base64,')){planningImages.set(x.id,src);if(el.isConnected){const im=document.createElement('img');im.src=src;im.alt='Capture du projet';el.replaceChildren(im);}}else if(el.isConnected)el.textContent='🖨';}).catch(()=>{if(el.isConnected)el.textContent='🖨';});}}
function loadPlanning(){if(detachPlanning)detachPlanning();detachPlanning=api.onSnapshot(api.doc(db,'boutiques',owner,'planning','current'),snap=>{planning=snap.exists()&&Array.isArray(snap.data().items)?snap.data().items:[];if(boutiqueTab==='planning')renderPlanning();},e=>{if(boutiqueTab==='planning')$('planning-empty').textContent='Suivi indisponible : '+(e.code||e.message);});}

$('cards').addEventListener('click',e=>{const el=e.target.closest('[data-open-product]');if(el)openProduct(el.dataset.openProduct);});
$('detail-close').addEventListener('click',()=>$('product-dialog').close());
async function sendNote(form,product){
 const button=form.querySelector('button[type=submit]');const status=form.querySelector('.send-status');
 if(!current||!owner){status.textContent='Connecte-toi au compte Boutique.';status.classList.add('error');return;}
 const body=form.elements.body.value.trim();if(body.length<2||body.length>1200){status.textContent='Entre un message de 2 à 1200 caractères.';status.classList.add('error');return;}
 button.disabled=true;status.classList.remove('error');status.textContent='Envoi en cours…';
 try{
  await api.addDoc(api.collection(db,'boutiques',owner,'messages'),{
   senderUid:current.uid,senderEmail:String(current.email||'').slice(0,254),
   body,productId:String(product?.id||'').slice(0,160),productName:String(product?.name||'').slice(0,160),
   createdAt:api.serverTimestamp(),read:false
  });
  form.reset();status.textContent='✓ Message envoyé automatiquement à l’atelier!';
 }catch(err){status.classList.add('error');status.textContent='Envoi impossible : '+(err.code||err.message)+'. Ton texte n’a pas été supprimé.';console.error('Message Boutique:',err);}
 finally{button.disabled=false;}
}
$('boutique-operation-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const status=$('operation-status');const button=f.querySelector('button[type=submit]');const p=products.find(x=>x.id===f.elements.productId.value);const kind=f.elements.kind.value;const quantity=Number(f.elements.quantity.value);if(!current||!owner||!p||!['sale','restock'].includes(kind)||!Number.isInteger(quantity)||quantity<1||quantity>300){status.textContent='Vérifie la connexion, le produit et la quantité.';return;}button.disabled=true;status.textContent='Envoi en cours…';try{await api.addDoc(api.collection(db,'boutiques',owner,'requests'),{kind,productId:p.id,productName:p.name,shopId:String(p.shopId||''),quantity,unitPrice:Number(p.price)||0,note:String(f.elements.note.value||'').trim().slice(0,400),senderUid:current.uid,senderEmail:String(current.email||''),status:'pending',createdAt:api.serverTimestamp()});f.reset();status.textContent='✓ Demande envoyée automatiquement!';}catch(err){status.textContent='Échec : '+(err.code||err.message)+'. La demande n’a pas été effacée.';}finally{button.disabled=false;}});
$('general-note-form').addEventListener('submit',e=>{e.preventDefault();sendNote(e.currentTarget,null);});
$('product-note-form').addEventListener('submit',e=>{e.preventDefault();sendNote(e.currentTarget,products.find(p=>p.id===selectedProductId));});
$('search').addEventListener('input',render);$('category').addEventListener('change',render);$('availability').addEventListener('change',render);
try{
 const cfg=window.PRINTPILOT_FIREBASE_CONFIG;
 if(!cfg?.apiKey)throw Error('Configuration Firebase absente.');
 const v='13.1.0';
 const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,onSnapshot,addDoc,collection,serverTimestamp}]=await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);
 const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);api={doc,getDoc,onSnapshot,addDoc,collection,serverTimestamp};
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button[type=submit]');b.disabled=true;msg('Connexion en cours…');try{await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(e){msg('Connexion impossible : '+(e.code||e.message));}finally{b.disabled=false;}});
 $('logout').addEventListener('click',()=>signOut(auth));
 onAuthStateChanged(auth,async u=>{resetUI();current=u;msg('');if(!u)return;try{await getCatalogue(u);}catch(e){msg(e.message||String(e));$('who').textContent=u.email||'';$('logout').hidden=false;}});
}catch(e){msg('Erreur de configuration : '+e.message);console.error(e);}
