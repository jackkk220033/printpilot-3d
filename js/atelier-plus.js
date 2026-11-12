// PrintPilot 3D v4.9.1 — Atelier +. Private management, independent of commercial stock.
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cad=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const number=n=>new Intl.NumberFormat('fr-CA',{maximumFractionDigits:1}).format(Number(n)||0);
const day=()=>new Date().toISOString().slice(0,10);
let user=null,db=null,api=null,manage={stock:{},queue:[],maintenance:[],ledger:[],updatedAt:''}, workshop={products:[],rolls:[],prints:[],sales:[]},requests=[],orders=[],customRequests=[],queuePhotoCache=new Map(),tab=(new URLSearchParams(location.search).get('tab')||'boutique');
const embedded=new URLSearchParams(location.search).get('embedded')==='1';
if(embedded){document.documentElement.classList.add('pp-embedded');document.body.classList.remove('pp-standalone');document.body.classList.add('pp-embedded');}
function broadcastHeight(){if(!embedded)return;const height=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,document.querySelector('.wrap')?.scrollHeight||0);parent.postMessage({source:'printpilot-atelier',type:'height',height},location.origin);}
if(embedded){addEventListener('load',broadcastHeight);new ResizeObserver(broadcastHeight).observe(document.querySelector('.wrap'));addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.source!=='printpilot-main'||e.data?.type!=='setTab')return;const next=e.data.tab;if(['boutique','demandes','queue','filament','labels','stats','maintenance','reports'].includes(next)){tab=next;render();broadcastHeight();}});}

let stopManage=null,stopWorkshop=null,stopRequests=null,stopOrders=null,writing=false;
// One live source of truth for both portals. Ignore initial snapshot as a notification event.
let jjAdminSeen=null;
const jjAdminStateLabels={pending:'Nouvelle demande',reviewed:'En évaluation',awaiting_payment:'Paiement attendu',payment_reported:'Paiement à vérifier',paid:'Paiement vérifié',rejected:'Refusée',accepted:'Acceptée'};
function jjAdminRequestChanges(next){
 const fresh=new Map(next.map(x=>[x.id,x.status]));
 if(jjAdminSeen){
  const changed=next.filter(x=>jjAdminSeen.has(x.id)&&jjAdminSeen.get(x.id)!==x.status);
  const created=next.filter(x=>!jjAdminSeen.has(x.id));
  if(created.length||changed.length){
   const message=created.length?`🔔 ${created.length} nouvelle(s) demande(s) personnalisée(s) Boutique`:`🔔 ${changed.length} demande(s) Boutique mise(s) à jour : ${jjAdminStateLabels[changed[0].status]||changed[0].status}`;
   jjAdminBanner(message);
  }
 }
 jjAdminSeen=fresh;
 jjAdminRefreshBadge(next);
}
function jjAdminRefreshBadge(list){
 const count=list.filter(x=>x.status==='pending'||x.status==='payment_reported').length;
 document.querySelectorAll('[data-jj-custom-request-count]').forEach(el=>{el.textContent=count?`🔔 ${count} à traiter`:'✓ Aucune demande urgente';});
 if(embedded)parent.postMessage({source:'printpilot-atelier',type:'custom-requests-badge',count},location.origin);
}
function jjAdminBanner(message){
 let el=document.getElementById('jj-admin-live-alert');if(!el){el=document.createElement('div');el.id='jj-admin-live-alert';el.setAttribute('role','status');el.style.cssText='margin:8px 0;padding:12px 14px;background:#2a2448;border:1px solid #8f6df8;color:#f8edff;border-radius:12px;font-weight:600';document.getElementById('notice')?.after(el)}
 el.textContent=message;
 // Browser notifications while the app is running: no unsolicited permission prompts.
 if(document.hidden&&window.Notification?.permission==='granted')try{new Notification('JJ3D — Demandes Boutique',{body:message,icon:'icons/icon-192.png'})}catch(_){}
}

let pendingNewQueuePhoto=null;
const notice=(s,bad=false)=>{$('notice').textContent=s;$('notice').style.color=bad?'#ffb5b5':'#9debc0';};
const products=()=>Array.isArray(workshop.products)?workshop.products:[];
const currentProducts=()=>products().filter(p=>p && p.id && !p.hiddenOffProduction && !p.commercialHidden && !p.hiddenFromCatalog);
const productOptions=(selected='')=>currentProducts().map(p=>`<option value="${esc(p.id)}" ${String(p.id)===selected?'selected':''}>${esc(p.name)} · ${esc(p.colors||'')} #${esc(p.shopId||p.id)}</option>`).join('');
const productMap=()=>new Map(products().map(p=>[p.id,p]));
const getStock=id=>Math.max(0,Number(manage.stock?.[id]||0));
const retailStock=p=>Math.max(0,Number(p.stock||0));
const panel=(title,body)=>`<section class="panel"><h2>${title}</h2>${body}</section>`;
const tiles=a=>`<div class="tilegrid">${a.map(([t,v,d])=>`<div class="tile"><span class="muted">${esc(t)}</span><strong>${esc(v)}</strong><small>${esc(d||'')}</small></div>`).join('')}</div>`;
function render(){if(!user)return;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));const view=$('view');view.innerHTML=({boutique:renderBoutique,demandes:renderRequests,queue:renderQueue,filament:renderForecast,labels:renderLabels,stats:renderStats,maintenance:renderMaintenance,reports:renderReports}[tab])(); if(tab==='labels')setTimeout(createQrs,0);if(tab==='queue')setTimeout(hydrateQueuePhotos,10);}
function renderBoutique(){const rows=currentProducts().filter(p=>retailStock(p)>0||getStock(p.id)>0);const assigned=rows.reduce((s,p)=>s+getStock(p.id),0);
return tiles([['Unités chez la boutique',assigned,'Suivi séparé'],['Variantes en consignation',rows.filter(p=>getStock(p.id)>0).length,'Avec au moins 1 unité'],['Valeur à vendre chez elle',cad(rows.reduce((s,p)=>s+getStock(p.id)*Number(p.price||0),0)),'Prix publics']])+
panel('Stock en consignation',`<p>Entre la <b>quantité réellement chez elle</b> pour chaque produit. Cela ne retire pas automatiquement des unités de l'inventaire principal : compare toujours ton stock avant de confirmer un transfert.</p><div class="toolbar"><label>Produit<select id="cons-product">${productOptions()}</select></label><label>Quantité chez elle (valeur totale)<input id="cons-qty" type="number" min="0" max="100000" step="1" value="0"></label><button data-action="set-consignment">Enregistrer le stock Boutique</button></div><div class="tablewrap"><table class="data-table"><thead><tr><th>Produit</th><th>Chez toi (JJ3D)</th><th>Chez elle</th><th>Valeur chez elle</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.name)}<small class="muted"> #${esc(p.shopId||'—')}</small></td><td>${retailStock(p)}</td><td>${getStock(p.id)}</td><td>${cad(getStock(p.id)*Number(p.price||0))}</td></tr>`).join('')}</tbody></table></div>`);
}
function renderRequests(){return tiles([['Demandes en attente',requests.filter(r=>r.status==='pending').length,'Ventes + réapprovisionnements'],['Ventes à approuver',requests.filter(r=>r.status==='pending'&&r.kind==='sale').length,'Vérifie avec le commerce']])+
panel('Déclarations et réapprovisionnements',`<p>Les demandes arrivent automatiquement du portail. <b>Accepter une vente</b> réduit uniquement le suivi des unités chez la boutique et ajoute une vente au rapport de consignation; l'inventaire principal n'est pas modifié.</p>${requests.map(r=>`<article class="item"><div><strong>${r.kind==='sale'?'🛒 Vente':'📦 Réapprovisionnement'} — ${esc(r.productName)}</strong> <span class="status">${esc(r.status)}</span></div><p>Quantité : <b>${Number(r.quantity)||0}</b> · Prix lors de la demande : ${cad(r.unitPrice)} · ${esc(r.senderEmail||'')}</p>${r.note?`<p>${esc(r.note)}</p>`:''}<p class="muted">${r.createdAt?.toDate?.()?.toLocaleString('fr-CA')||'En attente de date'}</p><div class="action">${r.status==='pending'?`<button data-action="accept-request" data-id="${esc(r.id)}">✓ Accepter</button><button data-action="reject-request" data-id="${esc(r.id)}">Refuser</button>`:''}<button type="button" class="danger-action" data-action="delete-request" data-id="${esc(r.id)}">🗑 Supprimer</button></div></article>`).join('')||'<p>Aucune demande pour le moment.</p>'}`)+renderOrders()+renderCustomRequests();}
function renderOrders(){const state={pending:'À confirmer',accepted:'Acceptée',rejected:'Refusée'};return panel('🛒 Commandes reçues de la boutique',`<p>Une commande est une demande de fabrication. <b>Elle ne déduit aucun stock et ne crée aucune vente.</b> Tu peux accepter et ajouter ses articles à la file d'impression.</p>${orders.length?orders.map(o=>`<article class="item"><div><strong>Commande de ${esc(o.senderEmail||'la boutique')}</strong> <span class="status">${state[o.status]||esc(o.status)}</span></div><p class="muted">${o.createdAt?.toDate?.()?.toLocaleString('fr-CA')||'Date en attente'}</p><ul>${(o.items||[]).map(i=>`<li>${esc(i.productName)} — ${esc(i.colors||'')} × ${Number(i.quantity)||1}</li>`).join('')}</ul>${o.note?`<p>${esc(o.note)}</p>`:''}<div class="action">${o.status==='pending'?`<button data-action="accept-order" data-id="${esc(o.id)}">✓ Accepter et planifier</button><button data-action="reject-order" data-id="${esc(o.id)}">Refuser</button>`:''}<button class="danger-action" data-action="delete-order" data-id="${esc(o.id)}">🗑 Supprimer</button></div></article>`).join(''):'<p>Aucune commande reçue pour le moment.</p>'}`);}
function renderCustomRequests(){const labels={pending:'Nouvelle demande',reviewed:'En évaluation',awaiting_payment:'Paiement attendu',payment_reported:'Paiement déclaré — À VÉRIFIER',paid:'Paiement vérifié',rejected:'Refusée',accepted:'Acceptée (ancienne version)'};return panel('✨ Demandes personnalisées reçues',`<p data-jj-custom-request-count aria-live="polite">✓ Aucune demande urgente</p><p><button type="button" data-action="enable-jj-alerts">🔔 Activer les alertes navigateur (application ouverte)</button></p><p>Processus : importer dans JJ3D → vérifier le fichier et le prix → obtenir la confirmation du client → facture → paiement encaissé par la Boutique → vérification → production. Les données du client restent privées.</p>${customRequests.map(o=>`<article class="item jj-boutique-admin-request"><div class="jj-request-top"><strong>${esc(o.item)}</strong> × ${Number(o.quantity)||1} <span class="status">${esc(labels[o.status]||o.status)}</span></div><div class="jj-request-meta"><span>👤 ${esc(o.customer||'Client')}</span><span>📞 ${esc(o.phone||'Téléphone à préciser')}</span><span>✉ ${esc(o.email||'Courriel à préciser')}</span></div><p>Couleur : ${esc(o.colors||'À déterminer')} · Date souhaitée : ${esc(o.dueAt||'À confirmer')} · Boutique : ${esc(o.senderEmail||'')}</p>${o.photo?.startsWith('data:image/jpeg;base64,')?`<img src="${esc(o.photo)}" alt="Référence client" style="max-width:240px;max-height:180px;object-fit:contain;border-radius:10px">`:''}<p class="jj-request-note">${esc(o.note||'Aucune précision')}</p>${o.status==='payment_reported'?`<p class="jj-payment-alert"><b>💳 Paiement déclaré :</b> ${cad(o.paymentAmount)} · ${esc(o.paymentMethod||'')} · ${esc(o.paymentDate||'')}. Confirme le versement avec la Boutique avant de valider.</p>`:''}<div class="action">${o.status==='pending'?`<button data-action="import-custom" data-id="${esc(o.id)}">📋 Importer dans Commandes personnalisées</button><button data-action="reject-custom" data-id="${esc(o.id)}">Refuser</button>`:''}${o.status==='reviewed'?`<button data-action="quote-custom" data-id="${esc(o.id)}">✓ Client a approuvé — demander paiement</button>`:''}${o.status==='payment_reported'?`<button data-action="verify-custom-payment" data-id="${esc(o.id)}">💳 Vérifier le paiement et autoriser production</button>`:''}${o.status==='paid'?'<span class="status">✓ Paiement vérifié, tâche libérée</span>':''}${o.status!=='paid'?`<button type="button" class="danger-action" data-action="delete-custom" data-id="${esc(o.id)}">🗑 Supprimer des deux côtés</button>`:'<small class="muted">Historique payé conservé</small>'}</div></article>`).join('')||'<p>Aucune demande personnalisée provenant de la Boutique.</p>'}`);}
const hhmm=(stamp)=>{if(!stamp||!Number.isFinite(Date.parse(stamp)))return 'À préciser';return new Date(stamp).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'});};
const printerNames=()=>[...new Set(['Anycubic Kobra X','Ender-3 V2 Neo','Qidi X-Plus 3',...products().map(p=>p.printer).filter(Boolean),...(manage.queue||[]).map(q=>q.printer).filter(Boolean)])];
const printerOptions=(selected='')=>printerNames().map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
const localTimeValue=(date=new Date())=>{const p=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;};
function scheduledQueue(){
 const q=Array.isArray(manage.queue)?manage.queue:[],anchor=Math.max(Date.now(),Date.parse(manage.planStart||'')||0),clock=new Map(),blocked=new Set(),out=new Map();
 // Oldest entered first. Different printers run independently.
 for(const item of [...q].reverse()){
  if(['done','failed'].includes(item.status)){out.set(item.id,{kind:'finished'});continue;}
  const printer=item.printer||'Anycubic Kobra X';const liveElapsed=item.status==='doing'&&Date.parse(item.startedAt||'')?Math.max(0,Date.now()-Date.parse(item.startedAt)):0;const duration=Math.max(0,(Number(item.minutes)||0)-((Number(item.elapsedMs)||0)+liveElapsed)/60000);
  if(blocked.has(printer)){out.set(item.id,{kind:'blocked'});continue;}
  if(item.status==='paused'){blocked.add(printer);out.set(item.id,{kind:'paused'});continue;}
  if(duration<=0){blocked.add(printer);out.set(item.id,{kind:'unknown'});continue;}
  const requested=Date.parse(item.startAt||'')||0;
  const started=Date.parse(item.startedAt||'')||0;
  let start=Math.max(clock.get(printer)||anchor,requested);
  if(item.status==='doing'&&started){start=Math.max(Date.now(),requested);}
  const end=start+duration*60000;clock.set(printer,end);out.set(item.id,{kind:'estimated',start:new Date(start).toISOString(),end:new Date(end).toISOString(),printer,duration});
 }
 return out;
}
const estimateLabel=(item,entry)=>entry?.kind==='estimated'?`🕒 ${hhmm(entry.start)} → ${hhmm(entry.end)} · ${Math.round(entry.duration)} min (${entry.printer})`:entry?.kind==='finished'?'Impression terminée':entry?.kind==='paused'?'En pause : horaire à recalculer':entry?.kind==='blocked'?'Horaire à préciser (tâche précédente non planifiée)':'Durée à préciser';
/* Keep the modal near the selected task in the visible parent viewport.
   Atelier+ is embedded in a tall iframe; native dialog centering otherwise
   uses the entire iframe height, not the visible part of JJ3D. */
function showQueueEditInView(dialog, trigger){
 const embeddedView=embedded&&window.parent!==window;
 if(!embeddedView){ dialog.showModal(); return; }
 try{
  const frame=window.frameElement;
  const host=window.parent;
  if(!frame||!host)throw Error('No hosting frame');
  const frameRect=frame.getBoundingClientRect();
  const height=host.innerHeight;
  const btnRect=trigger?.getBoundingClientRect();
  const buttonTop=frameRect.top+(btnRect?.top??height/3);
  const scrollBefore=host.scrollY;
  // Explicit position before showing, preventing an initial jump to the
  // iframe's (very distant) vertical center.
  dialog.style.position='fixed';
  dialog.style.margin='0';
  dialog.style.left='50%';
  dialog.style.transform='translateX(-50%)';
  dialog.style.maxHeight=Math.max(220,height-28)+'px';
  dialog.style.top=(Math.max(12,Math.min(buttonTop-24,height-230))-frameRect.top)+'px';
  dialog.showModal();
  const actualHeight=Math.min(dialog.getBoundingClientRect().height,height-28);
  const screenTop=Math.max(12,Math.min(buttonTop-24,height-actualHeight-14));
  dialog.style.top=(screenTop-frameRect.top)+'px';
  // Preserve the user's place in the long list on opening and after closing.
  if(Math.abs(host.scrollY-scrollBefore)>2)host.scrollTo({top:scrollBefore,behavior:'instant'});
 }catch(error){
  console.warn('Atelier: fallback for edit dialog position',error);
  if(!dialog.open)dialog.showModal();
 }
}
// JJ3D 4.11.43 : dépôt d'images, collage Ctrl+V et caméra mobile.
function queuePhotoControls(context,id=''){
 return `<div class="jj-queue-photo-entry" tabindex="0" role="group" aria-label="Photo du projet, cliquer ici puis Ctrl+V" data-photo-context="${context}" data-id="${esc(id)}">
  <div class="jj-queue-photo-preview" aria-live="polite">📋 Clique ici puis <b>Ctrl+V</b> pour coller une capture d’écran</div>
  <div class="jj-queue-photo-actions"><label class="photo-button">🖼️ Choisir une photo<input class="queue-photo-file" type="file" accept="image/*" data-photo-context="${context}" data-id="${esc(id)}" hidden></label><label class="photo-button">📸 Prendre une photo<input class="queue-photo-file" type="file" accept="image/*" capture="environment" data-photo-context="${context}" data-id="${esc(id)}" hidden></label></div>
  <small>Sur téléphone, « Prendre une photo » ouvrira la caméra si ton appareil le permet.</small>
 </div>`;
}
function updateQueuePhotoPreview(zone,src){
 if(!zone)return;
 const preview=zone.querySelector('.jj-queue-photo-preview');if(!preview)return;
 const img=document.createElement('img');img.src=src;img.alt='Aperçu de la photo sélectionnée';
 const txt=document.createElement('span');txt.textContent='✓ Photo prête';preview.replaceChildren(img,txt);
}
async function uploadQueuePhoto(id,src){
 if(!manage.queue.some(x=>x.id===id))throw Error('Impression introuvable.');
 await api.setDoc(api.doc(db,'boutiques',user.uid,'planningPhotos',id),{image:src,updatedAt:api.serverTimestamp()});
 queuePhotoCache.set(id,src);
 await saveEdit(d=>{const item=d.queue.find(x=>x.id===id);if(item)item.hasPhoto=true;});
}
async function processQueuePhoto(file,zone,context,id){
 const src=await compressQueuePhoto(file);
 if(context==='new'){
  pendingNewQueuePhoto=src;updateQueuePhotoPreview(zone,src);
  notice('✓ Photo prête : ajoute l’impression pour l’enregistrer.');
 }else{
  await uploadQueuePhoto(id,src);render();notice('✓ Photo enregistrée et visible dans la Boutique.');
  if(context==='edit'){const updated=document.querySelector('#jj-queue-edit .jj-queue-photo-entry');updateQueuePhotoPreview(updated,src);}
 }
}
function editQueueItem(id,trigger){
 const item=(manage.queue||[]).find(x=>x.id===id);if(!item)return;
 let dialog=$('jj-queue-edit');if(!dialog){dialog=document.createElement('dialog');dialog.id='jj-queue-edit';document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
 const duration=Math.max(0,Math.round(Number(item.minutes)||0));
 dialog.innerHTML=`<form id="jj-queue-edit-form" class="jj-queue-edit-form"><div class="jj-queue-edit-top"><h2>Modifier une impression</h2><button type="button" id="jj-edit-close">✕</button></div>
 <label>Nom du projet<input name="name" maxlength="120" required value="${esc(item.name)}"></label><label>Imprimante<select name="printer">${printerOptions(item.printer||'Anycubic Kobra X')}</select></label><label>Quantité<input type="number" name="quantity" min="1" max="500" step="1" value="${Number(item.quantity)||1}" required></label>${item.customOrderId||item.orderId||item.requestId||item.customRequestId?"":`<label>Destination de l’impression<select name="audience"><option value="private" ${item.audience!=="boutique"?"selected":""}>Personnel / atelier (non visible à la Boutique)</option><option value="boutique" ${item.audience==="boutique"?"selected":""}>Pour la Boutique (visible dans À venir)</option></select></label>`}
 <label>Durée totale prévue — heures<input type="number" name="hours" min="0" max="999" placeholder="Ex. 3" value="${duration>0?Math.floor(duration/60):''}"></label><label>Minutes<input type="number" name="mins" min="0" max="59" placeholder="Ex. 25" value="${duration>0&&duration%60?duration%60:''}"></label>
 <label>Date et heure de début souhaitées (facultatif)<input type="datetime-local" name="startAt" value="${esc(item.startAt||'')}"></label><label>Priorité<select name="priority"><option value="normal" ${item.priority!=='urgent'?'selected':''}>Normale</option><option value="urgent" ${item.priority==='urgent'?'selected':''}>Urgente</option></select></label>
 <label class="jj-queue-edit-wide">Note visible par la boutique<input name="note" maxlength="200" value="${esc(item.note||'')}"></label><div class="jj-queue-edit-wide">${queuePhotoControls('edit',id)}</div><div class="jj-queue-edit-wide"><button type="submit">Enregistrer les modifications</button> <button type="button" id="jj-edit-cancel">Annuler</button></div></form>`;
 if(queuePhotoCache.has(id))updateQueuePhotoPreview(dialog.querySelector('.jj-queue-photo-entry'),queuePhotoCache.get(id));
 showQueueEditInView(dialog,trigger);dialog.querySelector('#jj-edit-close').onclick=()=>dialog.close();dialog.querySelector('#jj-edit-cancel').onclick=()=>dialog.close();
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,h=Number(f.elements.hours.value)||0,m=Number(f.elements.mins.value)||0,qty=Number(f.elements.quantity.value);if(!Number.isInteger(qty)||qty<1||qty>500||h<0||h>999||m<0||m>59){notice('Vérifie la durée et la quantité.',true);return;}
 try{await saveEdit(d=>{const it=d.queue.find(x=>x.id===id);if(!it)throw Error('Tâche introuvable');Object.assign(it,{name:f.elements.name.value.trim(),printer:f.elements.printer.value,quantity:qty,minutes:h*60+m,startAt:f.elements.startAt.value,priority:f.elements.priority.value,note:f.elements.note.value,...(f.elements.namedItem("audience")?{audience:f.elements.namedItem("audience").value}:{})});});dialog.close();render();}catch(err){notice(err.message,true);}};
}
function filamentAvailability(productId,quantity){
 const product=productMap().get(productId);if(!product)return {kind:'unknown',text:'Projet libre : indique un produit lié pour calculer le filament.'};
 const materials=Array.isArray(product.materials)?product.materials.filter(m=>m.id):[];
 if(!materials.length)return {kind:'unknown',text:'Aucun grammage renseigné pour ce produit : impossible de vérifier automatiquement.'};
 const needs=new Map();for(const item of materials){needs.set(item.id,(needs.get(item.id)||0)+(Number(item.grams)||0)*quantity);}
 let problems=[];for(const [id,need] of needs){const roll=(workshop.rolls||[]).find(r=>r.id===id);if(!roll){problems.push('Bobine inconnue (« '+id+' »)');continue;}const left=Number(roll.remaining)||0;if(need>left)problems.push(roll.color+' : manque '+Math.ceil(need-left)+' g');}
 return problems.length?{kind:'shortage',text:'⚠ Filament insuffisant : '+problems.join(' · ')}:{kind:'ok',text:'✓ Filament suffisant selon ton inventaire JJ3D ('+[...needs.values()].reduce((a,b)=>a+b,0).toFixed(1)+' g prévus).'};
}
function calendarView(estimates){const planned=(manage.queue||[]).filter(x=>estimates.get(x.id)?.kind==='estimated').map(x=>({...x,eta:estimates.get(x.id)}));
 const days=new Map();for(const it of planned){const key=new Date(it.eta.start).toLocaleDateString('en-CA'),list=days.get(key)||[];list.push(it);days.set(key,list);}
 const entries=[...days.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 return panel('🗓 Calendrier par jour et par imprimante',`<p>Horaire prévisionnel, calculé séparément pour chaque machine. Démarrer ou modifier une impression actualise le calendrier.</p>${entries.map(([date,items])=>`<div class="jj-calendar-day"><h3>${esc(new Date(date+'T12:00:00').toLocaleDateString('fr-CA',{weekday:'long',day:'numeric',month:'long'}))}</h3>${items.sort((a,b)=>a.eta.start.localeCompare(b.eta.start)).map(it=>`<div class="jj-calendar-entry"><strong>${esc(it.printer)}</strong> · ${esc(it.name)} × ${Number(it.quantity)||1}<small>${esc(hhmm(it.eta.start))} → ${esc(hhmm(it.eta.end))}</small></div>`).join('')}</div>`).join('')||'<p class="muted">Aucune impression avec une durée connue à placer dans le calendrier.</p>'}`);
}
function renderQueue(){const queue=Array.isArray(manage.queue)?manage.queue:[];const states={todo:'En attente',doing:'En impression',paused:'En pause',done:'Terminé',failed:'Échec'};const verbs={todo:'↺ En attente',doing:'▶ Démarrer / reprendre',paused:'⏸ Pause',done:'✓ Terminer',failed:'✕ Échec'};const estimates=scheduledQueue();
return tiles([['En attente',queue.filter(x=>x.status==='todo').length],['En impression',queue.filter(x=>x.status==='doing').length],['En pause',queue.filter(x=>x.status==='paused').length],['Terminé',queue.filter(x=>x.status==='done').length]])+calendarView(estimates)+
panel('Planifier un prochain print',`<p>Ajoute une impression libre ici. Les commandes personnalisées créent automatiquement leur propre tâche liée.</p><button type="button" class="jj-queue-add-button" data-action="queue-add">＋ Ajouter une impression</button>`)+`<dialog id="jj-queue-add-dialog" class="jj-queue-edit" aria-label="Ajouter une impression"><form id="queue-form" class="jj-queue-edit-form"><div class="jj-queue-edit-top"><h2>＋ Ajouter une impression</h2><button type="button" data-action="queue-add-close" aria-label="Fermer">✕</button></div><label>Nom du projet<input name="name" maxlength="120" placeholder="Ex. Dragon multicolore" required></label><label>Produit existant (facultatif)<select name="productId"><option value="">Nouveau projet / pas encore au catalogue</option>${productOptions()}</select></label><label>Quantité<input name="quantity" type="number" min="1" max="500" value="1" required></label><label>Destination<select name="audience"><option value="private">Personnel / atelier (non visible à la Boutique)</option><option value="boutique">Pour la Boutique (visible dans À venir)</option></select></label><label>Imprimante<select name="printer">${printerOptions()}</select></label><label>Durée prévue — heures<input name="hours" type="number" min="0" max="999" placeholder="Ex. 3"></label><label>Minutes<input name="mins" type="number" min="0" max="59" placeholder="Ex. 25"></label><label>Date et heure de début souhaitées (facultatif)<input name="startAt" type="datetime-local"></label><label>Priorité<select name="priority"><option value="normal">Normale</option><option value="urgent">Urgente</option></select></label><label>Note visible par la boutique<input name="note" maxlength="200" placeholder="Ex. Prochainement en bleu"></label>${queuePhotoControls('new')}<p id="jj-filament-check" class="jj-filament-check" aria-live="polite">Sélectionne un produit pour vérifier ton filament.</p><div class="jj-queue-edit-wide jj-queue-add-footer"><button type="submit">💾 Ajouter à la file</button><button type="button" data-action="queue-add-close">Annuler</button></div></form></dialog>`+
panel('Suivi des prochaines impressions',queue.map(x=>`<article class="item queue-card"><button type="button" class="queue-picture" data-admin-plan-photo="${esc(x.id)}" data-action="${x.hasPhoto?'queue-zoom':'queue-edit'}" data-id="${esc(x.id)}" aria-label="Agrandir la photo de ${esc(x.name)}" title="Cliquer pour agrandir">${x.hasPhoto?'Chargement…':'📷 Aucune capture'}</button><div class="queue-detail"><strong>${esc(x.name)}</strong> × ${Number(x.quantity)||1} ${x.customOrderId?`<span class="jj-queue-order-ref">📝 Commande ${esc(x.customOrderNumber||'personnalisée')}</span>`:''} <span class="status">${x.cancelledByOrder?'Annulée':states[x.status]||esc(x.status)}</span> ${x.priority==='urgent'?'<span class="warn">URGENT</span>':''}${x.note?`<p class="jj-queue-short-note">${esc(x.note)}</p>`:''}<p class="jj-queue-eta">${esc(estimateLabel(x,estimates.get(x.id)))}</p><div class="action jj-queue-primary-actions"><button data-action="queue-edit" data-id="${esc(x.id)}">✏ Modifier</button>${x.customOrderId?`<button data-action="queue-open-order" data-id="${esc(x.customOrderId)}">📝 Commande</button>`:''}${!['done','failed'].includes(x.status)?`<button data-action="queue-status" data-id="${esc(x.id)}" data-status="${x.status==='doing'?'paused':'doing'}">${x.status==='doing'?'⏸ Pause':'▶ Démarrer / reprendre'}</button>`:''}<details class="jj-queue-more"><summary>Actions ▾</summary><div class="jj-queue-more-actions">${Object.entries(states).filter(([k])=>k!==x.status).map(([k,v])=>`<button data-action="queue-status" data-id="${esc(x.id)}" data-status="${k}">${verbs[k]}</button>`).join('')}<button class="danger-action" data-action="queue-remove" data-id="${esc(x.id)}">Supprimer</button></div></details></div></div></article>`).join('')||'<p>La file est vide.</p>');
}
function openQueueZoom(id){
 const src=queuePhotoCache.get(id);
 if(!src){notice('La photo est encore en chargement, réessaie dans un instant.',true);return;}
 let modal=document.getElementById('jj-queue-photo-zoom');
 if(!modal){
  modal=document.createElement('dialog');modal.id='jj-queue-photo-zoom';modal.className='jj-queue-lightbox';
  modal.innerHTML='<div class="jj-queue-zoom-head"><strong id="jj-queue-zoom-name"></strong><button type="button" class="jj-queue-zoom-close" aria-label="Fermer">✕</button></div><img id="jj-queue-zoom-image" alt="Capture du projet en grand">';
  document.body.appendChild(modal);
  modal.querySelector('.jj-queue-zoom-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
 }
 const project=(manage.queue||[]).find(x=>x.id===id);
 modal.querySelector('#jj-queue-zoom-name').textContent=project?.name||'Capture du projet';
 modal.querySelector('#jj-queue-zoom-image').src=src;
 modal.showModal();
}
$('view').addEventListener('click',event=>{const el=event.target.closest('[data-action="queue-zoom"]');if(el){event.preventDefault();openQueueZoom(el.dataset.id);}});
async function compressQueuePhoto(file){if(!file||!file.type.startsWith('image/'))throw Error('Sélectionne une image.');if(file.size>15*1024*1024)throw Error('Image trop volumineuse.');const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();let result=canvas.toDataURL('image/jpeg',0.64);if(result.length>180000)result=canvas.toDataURL('image/jpeg',0.42);if(result.length>180000)throw Error('La capture est trop volumineuse, recadre-la avant de réessayer.');return result;}
function hydrateQueuePhotos(){document.querySelectorAll('[data-admin-plan-photo]').forEach(el=>{const id=el.dataset.adminPlanPhoto;if(queuePhotoCache.has(id)){const img=document.createElement('img');img.src=queuePhotoCache.get(id);img.alt='Capture du projet';el.replaceChildren(img);}else if(manage.queue.some(x=>x.id===id&&x.hasPhoto)){api.getDoc(api.doc(db,'boutiques',user.uid,'planningPhotos',id)).then(snap=>{const src=snap.data()?.image;if(src?.startsWith('data:image/jpeg;base64,')){queuePhotoCache.set(id,src);if(el.isConnected){const img=document.createElement('img');img.src=src;el.replaceChildren(img);}}}).catch(()=>{});}});}
function fmtMinutes(m){m=Math.max(0,Math.round(Number(m)||0));return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')} h`};
function renderForecast(){const r=Array.isArray(workshop.rolls)?workshop.rolls:[];
return panel('Prévoir les besoins pour une production',`<p>Estimation à partir des grammes par unité inscrits dans tes fiches Produit. Aucun stock n’est déduit lors d’une prévision.</p><form id="forecast-form" class="toolbar"><label>Produit<select name="productId" required>${productOptions()}</select></label><label>Quantité souhaitée<input type="number" name="quantity" min="1" max="1000" value="10" required></label><button>Calculer</button></form><div id="forecast-result"></div>`)+
panel('Bobines bientôt vides',`<div class="tablewrap"><table class="data-table"><thead><tr><th>Bobine</th><th>Reste</th><th>Seuil 200 g</th></tr></thead><tbody>${r.filter(x=>Number(x.remaining)<300).sort((a,b)=>a.remaining-b.remaining).map(x=>`<tr><td>${esc(x.brand)} — ${esc(x.color)}</td><td>${number(x.remaining)} g</td><td class="${x.remaining<200?'warn':''}">${x.remaining<200?'Bas':'À surveiller'}</td></tr>`).join('')}</tbody></table></div>`);
}
function forecast(id,quantity){const p=productMap().get(id);if(!p)return 'Produit introuvable';const rr=new Map((workshop.rolls||[]).map(x=>[x.id,x]));const rows=(p.materials||[]).filter(m=>m.id).map(m=>{const roll=rr.get(m.id),needed=(Number(m.grams)||0)*quantity,remaining=Number(roll?.remaining)||0;return `<tr><td>${esc(roll?roll.brand+' '+roll.color:m.id)}</td><td>${number(needed)} g</td><td>${number(remaining)} g</td><td class="${needed>remaining?'warn':'positive'}">${needed>remaining?'Manque '+number(needed-remaining)+' g':'OK'}</td></tr>`;});const hw=(p.components||[]).map(c=>{const h=(workshop.hardware||[]).find(x=>x.id===c.id);const req=(Number(c.quantity)||0)*quantity;return `<tr><td>${esc(h?.name||c.id)}</td><td>${req} unités</td><td>${Number(h?.remaining)||0}</td><td>${req>(Number(h?.remaining)||0)?'Manque':'OK'}</td></tr>`;});return `<h3>${esc(p.name)} × ${quantity}</h3><div class="tablewrap"><table class="data-table"><tr><th>Matériel</th><th>Besoin</th><th>Disponible</th><th>Statut</th></tr>${rows.join('')}${hw.join('')}</table></div><p>Durée équivalente : ${fmtMinutes((Number(p.timeDays)||0)*24*60*quantity)}</p>`;}
function renderLabels(){return panel('Étiquettes produits avec QR code',`<p class="labels-intro">Crée des étiquettes individuelles prêtes à imprimer. Chaque QR code ouvre la fiche du produit dans le portail Boutique (connexion autorisée requise).</p><div class="toolbar labels-toolbar"><label>Produit<select id="label-product">${productOptions()}</select></label><label>Nombre d’étiquettes<input id="label-count" type="number" min="1" max="60" value="1"></label><button type="button" data-action="labels-generate">Créer les étiquettes</button></div><div id="labels-output" class="label-grid" aria-live="polite"></div><div class="labels-print-actions"><button type="button" data-action="labels-print" id="labels-print-button" hidden>🖨 Imprimer les étiquettes / PDF</button><p class="muted">Format A4 : deux étiquettes par rangée, avec des marges pour la découpe. Le QR code requiert une connexion internet pour être généré.</p></div>`);}
function createQrs(){document.querySelectorAll('[data-qrcode]').forEach(el=>{if(el.hasChildNodes())return;if(typeof QRCode==='function'){new QRCode(el,{text:el.dataset.qrcode,width:112,height:112,correctLevel:QRCode.CorrectLevel.M});}else{el.textContent='QR indisponible — vérifie ta connexion internet';}});}
function renderStats(){const pp=currentProducts(),pr=workshop.prints||[],rr=workshop.rolls||[],sold=workshop.sales||[];const groups={};pp.forEach(p=>{const k=p.category||'Autre';groups[k]=(groups[k]||0)+(Number(p.stock)||0)*Number(p.price||0);});const max=Math.max(1,...Object.values(groups));return tiles([['Produits / variantes',pp.length],['Valeur du stock commercial',cad(pp.reduce((a,p)=>a+retailStock(p)*Number(p.price||0),0))],['Bobines',rr.length],['Grammes restants',number(rr.reduce((a,r)=>a+Number(r.remaining||0),0))+' g']])+
panel('Valeur commerciale par catégorie',Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([name,v])=>`<div class="item"><strong>${esc(name)}</strong> — ${cad(v)}<div style="background:#293750;border-radius:10px;height:12px;margin-top:6px"><div style="background:#9873f4;width:${Math.max(1,Math.round(v/max*100))}%;height:12px;border-radius:10px"></div></div></div>`).join(''))+
panel('Rendement par imprimante',printerNames().map(machine=>{const jobs=(manage.queue||[]).filter(x=>(x.printer||'Anycubic Kobra X')===machine),completed=jobs.filter(x=>x.status==='done'),failed=jobs.filter(x=>x.status==='failed'),hours=completed.reduce((a,x)=>a+(Number(x.elapsedMs)||Number(x.minutes)*60000||0),0)/3600000;return `<div class="item"><b>${esc(machine)}</b> — ${completed.length} terminée(s), ${failed.length} échec(s), ${hours.toFixed(1)} h estimées / consignées</div>`;}).join('')||'<p>Aucune donnée</p>')+
panel('Consommation et temps',`<p>Grammes de filament déjà utilisés (estimation) : <b>${number(rr.reduce((a,r)=>a+Math.max(0,Number(r.initial||0)-Number(r.remaining||0)),0))} g</b></p><p>Sessions d’impression enregistrées : <b>${pr.filter(x=>x.status!=='cancelled').length}</b></p><p>Transactions commerciales déjà présentes : <b>${sold.length}</b></p>`);
}
function renderMaintenance(){const printers=['Anycubic Kobra X','Ender-3 V2 Neo','Qidi X-Plus 3'];return panel('Enregistrer un entretien',`<form id="maintenance-form" class="toolbar"><label>Imprimante<select name="printer">${printers.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label>Type d’entretien<select name="kind"><option>Graissage</option><option>Nettoyage du bed</option><option>Calibration</option><option>Changement de buse</option><option>Autre</option></select></label><label>Date<input name="date" type="date" value="${day()}" required></label><label>Heures compteur (facultatif)<input name="hours" type="number" min="0" step="0.1"></label><label>Notes<input name="note" maxlength="200"></label><button>Enregistrer</button></form>`)+panel('Historique des entretiens',Array.isArray(manage.maintenance)&&manage.maintenance.length?manage.maintenance.map(m=>`<article class="item"><strong>${esc(m.printer)} — ${esc(m.kind)}</strong><p>${esc(m.date)} · ${m.hours?'Compteur : '+number(m.hours)+' h · ':''}${esc(m.note||'')}</p><button data-action="maintenance-remove" data-id="${esc(m.id)}">Supprimer</button></article>`).join(''):'<p>Aucun entretien enregistré pour le moment.</p>');}
function renderReports(){const sales=Array.isArray(manage.ledger)?manage.ledger:[];const total=sales.reduce((a,x)=>a+Number(x.total||0),0),commission=total*.3;const month=new Date().toISOString().slice(0,7);const monthly=sales.filter(x=>String(x.date||'').startsWith(month));return tiles([['Ventes boutique approuvées',sales.length],['Chiffre d’affaires boutique',cad(total)],['Commission boutique 30 %',cad(commission)],['Montant à recevoir 70 %',cad(total-commission)]])+
panel('Rapport des ventes en consignation',`<p>Ventes validées dans Atelier + seulement. Les ventes historiques de la page Finances ne sont pas ajoutées ici pour éviter les doublons.</p><p><strong>Ce mois-ci (${month}) :</strong> ${monthly.length} vente(s), ${cad(monthly.reduce((a,x)=>a+Number(x.total||0),0))} brut.</p><button data-action="export-sales">Exporter CSV</button><div class="tablewrap"><table class="data-table"><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Brut</th><th>Commission 30 %</th><th>Net</th></tr>${sales.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.productName)}</td><td>${x.quantity}</td><td>${cad(x.total)}</td><td>${cad(Number(x.total)*.3)}</td><td>${cad(Number(x.total)*.7)}</td></tr>`).join('')}</table></div>`);
}
async function saveEdit(mutator){if(!user||writing)throw Error('Connexion ou enregistrement en cours');writing=true;try{const ref=api.doc(db,'boutiques',user.uid,'management','current');await api.runTransaction(db,async transaction=>{const snap=await transaction.get(ref);const original=snap.exists()?snap.data():{};const data={stock:{...(original.stock||{})},queue:[...(original.queue||[])],maintenance:[...(original.maintenance||[])],ledger:[...(original.ledger||[])],planStart:original.planStart||new Date().toISOString()};mutator(data);transaction.set(ref,{...data,updatedAt:api.serverTimestamp()});const boutiqueQueue=data.queue.filter(x=>!x.cancelledByOrder&&(x.orderId||x.requestId||x.customRequestId||(x.customOrderId&&x.boutiqueOrigin===true)||(!x.customOrderId&&x.audience==='boutique')));const sanitized=boutiqueQueue.slice(0,80).map(x=>({kind:x.customRequestId||(x.customOrderId&&x.boutiqueOrigin===true)?'custom':'boutique',id:String(x.id||'').slice(0,90),name:String(x.name||'').slice(0,120),status:['todo','doing','paused','done','failed'].includes(x.status)?x.status:'todo',quantity:Math.max(1,Math.min(500,Number(x.quantity)||1)),note:(x.customOrderId||x.customRequestId?'':String(x.note||'').slice(0,200)),printer:String(x.printer||'Anycubic Kobra X').slice(0,80),minutes:Math.max(0,Math.round(Number(x.minutes)||0)),elapsedMs:Math.max(0,Number(x.elapsedMs)||0),startAt:String(x.startAt||'').slice(0,25),hasPhoto:!!x.hasPhoto}));const startBase=Math.max(Date.now(),Date.parse(data.planStart)||0),perPrinter=new Map(),stalled=new Set();
 const sanitizedById=new Map(sanitized.map(it=>[it.id,it]));
 for(const raw of [...data.queue].reverse()){
  const it=sanitizedById.get(raw.id);if(!it||['done','failed'].includes(it.status))continue;
  const machine=it.printer;
  if(stalled.has(machine))continue;
  if(it.status==='paused'||!it.minutes){stalled.add(machine);continue;}
  const requested=Date.parse(it.startAt)||0,actual=Date.parse(raw.startedAt)||0;
  let start=Math.max(perPrinter.get(machine)||startBase,requested);
  if(it.status==='doing'&&actual)start=Math.max(Date.now(),requested);
  const liveElapsed=it.status==='doing'&&actual?Math.max(0,Date.now()-actual):0;const rest=Math.max(0,it.minutes-((Number(raw.elapsedMs)||0)+liveElapsed)/60000);const end=start+rest*60000;
  it.estimatedStart=new Date(start).toISOString();it.estimatedEnd=new Date(end).toISOString();
  perPrinter.set(machine,end);
 }
 transaction.set(api.doc(db,'boutiques',user.uid,'planning','current'),{items:sanitized,updatedAt:api.serverTimestamp()});});notice('✓ Sauvegardé automatiquement dans Firebase');}finally{writing=false;}}
let stopCustomRequests=null;
const makeId=()=>`pp-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
async function requestStatus(r,status){if(!confirm(`${status==='accepted'?'Accepter':'Refuser'} cette demande ?`))return;if(status==='accepted'&&r.kind==='sale'){const available=getStock(r.productId);if(available<Number(r.quantity))throw Error(`Stock boutique insuffisant (${available}). Corrige le stock chez elle avant d'approuver cette vente.`);}if(status==='accepted'&&r.kind==='restock'){await saveEdit(data=>{if(data.queue.some(x=>x.requestId===r.id))throw Error('Réapprovisionnement déjà ajouté à la file');data.queue.unshift({id:makeId(),requestId:r.id,audience:'boutique',productId:r.productId,name:r.productName,quantity:r.quantity,minutes:Number(productMap().get(r.productId)?.timeDays||0)*24*60,priority:'urgent',note:'Réapprovisionnement demandé par la boutique : '+String(r.note||'').slice(0,150),status:'todo',date:day()});});}
if(status==='accepted'&&r.kind==='sale'){await saveEdit(data=>{const available=Number(data.stock[r.productId]||0);if(available<Number(r.quantity))throw Error('Stock boutique insuffisant, opération annulée.');if(data.ledger.some(x=>x.requestId===r.id))throw Error('Vente déjà traitée');data.stock[r.productId]=available-Number(r.quantity);data.ledger.unshift({id:makeId(),requestId:r.id,date:day(),productId:r.productId,productName:r.productName,quantity:r.quantity,unitPrice:r.unitPrice,total:Math.round(Number(r.quantity)*Number(r.unitPrice)*100)/100});});}try{await api.updateDoc(api.doc(db,'boutiques',user.uid,'requests',r.id),{status,resolvedAt:api.serverTimestamp()});notice('✓ Demande traitée');}catch(e){notice('Attention : le suivi des ventes a été enregistré mais la demande n’a pas pu être classée. Ne reclique pas avant de vérifier.',true);throw e;}}
document.getElementById('view').addEventListener('change',e=>{if(e.target.closest('#queue-form')&&(e.target.name==='productId'||e.target.name==='quantity')){const f=e.target.form,el=$('jj-filament-check');if(el){const check=filamentAvailability(f.elements.productId.value,Number(f.elements.quantity.value)||1);el.textContent=check.text;el.className='jj-filament-check '+check.kind;}}});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render();}});
$('view').addEventListener('submit',async e=>{e.preventDefault();const f=e.target;try{if(f.id==='queue-form'){const p=productMap().get(f.elements.productId.value),q=Number(f.elements.quantity.value),name=f.elements.name.value.trim();if(!name||!Number.isInteger(q)||q<1||q>500)throw Error('Indique un nom et une quantité valide');const check=filamentAvailability(f.elements.productId.value,q);if(check.kind==='shortage'&&!confirm(check.text+'\n\nVeux-tu quand même planifier cette impression?'))return;const newId=makeId();await saveEdit(d=>{if(d.queue.length>=80)throw Error('Maximum 80 tâches. Archive les anciens prints.');d.queue.unshift({id:newId,productId:p?.id||'',name:name.slice(0,120),quantity:q,printer:f.elements.printer.value,minutes:(Number(f.elements.hours.value)||0)*60+(Number(f.elements.mins.value)||0),startAt:f.elements.startAt.value,priority:f.elements.priority.value,note:f.elements.note.value.slice(0,200),audience:f.elements.audience.value,status:'todo',date:day(),hasPhoto:false});});if(pendingNewQueuePhoto){const photo=pendingNewQueuePhoto;pendingNewQueuePhoto=null;try{await uploadQueuePhoto(newId,photo);}catch(photoError){notice('Impression créée, mais photo non envoyée : '+(photoError.message||photoError),true);}}}else if(f.id==='maintenance-form'){await saveEdit(d=>d.maintenance.unshift({id:makeId(),date:f.elements.date.value,printer:f.elements.printer.value,kind:f.elements.kind.value,hours:Number(f.elements.hours.value||0),note:f.elements.note.value.slice(0,200)}));}else if(f.id==='forecast-form'){const q=Number(f.elements.quantity.value);if(!Number.isInteger(q)||q<1||q>1000)throw Error('Quantité incorrecte');$('forecast-result').innerHTML=forecast(f.elements.productId.value,q);return;}else return;render();}catch(err){notice(err.message||String(err),true);}});
document.addEventListener('change',async e=>{const input=e.target.closest('.queue-photo-file');if(!input||!input.files?.length)return;const zone=input.closest('.jj-queue-photo-entry');input.disabled=true;try{await processQueuePhoto(input.files[0],zone,input.dataset.photoContext,input.dataset.id);}catch(err){notice('Photo non enregistrée : '+(err.message||err),true);}finally{input.disabled=false;input.value='';}});
document.addEventListener('paste',async e=>{
 const imageItem=Array.from(e.clipboardData?.items||[]).find(x=>x.type?.startsWith('image/'));
 if(!imageItem)return;
 let zone=e.target.closest?.('.jj-queue-photo-entry');
 if(!zone){const edit=e.target.closest?.('#jj-queue-edit-form'),add=e.target.closest?.('#queue-form');zone=(edit||add)?.querySelector('.jj-queue-photo-entry');}
 if(!zone||!user)return;
 const file=imageItem.getAsFile();if(!file)return;
 e.preventDefault();try{await processQueuePhoto(file,zone,zone.dataset.photoContext,zone.dataset.id);}catch(err){notice('Collage impossible : '+(err.message||err),true);}
});
document.addEventListener('dragover',e=>{if(e.target.closest?.('.jj-queue-photo-entry')&&Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
document.addEventListener('drop',async e=>{const zone=e.target.closest?.('.jj-queue-photo-entry');if(!zone)return;e.preventDefault();const file=Array.from(e.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));if(!file){notice('Dépose une image.',true);return;}try{await processQueuePhoto(file,zone,zone.dataset.photoContext,zone.dataset.id);}catch(err){notice('Photo non enregistrée : '+(err.message||err),true);}});
$('view').addEventListener('click',e=>{const dialog=e.target;if(dialog.id==='jj-queue-add-dialog'){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){dialog.close();pendingNewQueuePhoto=null;}}});
$('view').addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 if(action==='queue-add'){pendingNewQueuePhoto=null;const dialog=$('jj-queue-add-dialog');if(dialog){dialog.querySelector('form')?.reset();dialog.querySelector('.jj-queue-photo-preview')?.replaceChildren('📋 Clique ici puis Ctrl+V pour coller une capture d’écran');showQueueEditInView(dialog,b);}return;}
 if(action==='queue-add-close'){$('jj-queue-add-dialog')?.close();pendingNewQueuePhoto=null;return;}
 if(action==='queue-open-order'){parent.postMessage({source:'printpilot-atelier',type:'open-custom-order',id:b.dataset.id},location.origin);return;}
 if(action==='enable-jj-alerts'){
  if(!('Notification' in window)){notice('Ce navigateur ne prend pas en charge les notifications.',true);return;}
  try{const status=await Notification.requestPermission();notice(status==='granted'?'✓ Alertes navigateur autorisées lorsque JJ3D est ouvert.':'Notifications refusées ou non autorisées.');}catch(err){notice('Autorisation impossible : '+err.message,true);}return;
 }
 if(action==='delete-custom'){
  const req=customRequests.find(x=>x.id===b.dataset.id);if(!req)return notice('Demande introuvable',true);
  if(req.status==='paid')return notice('Une demande payée doit rester dans l’historique comptable.',true);
  if(!confirm(`Supprimer la demande « ${req.item||'Sans nom'} » chez toi ET à la Boutique ? Cette suppression est définitive; les éventuelles factures conservées ne seront pas supprimées.`))return;
  b.disabled=true;
  try{await api.deleteDoc(api.doc(db,'boutiques',user.uid,'customRequests',req.id));notice('✓ Demande supprimée des deux portails. Les factures éventuelles restent conservées.');}catch(err){notice('Suppression refusée : '+(err.code||err.message),true);b.disabled=false;}
  return;
 }
 if(['import-custom','quote-custom','verify-custom-payment'].includes(action)){
  const request=customRequests.find(x=>x.id===b.dataset.id);
  if(!request){notice('Demande introuvable',true);return;}
  if(action==='quote-custom'&&!confirm('As-tu envoyé le modèle/prix au client et reçu sa confirmation? Le portail Boutique affichera alors le paiement à effectuer.'))return;
  parent.postMessage({source:'printpilot-atelier',type:action==='import-custom'?'import-boutique-request':action==='quote-custom'?'approve-boutique-quote':'validate-boutique-payment',request:JSON.parse(JSON.stringify(request))},location.origin);
  notice('Traitement demandé à JJ3D. Une confirmation apparaîtra après vérification.');return;
 }
 b.disabled=true;try{if(action==='reject-custom'){const request=customRequests.find(x=>x.id===b.dataset.id);if(!request||request.status!=='pending')throw Error('Demande déjà traitée');const accept=false;if(!confirm(accept?'Accepter cette demande et la placer dans À imprimer?':'Refuser cette demande?'))return;if(accept){await saveEdit(d=>{if(d.queue.some(x=>x.customRequestId===request.id))return;if(d.queue.length>=80)throw Error('File pleine');d.queue.unshift({id:makeId(),customRequestId:request.id,name:String(request.item||'Commande spéciale').slice(0,120),quantity:request.quantity,printer:'Anycubic Kobra X',minutes:0,priority:'urgent',note:'Commande de '+String(request.customer||'')+' : '+String(request.colors||'')+' '+String(request.note||'').slice(0,120),status:'todo',date:day()});});}await api.updateDoc(api.doc(db,'boutiques',user.uid,'customRequests',request.id),{status:accept?'accepted':'rejected',resolvedAt:api.serverTimestamp()});render();return;}if(['accept-order','reject-order','delete-order'].includes(action)){const order=orders.find(x=>x.id===b.dataset.id);if(!order)throw Error('Commande introuvable');if(action==='delete-order'){if(!confirm('Supprimer définitivement cette commande? Les tâches déjà planifiées ne seront pas supprimées.'))return;await api.deleteDoc(api.doc(db,'boutiques',user.uid,'orders',order.id));}else{if(order.status!=='pending')throw Error('Commande déjà traitée');if(!confirm(action==='accept-order'?'Accepter cette commande et ajouter ses articles à la file?':'Refuser cette commande?'))return;if(action==='accept-order'){await saveEdit(d=>{if(d.queue.some(x=>x.orderId===order.id))return;if(!Array.isArray(order.items)||!order.items.length||order.items.length>25)throw Error('Commande incorrecte');for(const item of order.items){if(d.queue.length>=80)throw Error('File pleine (80).');if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>300||typeof item.productName!=='string')throw Error('Article invalide dans la commande');const p=productMap().get(item.productId);d.queue.unshift({id:makeId(),orderId:order.id,audience:'boutique',productId:item.productId,name:String(item.productName||'Produit').slice(0,120),quantity:Number(item.quantity)||1,minutes:Number(p?.timeDays||0)*24*60,priority:'normal',note:'Commande Boutique : '+String(order.note||'').slice(0,160),status:'todo',date:day(),hasPhoto:false});}});}await api.updateDoc(api.doc(db,'boutiques',user.uid,'orders',order.id),{status:action==='accept-order'?'accepted':'rejected',resolvedAt:api.serverTimestamp()});}render();return;}if(action==='set-consignment'){const id=$('cons-product').value,q=Number($('cons-qty').value);if(!productMap().has(id)||!Number.isInteger(q)||q<0||q>100000)throw Error('Quantité incorrecte');if(!confirm(`Définir ${q} unité(s) chez la boutique ? Le stock commercial principal n’est pas modifié.`))return;await saveEdit(d=>d.stock[id]=q);}if(action==='accept-request'||action==='reject-request'){const r=requests.find(x=>x.id===b.dataset.id);if(!r||r.status!=='pending')throw Error('Demande déjà traitée');await requestStatus(r,action==='accept-request'?'accepted':'rejected');}if(action==='delete-request'){
  const r=requests.find(x=>x.id===b.dataset.id);
  if(!r)throw Error('Cette demande est déjà supprimée ou introuvable.');
  const processed=r.status!=='pending';
  const warning=processed
    ? 'ATTENTION : cette demande a déjà été traitée. Sa suppression ne retire PAS une vente du rapport, ne remet PAS de stock en boutique et ne supprime PAS une tâche de réapprovisionnement.\n\n'
    : '';
  if(!confirm(warning+'Supprimer définitivement cette demande '+(r.kind==='sale'?'de vente':'de réapprovisionnement')+' pour « '+r.productName+' » ('+r.quantity+' unité(s)) ?\nCette opération est irréversible.'))return;
  await api.deleteDoc(api.doc(db,'boutiques',user.uid,'requests',r.id));
  notice('✓ Demande supprimée');
}
if(action==='queue-edit'){editQueueItem(b.dataset.id,b);return;}if(action==='queue-status'){
 const original=manage.queue.find(x=>x.id===b.dataset.id);
 if(b.dataset.status==='doing'&&original){const check=filamentAvailability(original.productId,Number(original.quantity)||1);if(check.kind==='shortage'&&!confirm(check.text+'\n\nContinuer et démarrer malgré le manque?'))return;}
 await saveEdit(d=>{const x=d.queue.find(x=>x.id===b.dataset.id);if(!x)return;const now=Date.now(),was=x.status;
 if(was==='doing'&&['paused','done','failed'].includes(b.dataset.status)&&x.startedAt){x.elapsedMs=Math.max(0,Number(x.elapsedMs)||0)+Math.max(0,now-Date.parse(x.startedAt));}
 if(b.dataset.status==='doing'&&was!=='doing'){x.startedAt=new Date().toISOString();if(was==='done'||was==='failed')x.elapsedMs=0;}
 if(b.dataset.status==='done'||b.dataset.status==='failed'){x.completedAt=new Date().toISOString();}
 x.status=b.dataset.status;
 });}if(action==='queue-remove'){if(!confirm('Supprimer cette tâche?'))return;await saveEdit(d=>d.queue=d.queue.filter(x=>x.id!==b.dataset.id));}if(action==='maintenance-remove'){if(!confirm('Supprimer cet entretien?'))return;await saveEdit(d=>d.maintenance=d.maintenance.filter(x=>x.id!==b.dataset.id));}if(action==='labels-generate'){
 const p=productMap().get($('label-product').value),q=Number($('label-count').value);
 if(!p||!Number.isInteger(q)||q<1||q>60)throw Error('Nombre d’étiquettes incorrect');
 const url=new URL('boutique.html',location.href);
 url.searchParams.set('atelier',user.uid);
 url.searchParams.set('produit',p.id);
 $('labels-output').innerHTML=Array.from({length:q},()=>`<div class="printlabel"><div class="printlabel-details"><strong class="printlabel-name">${esc(p.name)}</strong><span class="printlabel-price">${cad(p.price)}</span><span class="printlabel-id">ID boutique : #${esc(p.shopId||p.id)}</span><span class="printlabel-colors">${esc(p.colors||'')}</span><span class="printlabel-brand">JJ3D</span></div><div class="printlabel-qr"><div class="qr" data-qrcode="${esc(url.toString())}"></div><small>Scanne pour voir</small></div></div>`).join('');
 createQrs();$('labels-print-button').hidden=false;return;
}
if(action==='labels-print'){
 if(!$('labels-output').querySelector('.printlabel'))throw Error('Crée tes étiquettes avant de les imprimer.');
 if($('labels-output').querySelector('.qr:not(:has(img)):not(:has(canvas))'))throw Error('QR code non généré. Vérifie ta connexion internet.');
 document.body.classList.add('printing-labels');
 const clear=()=>document.body.classList.remove('printing-labels');
 window.addEventListener('afterprint',clear,{once:true});
 window.print();return;
}
if(action==='export-sales'){const rows=[['Date','Produit','ID','Quantite','Prix unitaire','Brut','Commission 30%','Net 70%'],...(manage.ledger||[]).map(x=>[x.date,x.productName,x.productId,x.quantity,x.unitPrice,x.total,(x.total*.3).toFixed(2),(x.total*.7).toFixed(2)])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='printpilot-ventes-boutique-'+day()+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2500);return;}render();}catch(err){notice(err.message||String(err),true)}finally{b.disabled=false;}});
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.source!=='jj3d-admin-flow')return;const {requestId,nextStatus,error,quoteDetails}=e.data;if(error){notice(error,true);return;}if(!requestId||!['reviewed','awaiting_payment','paid'].includes(nextStatus))return;try{await api.updateDoc(api.doc(db,'boutiques',user.uid,'customRequests',requestId),{status:nextStatus,resolvedAt:api.serverTimestamp(),...(nextStatus==='awaiting_payment'&&quoteDetails?{quoteTotal:Math.max(0,Number(quoteDetails.quoteTotal)||0),quoteInvoiceNumber:String(quoteDetails.quoteInvoiceNumber||'').slice(0,60),quotePreviewUrl:String(quoteDetails.quotePreviewUrl||'').slice(0,600)}:{})});notice('✓ Statut Boutique actualisé : '+nextStatus);}catch(err){notice('Commande JJ3D traitée, mais statut Boutique non mis à jour : '+(err.code||err.message),true);}});
$('print-report').addEventListener('click',()=>window.print());
try{const cfg=window.PRINTPILOT_FIREBASE_CONFIG;if(!cfg?.apiKey)throw Error('Configuration Firebase manquante');const v='13.1.0';const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword},{getFirestore,doc,collection,onSnapshot,query,orderBy,runTransaction,serverTimestamp,updateDoc,deleteDoc,setDoc,getDoc}]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);const app=initializeApp(cfg);const auth=getAuth(app);db=getFirestore(app);api={doc,collection,onSnapshot,query,orderBy,runTransaction,serverTimestamp,updateDoc,deleteDoc,setDoc,getDoc};$('login-form').addEventListener('submit',async e=>{e.preventDefault();try{const f=e.target;await signInWithEmailAndPassword(auth,f.elements.email.value.trim(),f.elements.password.value);f.elements.password.value='';}catch(err){notice('Connexion impossible : '+(err.code||err.message),true)}});onAuthStateChanged(auth,u=>{[stopManage,stopWorkshop,stopRequests,stopOrders,stopCustomRequests].forEach(stop=>stop?.());stopManage=stopWorkshop=stopRequests=stopOrders=stopCustomRequests=null;user=u;jjAdminSeen=null;$('who').textContent=u?.email||'';$('workspace').hidden=!u;$('login-panel').hidden=!!u;requests=[];orders=[];customRequests=[];manage={stock:{},queue:[],maintenance:[],ledger:[]};workshop={products:[],rolls:[],prints:[],sales:[]};if(!u){notice('Connecte-toi avec le compte administrateur.');return;}notice('Chargement du suivi et des demandes…');stopManage=onSnapshot(doc(db,'boutiques',u.uid,'management','current'),snap=>{const d=snap.exists()?snap.data():{};manage={stock:d.stock||{},queue:d.queue||[],maintenance:d.maintenance||[],ledger:d.ledger||[],planStart:d.planStart||''};render();},err=>notice('Suivi Atelier + inaccessible : '+(err.code||err.message),true));stopWorkshop=onSnapshot(doc(db,'workspaces',u.uid),snap=>{workshop=snap.data()?.data||{products:[],rolls:[],prints:[],sales:[]};render();},err=>notice('Inventaire privé inaccessible : '+(err.code||err.message),true));stopRequests=onSnapshot(query(collection(db,'boutiques',u.uid,'requests'),orderBy('createdAt','desc')),snap=>{requests=snap.docs.map(d=>({id:d.id,...d.data()}));render();notice('✓ Atelier + synchronisé automatiquement');},err=>notice('Demandes inaccessibles : '+(err.code||err.message),true));stopCustomRequests=onSnapshot(query(collection(db,'boutiques',u.uid,'customRequests'),orderBy('createdAt','desc')),snap=>{customRequests=snap.docs.map(d=>({id:d.id,...d.data()}));jjAdminRequestChanges(customRequests);render();},err=>notice('Demandes personnalisées indisponibles : '+(err.code||err.message),true));stopOrders=onSnapshot(query(collection(db,'boutiques',u.uid,'orders'),orderBy('createdAt','desc')),snap=>{orders=snap.docs.map(d=>({id:d.id,...d.data()}));render();},err=>notice('Commandes inaccessibles : '+(err.code||err.message),true));});}catch(err){notice('Erreur : '+(err.message||String(err)),true);console.error(err)}
