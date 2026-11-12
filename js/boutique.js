// Portail Boutique v4.9.1 — aucun accès aux données privées /workspaces.
const $=id=>document.getElementById(id);
const owner=new URL(location.href).searchParams.get('atelier')||'';
const msg=(s,ok=false)=>{$('message').textContent=s;$('message').classList.toggle('success',ok)};
let auth,db,api,current=null,products=[],images=new Map(),detach=null,detachPlanning=null,selectedProductId=null;
let onlyNew=false,customSent=[],detachCustomSent=null;
const isNew=p=>{if(!p.firstPublishedAt)return false;const d=Date.parse(p.firstPublishedAt);return Number.isFinite(d)&&d<=Date.now()&&Date.now()-d<7*86400000;};
let boutiqueTab="catalogue",cart=[],deliveries=[],receipts=[],planning=[],planningImages=new Map(),selectedPlanningId=null;
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoId=key=>Array.from(new TextEncoder().encode(key),b=>b.toString(16).padStart(2,'0')).join('');
const cad=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(v||0);
function render(){
 const q=$('search').value.trim().toLocaleLowerCase('fr');const cat=$('category').value;const avail=$('availability').value;
 const list=products.filter(p=>(!onlyNew||isNew(p))&&(!cat||p.category===cat)&&(avail!=='instock'||p.stock>0)&&[p.name,p.colors,p.shopId,p.id,p.category].join(' ').toLocaleLowerCase('fr').includes(q));
 $('result-count').textContent=list.length+' produit(s)';$('empty').hidden=Boolean(list.length);
 $('cards').innerHTML=list.map(p=>`<article class="product"><button type="button" class="product-open" data-open-product="${escapeHTML(p.id)}" aria-label="Voir ${escapeHTML(p.name)} en détail"><div class="photo" data-photo="${escapeHTML(p.id)}">▧</div><div class="details">${isNew(p)?'<span class="new-product-pill">🆕 NOUVEAU</span>':''}<h3>${escapeHTML(p.name)}</h3><div class="price">${cad(p.price)}</div><p class="sub">#${escapeHTML(p.shopId)} · ${escapeHTML(p.category||'Autre')}</p><p class="sub">${escapeHTML(p.colors||'')}</p><span class="stock ${p.stock>0?'':'zero'}">${p.stock>0?p.stock+' disponible(s)':'Épuisé'}</span></div></button></article>`).join('');
 for(const element of document.querySelectorAll('[data-photo]')){
  const pId=element.dataset.photo;if(images.has(pId)){const img=document.createElement('img');img.src=images.get(pId);img.alt='Photo de '+(products.find(p=>p.id===pId)?.name||'produit');img.loading='lazy';element.replaceChildren(img);}
 }
}
function resetUI(){selectedProductId=null;if($('product-dialog').open)$('product-dialog').close();if($('planning-dialog').open)$('planning-dialog').close();selectedPlanningId=null;products=[];images.clear();$('catalogue-panel').hidden=true;$('login-panel').hidden=false;$('logout').hidden=true;$('who').textContent='';if(detach){detach();detach=null;}if(detachPlanning){detachPlanning();detachPlanning=null;}if(detachDeliveries){detachDeliveries();detachDeliveries=null;}if(detachReceipts){detachReceipts();detachReceipts=null;}if(detachCustomSent){detachCustomSent();detachCustomSent=null;}jjShopSeen=null;$('boutique-tabs').hidden=true;cart=[];planning=[];planningImages.clear();$('orders-panel').hidden=true;$('planning-panel').hidden=true;$('special-panel').hidden=true;}
function fillCategories(){const selected=$('category').value;const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));$('category').replaceChildren(new Option('Toutes les catégories',''),...cats.map(x=>new Option(x,x)));$('category').value=cats.includes(selected)?selected:'';}
async function getCatalogue(user){
 if(!owner||!/^[A-Za-z0-9_-]{10,128}$/.test(owner))throw Error('Le lien de la boutique est incomplet. Demande le lien généré depuis JJ3D.');
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
 $('login-panel').hidden=true;$('boutique-tabs').hidden=false;$('logout').hidden=false;$('who').textContent=user.email||'Boutique';setBoutiqueTab(boutiqueTab);loadPlanning();loadDeliveries();
}
function openProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;selectedProductId=id;
 $('detail-name').textContent=p.name||'Produit';
 $('detail-price').textContent=cad(p.price);
 $('detail-stock').textContent=Number(p.stock)>0?String(p.stock):'Épuisé';
 $('detail-shop-id').textContent='#'+(p.shopId||'—');
 $('detail-excel-id').textContent=p.id||'—';
 $('detail-category').textContent=p.category||'—';
 $('detail-colors').textContent=p.colors||'—';
 const wrap=$('detail-photo');wrap.replaceChildren();
 if(images.has(id)){const im=document.createElement('img');im.src=images.get(id);im.alt='Photo de '+p.name;wrap.append(im);}else wrap.textContent='Aucune photo disponible';
 const f=$('product-note-form');f.reset();f.querySelector('.send-status').textContent='';$('product-dialog').showModal();
}

function setBoutiqueTab(next){boutiqueTab=next;['catalogue','orders','planning','special','deliveries'].forEach(t=>{const el=$(t+'-panel');el.hidden=t!==next;});document.querySelectorAll('[data-btab]').forEach(b=>b.classList.toggle('selected',b.dataset.btab===next));if(next==='orders')renderCart();if(next==='planning'||next==='special')renderPlanning();if(next==='deliveries')renderDeliveries();}
$('boutique-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-btab]');if(b)setBoutiqueTab(b.dataset.btab);});
function updateOrderOptions(){const select=$('order-product');if(!select)return;const previous=select.value;select.replaceChildren(...products.map(p=>new Option(`${p.name} — ${p.colors||''} (#${p.shopId||'—'})`,p.id)));if(products.some(p=>p.id===previous))select.value=previous;}
function renderCart(){const el=$('order-cart');$('order-count').textContent=`(${cart.reduce((a,x)=>a+x.quantity,0)} unités)`;el.innerHTML=cart.length?cart.map((item,i)=>`<div class="cart-row"><div><strong>${escapeHTML(item.name)}</strong><small> ${escapeHTML(item.colors||'')} · ${item.quantity} unité(s)</small></div><button type="button" data-remove-cart="${i}" aria-label="Retirer">✕</button></div>`).join(''):'<p class="sub">Aucun produit ajouté.</p>';$('order-send').disabled=cart.length===0;}
$('order-add').addEventListener('click',()=>{const p=products.find(x=>x.id===$('order-product').value),q=Number($('order-qty').value);const status=$('order-status');if(!p||!Number.isInteger(q)||q<1||q>300){status.textContent='Choisis un produit et une quantité de 1 à 300.';return;}const item=cart.find(x=>x.productId===p.id);if(item){if(item.quantity+q>300){status.textContent='Maximum de 300 unités par produit.';return;}item.quantity+=q;}else{if(cart.length>=25){status.textContent='Maximum de 25 produits différents par commande.';return;}cart.push({productId:p.id,name:String(p.name).slice(0,120),colors:String(p.colors||'').slice(0,120),shopId:String(p.shopId||'').slice(0,32),quantity:q});}status.textContent='✓ Ajouté à la commande';renderCart();});
$('order-cart').addEventListener('click',e=>{const b=e.target.closest('[data-remove-cart]');if(b){cart.splice(Number(b.dataset.removeCart),1);renderCart();}});
$('order-send').addEventListener('click',async()=>{const button=$('order-send'),status=$('order-status');if(!current||!owner||!cart.length)return;button.disabled=true;status.textContent='Envoi en cours…';try{await api.addDoc(api.collection(db,'boutiques',owner,'orders'),{items:cart.map(({productId,name,colors,shopId,quantity})=>({productId,productName:name,colors,shopId,quantity})),note:$('order-note').value.trim().slice(0,400),senderUid:current.uid,senderEmail:String(current.email||''),status:'pending',createdAt:api.serverTimestamp()});cart=[];$('order-note').value='';renderCart();status.textContent='✓ Commande envoyée à l’atelier!';}catch(e){status.textContent='Envoi impossible : '+(e.code||e.message)+'. La commande est conservée.';button.disabled=false;}});
async function boutiquePhoto(file){if(!file)return '';if(!file.type.startsWith('image/')||file.size>12*1024*1024)throw Error('Photo invalide ou trop grande (12 Mo max).');
 const image=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,660/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close?.();let data=canvas.toDataURL('image/jpeg',0.58);if(data.length>150000)data=canvas.toDataURL('image/jpeg',0.35);if(data.length>150000)throw Error('Photo trop volumineuse après compression, essaie une capture plus petite.');return data;
}
// Notification events fire only after the first successful snapshot, never on initial history load.
let jjShopSeen=null;
function jjShopNotify(message){
 let banner=document.getElementById('jj-shop-live-alert');
 if(!banner){banner=document.createElement('div');banner.id='jj-shop-live-alert';banner.setAttribute('role','status');banner.style.cssText='margin:12px 0;padding:13px;background:#292246;color:#f5eaff;border:1px solid #a185ff;border-radius:12px;font-weight:600';document.getElementById('jj-boutique-alerts')?.after(banner);}
 banner.textContent=message;
 if(document.hidden&&window.Notification?.permission==='granted')try{new Notification('JJ3D — Boutique',{body:message,icon:'icons/icon-192.png'})}catch(_){}
}
function jjShopRequestChanges(next){
 const currentStates=new Map(next.map(x=>[x.id,x.status]));
 if(jjShopSeen){
  const changed=next.filter(x=>jjShopSeen.has(x.id)&&jjShopSeen.get(x.id)!==x.status);
  if(changed.length)jjShopNotify('🔔 Mise à jour de la demande « '+(changed[0].item||'Projet')+' » : '+(requestStatusLabels[changed[0].status]||changed[0].status));
  else if([...jjShopSeen.keys()].some(id=>!currentStates.has(id)))jjShopNotify('🗑 Une demande a été supprimée dans JJ3D.');
 }
 jjShopSeen=currentStates;
 const count=next.filter(x=>x.status==='awaiting_payment'||x.status==='reviewed'||x.status==='payment_reported').length;
 const badge=document.getElementById('jj-shop-request-count');if(badge){badge.textContent=count?`🔔 ${count} demande(s) à suivre`:'✓ Demandes synchronisées';}
}
const requestStatusLabels={pending:'Nouvelle demande',reviewed:'En évaluation',quoted:'Modèle / prix à confirmer',awaiting_payment:'Paiement attendu',payment_reported:'Paiement signalé — vérification JJ3D',paid:'Paiement validé / production autorisée',rejected:'Refusée',accepted:'Acceptée'};
function renderSentRequests(){const target=$('boutique-custom-request-list');if(!target)return;target.innerHTML=customSent.length?customSent.map(r=>`<article class="jj-boutique-request-card"><strong>${escapeHTML(r.item||'Projet')} × ${Number(r.quantity)||1}</strong><span class="jj-boutique-state">${escapeHTML(requestStatusLabels[r.status]||r.status||'En attente')}</span><p class="sub">Client : ${escapeHTML(r.customer||'—')} · ${escapeHTML(r.dueAt||'Sans date souhaitée')}</p>${r.quoteInvoiceNumber?`<div class="jj-shop-invoice"><p><strong>🧾 Facture ${escapeHTML(r.quoteInvoiceNumber)}</strong> · ${escapeHTML(r.quoteInvoiceStatus==='paid'?'PAYÉE':'Brouillon / à confirmer')}</p>${(r.quoteLines||[]).map(l=>`<div class="jj-shop-invoice-row"><span>${escapeHTML(l.name||'Article')} × ${Number(l.qty)||1}</span><strong>${cad((Number(l.qty)||1)*(Number(l.price)||0))}</strong></div>`).join('')}${Number(r.quoteDiscount)>0?`<div class="jj-shop-invoice-row"><span>Rabais</span><strong>−${cad(Number(r.quoteDiscount))}</strong></div>`:''}${Number(r.quoteShipping)>0?`<div class="jj-shop-invoice-row"><span>Livraison</span><strong>${cad(Number(r.quoteShipping))}</strong></div>`:''}${Number(r.quoteTax)>0?`<div class="jj-shop-invoice-row"><span>Taxes sur facture</span><strong>${cad(Number(r.quoteTax))}</strong></div>`:''}<div class="jj-shop-invoice-row jj-shop-invoice-total"><strong>Total de la facture</strong><strong>${cad(Number(r.quoteTotal)||0)}</strong></div><button type="button" class="jj-boutique-open-invoice" data-show-quote="${escapeHTML(r.id)}">🧾 Ouvrir la facture</button><small>Aperçu de la facture liée, non une demande de paiement supplémentaire.</small></div>`:''}${['awaiting_payment','payment_reported','paid'].includes(r.status)?`${r.quotePreviewUrl&&/^https:\/\//.test(r.quotePreviewUrl)?`<p><a href="${escapeHTML(r.quotePreviewUrl)}" target="_blank" rel="noopener noreferrer">Voir l’aperçu du modèle pour confirmation</a></p>`:''}`:''}${r.status==='awaiting_payment'?`<form data-report-payment="${escapeHTML(r.id)}"><label>Montant reçu à la Boutique ($)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="Ex. 48.24"></label><label>Méthode de paiement<select name="method"><option>Espèces</option><option>Virement Interac</option><option>Carte</option><option>Autre</option></select></label><label>Date du paiement<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><button type="submit">💳 Signaler le paiement à JJ3D</button><p class="send-status" role="status"></p></form>`:''}${r.status!=='paid'?`<button type="button" class="jj-request-delete" data-delete-custom="${escapeHTML(r.id)}">🗑 Supprimer la demande</button>`:'<p class="sub">Paiement validé : historique conservé</p>'}</article>`).join(''):'<p class="sub">Aucune demande enregistrée pour ce compte.</p>';}
// Printable client-facing invoice built from explicitly shared quote fields only.
function jjOpenSharedInvoice(r){
 const lines=(r.quoteLines||[]).slice(0,8),fmt=n=>cad(Number(n)||0);
 const esc=escapeHTML;
 const rows=lines.map(l=>`<tr><td>${esc(l.name||'Article')}</td><td>${Number(l.qty)||1}</td><td>${fmt(l.price)}</td><td>${fmt((Number(l.qty)||1)*(Number(l.price)||0))}</td></tr>`).join('');
 const w=window.open('','_blank');if(!w){jjShopNotify('Autorise les fenêtres pour ouvrir la facture.');return;}
 w.document.open();w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facture ${esc(r.quoteInvoiceNumber||'JJ3D')}</title><style>body{font:15px Arial;color:#172038;max-width:820px;margin:20px auto;padding:20px}h1{color:#7044ac}table{width:100%;border-collapse:collapse;margin:25px 0}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}.total{font-size:1.45rem;text-align:right;font-weight:700}.muted{color:#657087}.print{background:#744fe5;color:white;border:0;padding:12px 22px;border-radius:8px}@media print{.print{display:none}body{margin:0;padding:0}}</style></head><body><button class="print" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button><h1>JJ3D</h1><h2>FACTURE — APERÇU BOUTIQUE</h2><p><b>Numéro :</b> ${esc(r.quoteInvoiceNumber||'—')}<br><b>Client :</b> ${esc(r.customer||'Client')}<br><b>État :</b> ${esc(r.status==='paid'?'PAYÉE':r.quoteInvoiceStatus==='paid'?'PAYÉE':'À confirmer / non payée')}</p><table><thead><tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>${Number(r.quoteDiscount)>0?`<p>Rabais : −${fmt(r.quoteDiscount)}</p>`:''}${Number(r.quoteShipping)>0?`<p>Livraison : ${fmt(r.quoteShipping)}</p>`:''}${Number(r.quoteTax)>0?`<p>Taxes sur facture : ${fmt(r.quoteTax)}</p>`:''}<p class="total">Total : ${fmt(r.quoteTotal)}</p><p class="muted">Aperçu partagé pour le suivi Boutique. Pour le PDF officiel de JJ3D, consulte la facture dans l’espace administrateur.</p></body></html>`);w.document.close();
}
document.getElementById('boutique-custom-request-list')?.addEventListener('click',async e=>{
 const show=e.target.closest('[data-show-quote]');if(show){const r=customSent.find(x=>x.id===show.dataset.showQuote);if(r)jjOpenSharedInvoice(r);return;}
 const btn=e.target.closest('[data-delete-custom]');if(!btn||!current)return;
 const r=customSent.find(x=>x.id===btn.dataset.deleteCustom);if(!r)return;
 if(r.status==='paid'){jjShopNotify('Une commande payée doit rester dans l’historique.');return;}
 if(!confirm(`Supprimer définitivement la demande « ${r.item||'Projet'} » ? Elle disparaîtra également de l’atelier JJ3D. Les éventuelles factures sont conservées.`))return;
 btn.disabled=true;
 try{await api.deleteDoc(api.doc(db,'boutiques',owner,'customRequests',r.id));jjShopNotify('✓ Demande supprimée des deux côtés.');}
 catch(err){jjShopNotify('Suppression impossible : '+(err.code||err.message));btn.disabled=false;}
});
$('jj-shop-enable-notifications')?.addEventListener('click',async()=>{
 if(!('Notification' in window)){jjShopNotify('Notifications non prises en charge ici.');return;}
 try{const result=await Notification.requestPermission();jjShopNotify(result==='granted'?'✓ Alertes du navigateur activées lorsque JJ3D est ouvert.':'Notifications non autorisées.');}catch(err){jjShopNotify('Autorisation impossible : '+err.message);}
});
$('boutique-custom-request-list')?.addEventListener('submit',async e=>{const f=e.target.closest('[data-report-payment]');if(!f)return;e.preventDefault();const r=customSent.find(x=>x.id===f.dataset.reportPayment);const status=f.querySelector('.send-status');if(!r||r.status!=='awaiting_payment'){status.textContent='Demande non prête au paiement.';return;}const amount=Number(f.elements.amount.value),method=f.elements.method.value,date=f.elements.date.value;if(!(amount>0)||!date){status.textContent='Indique le montant et la date.';return;}if(!confirm('Confirmer que la Boutique a encaissé '+cad(amount)+' pour '+r.customer+' ? JJ3D devra vérifier le paiement avant de lancer la production.'))return;const button=f.querySelector('[type=submit]');button.disabled=true;try{await api.updateDoc(api.doc(db,'boutiques',owner,'customRequests',r.id),{status:'payment_reported',paymentAmount:amount,paymentMethod:method,paymentDate:date,paymentReportedAt:api.serverTimestamp()});status.textContent='✓ Paiement transmis pour vérification.';}catch(err){status.textContent='Envoi impossible : '+(err.code||err.message);button.disabled=false;}});
document.addEventListener('click',e=>{const btn=e.target.closest('[data-jj-date-picker]');if(!btn)return;const input=btn.parentElement?.querySelector('input[type=date]');if(!input)return;try{if(typeof input.showPicker==='function'){input.showPicker();}else{input.focus();input.click();}}catch(_){input.focus();}});
$('custom-request-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,el=$('custom-request-status'),button=f.querySelector('[type=submit]');if(!current||!owner){el.textContent='Connexion Boutique requise.';return;}button.disabled=true;el.classList.remove('error');el.textContent='Envoi en cours…';try{
 const qty=Number(f.elements.quantity.value);if(!Number.isInteger(qty)||qty<1||qty>300)throw Error('Quantité invalide.');
 const photo=await boutiquePhoto(f.elements.photo.files[0]);await api.addDoc(api.collection(db,'boutiques',owner,'customRequests'),{customer:f.elements.customer.value.trim().slice(0,120),phone:f.elements.phone.value.trim().slice(0,30),email:f.elements.email.value.trim().slice(0,254),item:f.elements.namedItem('item').value.trim().slice(0,160),quantity:qty,colors:f.elements.colors.value.trim().slice(0,160),dueAt:f.elements.dueAt.value,note:f.elements.notes.value.trim().slice(0,1000),photo,senderUid:current.uid,senderEmail:String(current.email||''),status:'pending',createdAt:api.serverTimestamp()});f.reset();el.textContent='✓ Demande envoyée! Suis son avancement dans « Commandes spéciales ».';setBoutiqueTab('special');
 }catch(err){el.classList.add('error');el.textContent='Demande non envoyée : '+(err.code||err.message)+'. Vérifie les champs et réessaie.';console.error('JJ3D Boutique demande personnalisée',err);}finally{button.disabled=false;}});
function updateBoutiqueAlerts(){const notices=[];const ready=planning.filter(p=>p.status==='done'&&p.kind==='boutique').length;const incoming=deliveries.filter(d=>d.status==='sent'||d.status==='in_transit').length;const receiptPending=receipts.filter(r=>r.status==='pending').length;
 if(ready)notices.push('🖨 '+ready+' impression(s) terminée(s) à consulter dans À venir');
 if(incoming)notices.push('📦 '+incoming+' livraison(s) de stock à recevoir');
 if(receiptPending)notices.push('📋 '+receiptPending+' réception(s) envoyée(s), en attente de validation');
 const el=$('jj-boutique-alerts');if(!el)return;el.hidden=!notices.length;el.textContent=notices.join(' · ');
}
const etaDate=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'}):null;
const planningDates=x=>x.estimatedEnd?`🕒 Début estimé : ${etaDate(x.estimatedStart)} · Fin estimée : ${etaDate(x.estimatedEnd)}`:'Durée / heure estimée à préciser';
const planningStates={todo:'En attente',doing:'En impression',paused:'En pause',done:'Terminé',failed:'Échec'};
function displayPlanningPhoto(id,src){
 const slots=[...document.querySelectorAll('[data-planning-photo]')].filter(el=>el.dataset.planningPhoto===id);
 for(const el of slots){const im=document.createElement('img');im.src=src;im.alt='Capture du projet';el.replaceChildren(im);}
 if(selectedPlanningId===id&&$('planning-dialog').open){const target=$('planning-detail-photo');const im=document.createElement('img');im.src=src;im.alt='Capture du projet en grand';target.replaceChildren(im);}
}
async function fetchPlanningPhoto(id){
 if(planningImages.has(id))return planningImages.get(id);
 const snap=await api.getDoc(api.doc(db,'boutiques',owner,'planningPhotos',id));
 const src=snap.data()?.image;
 if(typeof src==='string'&&src.startsWith('data:image/jpeg;base64,')){planningImages.set(id,src);displayPlanningPhoto(id,src);return src;}
 return null;
}
function renderPlanning(){
 const section=boutiqueTab==='special'?'special':'planning';const target=$(section==='special'?'special-planning-cards':'planning-cards');const visible=planning.filter(x=>section==='special'?x.kind==='custom':x.kind==='boutique');$(section==='special'?'special-planning-empty':'planning-empty').hidden=visible.length>0;
 // Même carte et mêmes classes que le catalogue, avec les informations de planification.
 target.innerHTML=visible.map(x=>`<article class="product"><button type="button" class="product-open" data-open-planning="${escapeHTML(x.id)}" aria-label="Voir ${escapeHTML(x.name)} en détail"><div class="photo" data-planning-photo="${escapeHTML(x.id)}">${x.hasPhoto?'Chargement de la photo…':'▧'}</div><div class="details"><h3>${escapeHTML(x.name)}</h3><p class="sub planning-card-status">${escapeHTML(planningStates[x.status]||'En attente')}</p><p class="sub">${Number(x.quantity)||1} unité(s)</p><p class="sub jj-planning-dates">${escapeHTML(planningDates(x))}</p></div></button></article>`).join('');
 for(const x of visible.filter(x=>x.hasPhoto)){
  if(planningImages.has(x.id)){displayPlanningPhoto(x.id,planningImages.get(x.id));continue;}
  fetchPlanningPhoto(x.id).then(src=>{if(!src){const el=[...target.querySelectorAll('[data-planning-photo]')].find(e=>e.dataset.planningPhoto===x.id);if(el)el.textContent='🖨';}}).catch(()=>{const el=[...target.querySelectorAll('[data-planning-photo]')].find(e=>e.dataset.planningPhoto===x.id);if(el)el.textContent='🖨';});
 }
}
async function openPlanning(id){
 const x=planning.find(item=>item.id===id);if(!x)return;
 selectedPlanningId=id;
 $('planning-detail-name').textContent=x.name||'Projet';
 $('planning-detail-status').textContent=planningStates[x.status]||'En attente';
 $('planning-detail-qty').textContent=(Number(x.quantity)||1)+' unité(s) prévues';
 $('planning-detail-note').textContent=(x.note||'Aucune précision ajoutée.')+' · '+planningDates(x)+' · Imprimante : '+(x.printer||'À préciser');
 const photo=$('planning-detail-photo');photo.replaceChildren();
 if(planningImages.has(id)){const im=document.createElement('img');im.src=planningImages.get(id);im.alt='Capture du projet en grand';photo.replaceChildren(im);}
 else{photo.textContent=x.hasPhoto?'Chargement de la capture…':'Aucune photo disponible';}
 $('planning-dialog').showModal();
 if(x.hasPhoto&&!planningImages.has(id)){
  try{const src=await fetchPlanningPhoto(id);if(!src&&selectedPlanningId===id&&$('planning-dialog').open)photo.textContent='Aucune photo disponible';}
  catch(e){if(selectedPlanningId===id&&$('planning-dialog').open)photo.textContent='Photo indisponible';}
 }
}
for(const gridId of ['planning-cards','special-planning-cards'])$(gridId).addEventListener('click',e=>{const button=e.target.closest('[data-open-planning]');if(button)openPlanning(button.dataset.openPlanning);});
$('planning-detail-close').addEventListener('click',()=>$('planning-dialog').close());
$('planning-dialog').addEventListener('close',()=>{selectedPlanningId=null;});
function loadPlanning(){if(detachPlanning)detachPlanning();detachPlanning=api.onSnapshot(api.doc(db,'boutiques',owner,'planning','current'),snap=>{planning=snap.exists()&&Array.isArray(snap.data().items)?snap.data().items:[];if(boutiqueTab==='planning'||boutiqueTab==='special')renderPlanning();updateBoutiqueAlerts();},e=>{if(boutiqueTab==='planning'||boutiqueTab==='special')$(boutiqueTab==='special'?'special-planning-empty':'planning-empty').textContent='Suivi indisponible : '+(e.code||e.message);});}

let detachDeliveries=null,detachReceipts=null;
function renderDeliveries(){
 const box=$('deliveries-list');if(!box)return;
 const visible=deliveries.slice().reverse();const stock=new Map();
 for(const d of deliveries.filter(x=>x.status==='received'))for(const line of d.lines||[]){const key=String(line.shopId||line.id);stock.set(key,(stock.get(key)||0)+Number(d.receivedQuantities?.[key]??line.qty??0));}
 box.innerHTML=`<p class="sub">Les quantités ci-dessous représentent les réceptions enregistrées dans les bons JJ3D, <b>sans déduction des ventes ou ajustements manuels</b>. Elles ne remplacent pas le comptage réel en boutique.</p><div class="jj-delivery-summary"><strong>${deliveries.filter(x=>x.status==='sent').length} livraison(s) en route</strong><span>${visible.length} bon(s) dans l’historique</span></div><h3>Quantités reçues par produit (historique)</h3>${stock.size?`<div class="jj-delivery-table"><table><thead><tr><th># stock</th><th>Quantité cumulée reçue</th></tr></thead><tbody>${[...stock].map(([id,qty])=>`<tr><td>${escapeHTML(id)}</td><td>${qty}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucune réception enregistrée.</p>'}
 <h3>Bons d’envoi</h3>${visible.length?visible.map(d=>`<article class="jj-delivery-card"><div><strong>${escapeHTML(d.number||'Bon d’envoi')}</strong> <span>${escapeHTML(({draft:'Préparé',sent:'Envoyé',received:'Reçu',cancelled:'Annulé'})[d.status]||'Préparé')}</span></div><small>${escapeHTML(d.date||'')} · ${escapeHTML(d.destination||'Boutique')}</small><div class="jj-delivery-table"><table><thead><tr><th>#</th><th>Produit</th><th>Envoyé</th><th>Reçu</th></tr></thead><tbody>${(d.lines||[]).map(l=>{const key=String(l.shopId||l.id);return `<tr><td>${escapeHTML(l.shopId||'—')}</td><td>${escapeHTML(l.name)}</td><td>${Number(l.qty)||0}</td><td>${d.status==='received'?Number(d.receivedQuantities?.[key]??l.qty)||0:'—'}</td></tr>`;}).join('')}</tbody></table></div>
 ${d.status==='sent'?`<button type="button" class="jj-delivery-confirm" data-delivery-confirm="${escapeHTML(d.id)}" ${receipts.some(r=>r.slipId===d.id)?'disabled':''}>${receipts.some(r=>r.slipId===d.id)?'Réception transmise — en attente de validation':'✓ Confirmer les quantités reçues'}</button>`:''}</article>`).join(''):'<p>Aucun bon publié pour le moment.</p>'}`;
}
function loadDeliveries(){if(detachDeliveries)detachDeliveries();if(detachReceipts)detachReceipts();detachDeliveries=api.onSnapshot(api.doc(db,'boutiques',owner,'deliveries','current'),snap=>{deliveries=snap.exists()&&Array.isArray(snap.data()?.items)?snap.data().items:[];if(boutiqueTab==='deliveries')renderDeliveries();updateBoutiqueAlerts();updateBoutiqueAlerts();},err=>{if(boutiqueTab==='deliveries')$('deliveries-list').textContent='Livraisons indisponibles : '+(err.code||err.message);});
 // Les rapports d’autres membres restent privés.

}
$('deliveries-list').addEventListener('click',e=>{const b=e.target.closest('[data-delivery-confirm]');if(!b)return;const d=deliveries.find(x=>x.id===b.dataset.deliveryConfirm);if(!d||d.status!=='sent')return;
 const dialog=document.createElement('dialog');dialog.className='jj-delivery-dialog';dialog.innerHTML=`<form><h2>Confirmer la réception — ${escapeHTML(d.number)}</h2><p>Indique la quantité réellement reçue. JJ3D transmettra ton rapport à l’administrateur pour validation du stock.</p>${(d.lines||[]).map((l,i)=>`<label>${escapeHTML(l.name)} — ${Number(l.qty)||0} envoyé(s)<input type="number" data-index="${i}" min="0" max="${Number(l.qty)||0}" step="1" value="${Number(l.qty)||0}" required></label>`).join('')}<label>Note (facultative)<textarea name="note" maxlength="300" placeholder="Ex. un article endommagé"></textarea></label><button type="submit">Transmettre la réception</button> <button type="button" id="jj-delivery-cancel">Annuler</button></form>`;document.body.append(dialog);dialog.showModal();dialog.querySelector('#jj-delivery-cancel').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const values=[...dialog.querySelectorAll('[data-index]')].map(n=>Number(n.value));if(values.some((v,i)=>!Number.isInteger(v)||v<0||v>Number(d.lines[i].qty)))return;
 const quantities={};d.lines.forEach((l,i)=>{const key=String(l.shopId||l.id);quantities[key]=(quantities[key]||0)+values[i];});
 const button=dialog.querySelector('[type=submit]');button.disabled=true;try{await api.setDoc(api.doc(db,'boutiques',owner,'deliveryReceipts',d.id),{slipId:d.id,number:String(d.number||''),quantities,note:String(dialog.querySelector('[name=note]').value||'').trim(),senderUid:current.uid,senderEmail:String(current.email||''),status:'pending',createdAt:api.serverTimestamp()});receipts.push({slipId:d.id,status:'pending'});dialog.close();renderDeliveries();updateBoutiqueAlerts();msg('✓ Réception envoyée à JJ3D. En attente de validation administrateur.',true);}catch(err){msg('Erreur : '+(err.code||err.message));button.disabled=false;}};
});
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
$('only-new').addEventListener('click',()=>{onlyNew=!onlyNew;$('only-new').classList.toggle('selected',onlyNew);$('only-new').setAttribute('aria-pressed',String(onlyNew));render();});
$('search').addEventListener('input',render);$('category').addEventListener('change',render);$('availability').addEventListener('change',render);
try{
 const cfg=window.PRINTPILOT_FIREBASE_CONFIG;
 if(!cfg?.apiKey)throw Error('Configuration Firebase absente.');
 const v='13.1.0';
 const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,onSnapshot,addDoc,collection,setDoc,serverTimestamp,updateDoc,deleteDoc,query,where}]=await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
  import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);
 const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);api={doc,getDoc,onSnapshot,addDoc,collection,setDoc,serverTimestamp,updateDoc,deleteDoc,query,where};
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button[type=submit]');b.disabled=true;msg('Connexion en cours…');try{await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(e){msg('Connexion impossible : '+(e.code||e.message));}finally{b.disabled=false;}});
 $('logout').addEventListener('click',()=>signOut(auth));
 onAuthStateChanged(auth,async u=>{resetUI();current=u;msg('');if(!u)return;try{await getCatalogue(u);detachCustomSent=api.onSnapshot(api.query(api.collection(db,'boutiques',owner,'customRequests'),api.where('senderUid','==',u.uid)),snap=>{customSent=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt?.seconds||'').localeCompare(String(a.createdAt?.seconds||'')));renderSentRequests();jjShopRequestChanges(customSent);},err=>{const node=$('boutique-custom-request-list');if(node)node.textContent='Suivi indisponible : '+(err.code||err.message);});}catch(e){msg(e.message||String(e));$('who').textContent=u.email||'';$('logout').hidden=false;}});
}catch(e){msg('Erreur de configuration : '+e.message);console.error(e);}
