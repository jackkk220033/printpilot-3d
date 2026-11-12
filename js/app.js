/* JJ3D v4.11.13 — HTML/CSS/JavaScript natif, sans Node.js.
   Handlebars améliore facultativement le rendu des cartes, mais n'est pas nécessaire. */
(() => {
 'use strict';
 const KEY = 'printpilot-filaments-v1';
 const EXTRA_KEY = 'printpilot-excel-extras-v1';
 const STATE_KEY = 'printpilot-workshop-state-v2'; // Transactions atomiques : bobines + impressions
 let prints=[];
 let editingPrintId=null;
 let photoDraft=null;
 let photoDb=null;
 let extras={products:[],hardware:[],sales:[],nonCommercial:[],printers:[],invoices:[],stockSlips:[],invoiceSettings:{},packingSlips:[],customOrders:[]}; // réutilise la clé des versions précédentes
 const app = document.getElementById('app');
 const dialog = document.getElementById('roll-dialog');
 const form = document.getElementById('roll-form');
 const toastEl = document.getElementById('toast');
 let rolls = [];
 let search = '';
 let storageError = null;
 const pages = {'sauvegardes':'Sauvegardes de sécurité','commandes-perso':'Commandes personnalisées','atelier-boutique':'Stock Boutique','atelier-demandes':'Demandes Boutique','atelier-queue':'À imprimer','atelier-filament':'Prévisions filament','atelier-labels':'Étiquettes QR','atelier-stats':'Statistiques atelier','atelier-maintenance':'Entretien','atelier-reports':'Rapports Boutique',dashboard:'Tableau de bord',filaments:'Filaments',produits:'Produits',impressions:'Impressions',horsproduction:'Personnel / Échecs / Tests',commandes:'Ventes',hardware:'Hardware',imprimantes:'Imprimantes',finances:'Finances',factures:'Factures',catalogue:'Catalogue à partager'};
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number = (n,d=0) => Number(n).toLocaleString('fr-CA',{minimumFractionDigits:d,maximumFractionDigits:d});
 const money = n => number(n,2)+' $';
 const safeColor = c => /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#8284a0';
 const rollOk = r => r && typeof r.id === 'string' && r.id && typeof r.brand === 'string' && typeof r.color === 'string' && Number.isFinite(Number(r.initial)) && Number(r.initial)>0 && Number.isFinite(Number(r.remaining)) && Number(r.remaining)>=0 && Number(r.remaining)<=Number(r.initial);
 function load() {
  try { const stateRaw=localStorage.getItem(STATE_KEY); const state=stateRaw?JSON.parse(stateRaw):null; const raw=state&&Array.isArray(state.rolls)?null:localStorage.getItem(KEY); const parsed=raw?JSON.parse(raw):[]; rolls=(state&&Array.isArray(state.rolls)?state.rolls:parsed).filter(rollOk); prints=state&&Array.isArray(state.prints)?state.prints.filter(validPrint):[]; }
  catch(e) { storageError = 'Impossible de lire le stockage de ce navigateur.'; console.error('PrintPilot load:',e); rolls=[]; }
 }
 function validPrint(p){return p&&typeof p.id==='string'&&Array.isArray(p.usage)&&p.usage.every(u=>typeof u.rollId==='string'&&Number.isFinite(Number(u.grams))&&Number(u.grams)>0)&&['active','cancelled','noncommercial'].includes(p.status);}
 const BACKUP_KEY='jj3d-safety-history-v1';
 function backupBeforeChange(){
  try{const stateRaw=localStorage.getItem(STATE_KEY),extrasRaw=localStorage.getItem(EXTRA_KEY);if(!stateRaw||!extrasRaw)return;
   const now=Date.now(),all=JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');
   if(all[0]&&now-Date.parse(all[0].createdAt)<120000)return; // snapshots at most every two minutes
   const record={id:'jj-backup-'+now,createdAt:new Date(now).toISOString(),state:JSON.parse(stateRaw),extras:JSON.parse(extrasRaw)};
   if(!Array.isArray(all))return;all.unshift(record);localStorage.setItem(BACKUP_KEY,JSON.stringify(all.slice(0,8)));
  }catch(e){console.warn('Copie de sécurité locale indisponible:',e);}
 }
 function backupsPage(){let records=[];try{records=JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');}catch(e){}
 return header('SÉCURITÉ','Sauvegardes de sécurité','Retrouve les versions récentes conservées sur cet appareil. Elles ne remplacent PAS une sauvegarde externe.')+
 `<div class="notice">🔐 Jusqu'à 8 états précédents sont conservés localement lors de tes modifications. Une suppression du navigateur ou un changement d'appareil peut les effacer. Exporte régulièrement un JSON complet.</div><div class="actions"><button type="button" class="primary-btn" id="export-full">↧ Exporter les données en JSON</button></div><section class="panel"><h2>Historique local (${records.length})</h2>${records.map(r=>`<article class="item"><strong>${esc(new Date(r.createdAt).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'}))}</strong> — ${Number(r.extras?.products?.length)||0} produits, ${Number(r.extras?.customOrders?.length)||0} commandes personnalisées <button type="button" class="secondary-btn" data-restore-backup="${esc(r.id)}">Restaurer cette version</button></article>`).join('')||'<p>Aucune version disponible. Une sauvegarde est créée avant tes prochaines modifications.</p>'}</section>`;
 }
 function restoreBackup(id){let items=[];try{items=JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');}catch(e){}const record=items.find(x=>x.id===id);if(!record)return notify('Sauvegarde introuvable.',true);
  if(!confirm('Cette restauration remplacera ton inventaire, tes commandes et tes factures actuels sur cet appareil et demandera une synchronisation Firebase. Exporte ton JSON avant de continuer. Restaurer?'))return;
  const state=record.state,extra=record.extras;if(!Array.isArray(state?.rolls)||!Array.isArray(state?.prints)||!Array.isArray(extra?.products)||!Array.isArray(extra?.customOrders||[])){notify('Sauvegarde invalide.',true);return;}
  if(persistWorkshop(state.rolls,state.prints,extra)){render();notify('✓ Restauration locale appliquée. Vérifie la confirmation Firebase.');}
 }

 function persist(next, nextPrints=prints) {
  backupBeforeChange();
  // Une seule écriture fait foi : pas de double déduction possible si une autre écriture échoue.
  const payload=JSON.stringify({version:2,rolls:next,prints:nextPrints});
  try {
   localStorage.setItem(STATE_KEY,payload);
   if(localStorage.getItem(STATE_KEY)!==payload)throw new Error('Storage verification failed');
   storageError=null;
   queueMicrotask(()=>window.dispatchEvent(new Event('printpilot:changed')));
   // Ancienne clé en copie de compatibilité, jamais utilisée lorsque STATE_KEY existe.
   try {localStorage.setItem(KEY,JSON.stringify(next));}catch(e){console.warn('Ancienne copie non actualisée:',e);}
   return true;
  } catch(e) {storageError='Edge bloque la sauvegarde locale. Vérifie les autorisations de stockage.';console.error('PrintPilot save:',e);notify(storageError,true);return false;}
 }
 function persistWorkshop(nextRolls,nextPrints,nextExtras){
  backupBeforeChange();
  // Une seule opération logique : bobines, journal et catalogue changent ensemble.
  // Ne notifier Firebase qu'après confirmation des deux écritures locales.
  const oldState=localStorage.getItem(STATE_KEY),oldExtra=localStorage.getItem(EXTRA_KEY);
  const state=JSON.stringify({version:2,rolls:nextRolls,prints:nextPrints});
  const extra=JSON.stringify(nextExtras);
  try{
   localStorage.setItem(STATE_KEY,state);localStorage.setItem(EXTRA_KEY,extra);
   if(localStorage.getItem(STATE_KEY)!==state||localStorage.getItem(EXTRA_KEY)!==extra)throw Error('Vérification du stockage échouée');
  }catch(e){
   try{if(oldState===null)localStorage.removeItem(STATE_KEY);else localStorage.setItem(STATE_KEY,oldState);
    if(oldExtra===null)localStorage.removeItem(EXTRA_KEY);else localStorage.setItem(EXTRA_KEY,oldExtra);}catch(rollbackError){console.error('Rollback impossible',rollbackError);}
   console.error('Écriture PrintPilot interrompue:',e);notify('Sauvegarde impossible : les données précédentes sont conservées.',true);return false;
  }
  rolls=nextRolls;prints=nextPrints;extras=nextExtras;
  queueMicrotask(()=>window.dispatchEvent(new Event('printpilot:changed')));
  return true;
 }
 function notify(message,error=false){toastEl.textContent=message;toastEl.className='toast show'+(error?' error':'');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toastEl.className='toast',4000);}
 function page(){const name=location.hash.slice(1);return Object.hasOwn(pages,name)?name:'dashboard';}
 function statCard(icon,value,label){const data={icon,value,label};if(window.Handlebars){try {return Handlebars.compile(document.getElementById('stat-template').textContent)(data)}catch(e){console.warn('Handlebars fallback:',e)}}return `<article class="stat"><div class="stat-symbol">${esc(icon)}</div><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`;}
 function metrics(){const grams=rolls.reduce((s,r)=>s+Number(r.remaining),0), initial=rolls.reduce((s,r)=>s+Number(r.initial),0), cost=rolls.reduce((s,r)=>s+Number(r.price||0),0);return {grams,initial,cost,count:rolls.length,low:rolls.filter(r=>Number(r.remaining)<200).length};}
 function header(eyebrow,title,subtitle,action=''){return `<div class="page-header"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;}
 function warning(){return storageError?`<div class="notice warning">⚠ ${esc(storageError)}</div>`:'';}
 function safeNum(n){return Number.isFinite(Number(n))?Number(n):0;}
 function openPhotoDb(){if(photoDb)return Promise.resolve(photoDb);return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB indisponible'));const req=indexedDB.open('printpilot-photos-v1',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos')};req.onsuccess=()=>{photoDb=req.result;resolve(photoDb)};req.onerror=()=>reject(req.error);});}
 async function localPhoto(key){try{const db=await openPhotoDb();return await new Promise((resolve,reject)=>{const req=db.transaction('photos','readonly').objectStore('photos').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}catch(e){console.warn('Photo read failed',e);return null;}}
 async function getPhoto(key){
   const service=window.PrintPilotPhotos;
   if(service?.isReady?.()){
     try{const cloud=await service.getPhoto(key);if(cloud)return cloud;}catch(e){console.warn('Photo cloud read failed:',e);}
   }
   return await localPhoto(key);
 }
 async function setPhotoLocal(key,src){const db=await openPhotoDb();return new Promise((resolve,reject)=>{const t=db.transaction('photos','readwrite');t.objectStore('photos').put(src,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
 async function setPhoto(key,src){
   await setPhotoLocal(key,src);
   if(window.PrintPilotPhotos?.isReady?.())await window.PrintPilotPhotos.savePhoto(key,src);
   return window.PrintPilotPhotos?.isReady?.()?'cloud':'local';
 }
 async function deletePhoto(key){try{const db=await openPhotoDb();return await new Promise((resolve,reject)=>{const t=db.transaction('photos','readwrite');t.objectStore('photos').delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch(e){console.warn('Photo deletion failed',e);}}
 async function compactPhoto(uri){
   const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Image invalide'));image.src=uri;});
   let side=720,quality=0.68;
   for(let i=0;i<8;i++){
     const scale=Math.min(1,side/image.width,side/image.height),c=document.createElement('canvas');
     c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));
     c.getContext('2d').drawImage(image,0,0,c.width,c.height);
     const data=c.toDataURL('image/jpeg',quality);
     if(data.length<285000)return data;
     side=Math.max(300,Math.floor(side*0.82));quality=Math.max(0.43,quality-0.05);
   }
   throw Error('Photo trop grande même après compression.');
 }
 async function fileToPhoto(file){if(!file||!file.type.startsWith('image/'))throw Error('Choisis une image PNG, JPG ou WEBP.');if(file.size>12*1024*1024)throw Error('Image trop grande (maximum 12 Mo).');const uri=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Lecture impossible'));r.readAsDataURL(file)});return compactPhoto(uri);}
 function printMaterialCost(p){return (p.usage||[]).reduce((a,u)=>{const r=rolls.find(x=>x.id===u.rollId);return a+(r&&Number(r.initial)>0?Number(u.grams)*safeNum(r.price)/Number(r.initial):0)},0);}
 // Les photos produit sont identifiées par ID stock (#), jamais par l'ID Excel partagé.
 function uniqueProductPhotoKey(p){return 'print:product-shop:'+String(p.shopId);}
 async function getProductPhoto(p){return (await getPhoto(uniqueProductPhotoKey(p))) || (await getPhoto('print:product:'+String(p.legacyPhotoId||p.id)));}
 function productThumb(p,cls='photo-thumb'){return `<div class="${cls}" data-photo-shop="${esc(p.shopId)}" aria-label="Photo de ${esc(p.name)}">▧</div>`;}
 function thumb(id,cls='photo-thumb'){return `<div class="${cls}" data-photo-id="${esc(id)}" aria-label="Photo de l'impression">▧</div>`;}
 async function hydratePhotos(){
   const elements=[...document.querySelectorAll('[data-photo-id], [data-photo-shop], [data-custom-order-photo], [data-custom-order-color-photo]')];
   await Promise.all(elements.map(async el=>{
     const product=el.dataset.photoShop?extras.products.find(p=>String(p.shopId)===el.dataset.photoShop):null;
     const data=el.dataset.customOrderColorPhoto?await getPhoto('custom-order-color:'+el.dataset.customOrderColorPhoto):(el.dataset.customOrderPhoto?await getPhoto('custom-order:'+el.dataset.customOrderPhoto):(product?await getProductPhoto(product):await getPhoto('print:'+el.dataset.photoId)));
     if(!el.isConnected||!data)return;
     const img=document.createElement('img');img.src=data;img.alt='Photo';img.loading='lazy';el.replaceChildren(img);el.classList.add('has-photo');
   }));
 }
 async function migrateLocalPhotos(onProgress){
   const db=await openPhotoDb();
   const keys=await new Promise((resolve,reject)=>{const r=db.transaction('photos','readonly').objectStore('photos').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   let sent=0,skipped=0,failed=0;
   for(const key of keys){
     const data=await localPhoto(key);if(!data){skipped++;continue;}
     try{
       if(await window.PrintPilotPhotos.hasPhoto(key)){skipped++;continue;}
       const small=await compactPhoto(data);
       await window.PrintPilotPhotos.savePhoto(key,small);
       sent++;
     }catch(e){console.error('Échec migration photo',key,e);failed++;}
     onProgress?.({sent,skipped,failed,total:keys.length});
   }
   return {sent,skipped,failed,total:keys.length};
 }
 window.PrintPilotLocalPhotos={migrateLocalPhotos};
 window.addEventListener('printpilot:photos-changed',()=>hydratePhotos());
 // ID externe numérique : unique par variante, indépendant de l’ID descriptif Excel.
 // v4.11.22 : le tarif machine est une partie du prix facturé, pas un coût.
 // Corrige seulement les fiches issues de l'ancien calcul horaire; jamais les ventes déjà enregistrées.
 function normalizeProductPricing(p){
  if(!p || p.pricingModel==='hourly-revenue-v1')return p;
  if(p.hourlyRate===undefined || p.hourlyRate===null || p.printTimeCost===undefined)return p;
  const timeCharge=Math.max(0,safeNum(p.printTimeCost));
  const correctedCost=Math.max(0,safeNum(p.unitCost)-timeCharge);
  const price=safeNum(p.price),rate=safeNum(p.commissionRate);
  return {...p,unitCost:correctedCost,unitProfit:price-correctedCost-price*rate,pricingModel:'hourly-revenue-v1'};
 }
 function ensureShopIds(products){
  // Migration v1.4 : IDs 1001, 1002... -> 1, 2... une seule fois.
  // Ne jamais changer les autres IDs valides, même si une variante change de nom.
  const original=products.map(p=>String(p.shopId??'').trim());
  const legacy=original.length>0&&original.every(id=>/^\d+$/.test(id)&&Number(id)>=1001)&&new Set(original).size===original.length;
  const converted=original.map(id=>legacy?String(Number(id)-1000):id);
  const used=new Set();let next=1;
  return products.map((product,i)=>{
   let id=converted[i];
   if(!/^\d+$/.test(id)||Number(id)<1||used.has(id)){
    while(used.has(String(next)))next++;
    id=String(next++);
   }
   used.add(id);
   return normalizeProductPricing({...product,shopId:id});
  });
 }
 function catalogCsv(){
  const rows=[['ID numérique','ID Excel','Produit','Catégorie','Couleurs','Prix CAD','Stock'],
   ...commercialProducts().map(p=>[p.shopId,p.id,p.name,p.category,p.colors,safeNum(p.price).toFixed(2),safeNum(p.stock)])];
  downloadText('printpilot-catalogue-ids.csv','\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8');
  notify('Catalogue CSV téléchargé : les deux IDs sont inclus.');
 }
 function extrasSummary(){return {products:extras.products.length,hardware:extras.hardware.length,sales:extras.sales.length,units:extras.products.reduce((a,p)=>a+safeNum(p.stock),0),stockValue:extras.products.reduce((a,p)=>a+safeNum(p.stock)*safeNum(p.price),0),profit:activeSales().reduce((a,s)=>a+safeNum(s.profit),0)};}
 function excelNotice(){return `<div class="notice">📄 &nbsp; Sélectionne directement ton classeur <b>.xlsm</b> avec « Importer mon Excel ». Les macros ne sont jamais exécutées. L'import ajoute seulement les références manquantes : il ne remet pas les quantités existantes à zéro.</div>`;}
 function importButton(){return '<button type="button" class="primary-btn" id="import-excel">⬇ Importer mon Excel (.xlsm)</button>';}
 // Lecture du fichier Excel directement dans Edge, sans serveur, sans exécuter les macros VBA.
 async function parseXlsm(file){
  if(!window.XLSX)throw Error('Le lecteur Excel SheetJS ne s’est pas chargé. Vérifie que cdn.sheetjs.com est autorisé sur ce réseau, ou utilise la version locale déjà importée.');
  const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,cellFormula:false});
  const sheet=(name)=>{
   if(!wb.Sheets[name])throw Error('Onglet manquant dans le classeur : '+name);
   return window.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true,blankrows:false});
  };
  const body=(name)=>sheet(name).slice(4); // Ligne 4 : en-têtes; ligne 5 : première donnée
  const str=v=>v===null||v===undefined?'':String(v).trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const yes=v=>['oui','yes','true','1'].includes(str(v).toLowerCase());
  const colors={'noir':'#111111','black':'#111111','blanc':'#f7f8fa','white':'#f7f8fa','rouge':'#e34545','red':'#e34545','bleu':'#3578da','blue':'#3578da','vert':'#34a66c','green':'#34a66c','rose':'#db84ae','pink':'#db84ae','jaune':'#ecc63e','yellow':'#ecc63e','gris':'#929baa','grey':'#929baa','orange':'#ee964a','mauve':'#9b77c6'};
  const swatch=v=>{const c=str(v).toLowerCase();return Object.entries(colors).find(([key])=>c.includes(key))?.[1]||'#797b9d';};
  const filaments=body('Filaments').filter(r=>str(r[0])).map(r=>({id:str(r[0]),code:str(r[0]),brand:str(r[1]),material:str(r[2])||'PLA',color:str(r[3])||'Inconnu',initial:num(r[4]),remaining:num(r[5]),price:num(r[7]),swatch:swatch(r[3]),supplier:str(r[10]),notes:str(r[13]),source:'Excel'})).filter(r=>r.initial>0&&r.remaining>=0&&r.remaining<=r.initial);
  const products=body('Produits 3D').filter(r=>str(r[0])).map(r=>{
   const materials=[];for(let i=5;i<=11;i+=2){if(str(r[i])&&num(r[i+1])>0)materials.push({id:str(r[i]),grams:num(r[i+1])});}
   const components=[];for(let i=30;i<=37;i+=2){if(str(r[i])&&num(r[i+1])>0)components.push({id:str(r[i]),quantity:num(r[i+1])});}
   return {id:str(r[0]),name:str(r[1]),category:str(r[2]),printer:str(r[3]),colors:str(r[4]),materials,grams:num(r[13]),timeDays:num(r[14]),filamentCost:num(r[15]),otherCost:num(r[16]),unitCost:num(r[17]),printed:num(r[18]),sold:num(r[19]),stock:num(r[20]),price:num(r[21]),inShop:yes(r[22]),commissionRate:num(r[23]),unitProfit:num(r[26]),notes:'',components,source:'Excel'};
  });
  const hardware=body('Hardware - Supplies').filter(r=>str(r[0])).map(r=>({id:str(r[0]),name:str(r[1]),category:str(r[2]),initial:num(r[3]),remaining:num(r[4]),threshold:num(r[5]),packQuantity:num(r[6]),packPrice:num(r[7]),unitCost:num(r[8]),supplier:str(r[9]),status:str(r[10]),notes:str(r[11]),source:'Excel'}));
  const sales=body('Ventes').filter(r=>str(r[2])&&num(r[4])>0).map((r,i)=>({id:str(r[1])||'sale-'+(i+1),date:str(r[0]),productId:str(r[2]),product:str(r[3]),quantity:num(r[4]),channel:str(r[5]),unitPrice:num(r[6]),commissionRate:num(r[7])*100,gross:num(r[8]),commission:num(r[9]),net:num(r[10]),cost:num(r[11]),profit:num(r[12]),notes:str(r[13]),source:'Excel'}));
  if(!filaments.length||!products.length)throw Error('Aucune donnée trouvée dans les onglets Filaments / Produits 3D. Vérifie que tu utilises ton fichier original.');
  return {version:3,sourceFile:file.name,filaments,products,hardware,sales};
 }
 async function importExcelFile(file){
  if(!file)return;
  if(!/\.(xlsm|xlsx|json)$/i.test(file.name)){notify('Choisis ton fichier Excel .xlsm ou .xlsx.',true);return;}
  if(file.size>20*1024*1024){notify('Fichier trop volumineux (max 20 Mo).',true);return;}
  let source;
  try{
   source=/\.json$/i.test(file.name)?JSON.parse(await file.text()):await parseXlsm(file);
  }catch(e){console.error('Lecture Excel:',e);notify('Import impossible : '+e.message,true);alert('Lecture du fichier impossible : '+e.message);return;}
  if(!source||!Array.isArray(source.filaments)||!Array.isArray(source.products)||!Array.isArray(source.hardware)||!Array.isArray(source.sales)||!source.filaments.every(rollOk)||!source.products.every(p=>p&&typeof p.id==='string'&&p.id)||!source.hardware.every(h=>h&&typeof h.id==='string'&&h.id)){
   notify('Données Excel incompatibles. Rien n’a été modifié.',true);return;
  }
  // Mode non destructif : ne jamais remplacer les rouleaux entamés, les stocks, les ventes ni les impressions existantes.
  const existingRolls=new Set(rolls.map(r=>r.id));
  const existingProducts=new Set(extras.products.map(p=>p.id));
  const existingHardware=new Set(extras.hardware.map(h=>h.id));
  const newRolls=source.filaments.filter(r=>!existingRolls.has(r.id));
  const newProducts=source.products.filter(p=>!existingProducts.has(p.id));
  const newHardware=source.hardware.filter(h=>!existingHardware.has(h.id));
  const saleKey=s=>String(s.id??[s.date,s.product,s.quantity,s.gross].join('|'));
  const existingSales=new Set(extras.sales.map(saleKey));
  const newSales=source.sales.filter(s=>!existingSales.has(saleKey(s)));
  if(!newRolls.length&&!newProducts.length&&!newHardware.length&&!newSales.length){notify('Ton Excel est déjà importé. Aucune donnée modifiée.');return;}
  const msg=`Importer uniquement les données manquantes ?\n\n+ ${newRolls.length} bobine(s)\n+ ${newProducts.length} produit(s)\n+ ${newHardware.length} composant(s)\n+ ${newSales.length} vente(s)\n\nLes données et stocks existants sont conservés. Aucune ancienne impression ne sera déduite de nouveau.`;
  if(!confirm(msg))return;
  const oldState=localStorage.getItem(STATE_KEY),oldExtras=localStorage.getItem(EXTRA_KEY),oldLegacy=localStorage.getItem(KEY);
  const existingIds=new Set(extras.products.map(p=>String(p.shopId||'')));
  let nextId=1;const withIds=newProducts.map(p=>{while(existingIds.has(String(nextId)))nextId++;const shopId=String(nextId++);existingIds.add(shopId);return {...p,shopId};});
  const mergedRolls=[...rolls,...newRolls];
  const mergedExtras={...extras,products:[...extras.products,...withIds],hardware:[...extras.hardware,...newHardware],sales:[...extras.sales,...newSales]};
  const stateStr=JSON.stringify({version:2,rolls:mergedRolls,prints});const extraStr=JSON.stringify(mergedExtras);
  try{
   localStorage.setItem(STATE_KEY,stateStr);localStorage.setItem(EXTRA_KEY,extraStr);
   if(localStorage.getItem(STATE_KEY)!==stateStr||localStorage.getItem(EXTRA_KEY)!==extraStr)throw Error('Échec de vérification');
   rolls=mergedRolls;extras=mergedExtras;
   try{localStorage.setItem(KEY,JSON.stringify(mergedRolls));}catch(_){}
   queueMicrotask(()=>window.dispatchEvent(new Event('printpilot:changed')));
   render();notify('✓ Import terminé : données manquantes ajoutées, stocks existants conservés.');
  }catch(e){
   console.error('Import Excel:',e);
   try{if(oldState===null)localStorage.removeItem(STATE_KEY);else localStorage.setItem(STATE_KEY,oldState);
       if(oldExtras===null)localStorage.removeItem(EXTRA_KEY);else localStorage.setItem(EXTRA_KEY,oldExtras);
       if(oldLegacy===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldLegacy);}catch(er){console.error('Restauration:',er)}
   notify('Import annulé : impossible de sauvegarder les données. Vérifie le stockage.',true);
  }
 }
 // Durée enregistrée dans Excel (fraction d’une journée). Une fiche peut représenter un lot.
 function excelPrintDuration(p){
  const days=Number(p.timeDays);
  if(!Number.isFinite(days)||days<=0)return 'Non renseigné';
  const minutes=Math.round(days*24*60);
  return clockDuration(minutes);
 }

 // v4.2 — filtres de présentation uniquement (aucune modification de stock).
 const uiFilters={catalogue:{category:'all',color:'all',stock:'all',q:''},produits:{category:'all',color:'all',stock:'all',q:'',sort:'id'},impressions:{category:'all',color:'all',stock:'all',q:''}};
 const groups=[['all','Tous'],['clicker','Clickers'],['vase','Vases'],['fidget','Fidgets'],['decoration','Décoration'],['keychain','Porte-clés']];
 function normFilter(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();}
 function groupMatch(p,group){if(group==='all')return true;const v=normFilter([p.name,p.category,p.id].join(' '));const checks={clicker:/clicker|cliqueur/,vase:/vase/,fidget:/fidget|infinity cube/,decoration:/decor|noel|christmas|gnome|candle/,keychain:/keychain|key chain|porte.cle|key tag/};return checks[group]?.test(v)||false;}
 function commercialProducts(){return extras.products.filter(p=>!p.hiddenOffProduction);}
 function filteredProducts(view,query){const st=uiFilters[view]||uiFilters.catalogue;const q=normFilter(query===undefined?st.q:query);return commercialProducts().filter(p=>{
  const joined=normFilter([p.shopId,p.id,p.name,p.category,p.colors,p.printer,...(p.materials||[]).map(m=>m.id)].join(' '));
  if(q&&!joined.includes(q))return false;
  if(!groupMatch(p,st.category))return false;
  if(st.color!=='all'&&!normFilter(p.colors).includes(normFilter(st.color)))return false;
  if(st.stock==='available'&&safeNum(p.stock)<=0)return false;
  if(st.stock==='empty'&&safeNum(p.stock)>0)return false;
  return true;
 }).sort((a,b)=> {
   const byId=(x,y)=>(Number(x.shopId)||0)-(Number(y.shopId)||0);
   if(view==='produits'&&st.sort==='category')return String(a.category||'').localeCompare(String(b.category||''),'fr')||byId(a,b);
   if(view==='produits'&&st.sort==='name')return String(a.name||'').localeCompare(String(b.name||''),'fr')||byId(a,b);
   return byId(a,b);
 });}
 function filterToolbar(view){const st=uiFilters[view];const colors=[...new Set(extras.products.flatMap(p=>String(p.colors||'').split(/[\/,;+]/).map(x=>x.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'fr'));
  const options=colors.map(c=>`<option value="${esc(c)}" ${st.color===c?'selected':''}>${esc(c)}</option>`).join('');
  return `<div class="pp-filters" data-filter-toolbar="${view}" aria-label="Filtres ${view}"><div class="pp-filter-chips">${groups.map(([id,label])=>`<button type="button" class="pp-chip ${st.category===id?'selected':''}" data-filter-category="${id}" data-filter-view="${view}" aria-pressed="${st.category===id}">${label}</button>`).join('')}</div><div class="pp-filter-fields"><label>Couleur<select data-filter-color="${view}"><option value="all">Toutes les couleurs</option>${options}</select></label><label>Stock<select data-filter-stock="${view}"><option value="all">Tout le stock</option><option value="available" ${st.stock==='available'?'selected':''}>En stock</option><option value="empty" ${st.stock==='empty'?'selected':''}>Épuisé</option></select></label>${view==='produits'?`<label>Trier par<select data-filter-sort="produits"><option value="id" ${st.sort==='id'?'selected':''}>ID stock (défaut)</option><option value="category" ${st.sort==='category'?'selected':''}>Catégorie + ID</option><option value="name" ${st.sort==='name'?'selected':''}>Nom A–Z</option></select></label>`:''}<span class="pp-filter-count" id="${view}-count"></span></div></div>`;
 }
 function updateFilteredView(view){const map={catalogue:['catalog-results',catalogRows],produits:['product-results',productRows],impressions:['print-catalog-results',printCatalogRows]};const [id,fn]=map[view]||[];if(!id)return;const el=document.getElementById(id);if(!el)return;el.innerHTML=fn(uiFilters[view].q);const count=document.getElementById(view+'-count');if(count)count.textContent=filteredProducts(view).length+' résultat(s)';hydratePhotos();}

 // Réparation non destructive des références Excel répétées; aperçu/confirmation obligatoire.
 function repairVariantIds(){
  const desired={
   '20':['XMAS-FLAT-BLEU','Bleu'],'21':['XMAS-FLAT-BLANC','Blanc'],'22':['XMAS-FLAT-OR-MAUVE','Or / Mauve'],
   '28':['XMAS-ZIZ-ZAG-BLANC','Blanc'],'29':['XMAS-ZIZ-ZAG-NOIR','Noir'],'30':['XMAS-ZIZ-ZAG-ROUGE','Rouge'],
   '70':['PACK-ANIMAL-ROUGE','Rouge'],'71':['PACK-ANIMAL-ROSE','Rose'],
   '75':['VASE-CARRE-OR-MAUVE','Or / Mauve'],'76':['VASE-CARRE-OR','Or']
  };
  const groups={
   '20':'XMAS-FLAT-SET-01','21':'XMAS-FLAT-SET-01','22':'XMAS-FLAT-SET-01',
   '28':'XMAS-Ziz-Zag-Tree-PLA-set-01','29':'XMAS-Ziz-Zag-Tree-PLA-set-01','30':'XMAS-Ziz-Zag-Tree-PLA-set-01',
   '70':'PACK-4-Animal-Key-Tag-01','71':'PACK-4-Animal-Key-Tag-01',
   '75':'Vase-Carre-With-Leg','76':'Vase-Carre-With-Leg'
  };
  const changes=[],blocked=[],mismatches=[];
  for(const [shopId,[newId,color]] of Object.entries(desired)){
   const p=extras.products.find(p=>String(p.shopId)===shopId);
   if(!p)continue;
   if(p.id===newId&&p.colors===color)continue;
   if(p.id!==groups[shopId]&&p.id!==newId){mismatches.push('#'+shopId+' ('+p.id+')');continue;}
   if(extras.products.some(x=>String(x.shopId)!==shopId&&x.id===newId)){blocked.push('#'+shopId+' : ID déjà utilisé');continue;}
   if(p.id!==newId&&(prints.some(x=>x.productId===p.id)||(extras.sales||[]).some(x=>x.productId===p.id)||(extras.nonCommercial||[]).some(x=>x.originProductId===p.id))){blocked.push('#'+shopId+' : référence utilisée dans un historique');continue;}
   changes.push({shopId,newId,color,oldId:p.id});
  }
  if(blocked.length||mismatches.length){alert('Réparation arrêtée pour protéger les données.\n'+[...blocked,...mismatches].join('\n'));return;}
  if(!changes.length){notify('✓ Ces variantes ont déjà des ID et couleurs distincts.');return;}
  const preview=changes.map(c=>'#'+c.shopId+' : '+c.oldId+' → '+c.newId+' ('+c.color+')').join('\n');
  if(!confirm('Corriger '+changes.length+' variantes ?\n\n'+preview+'\n\nStock, prix, grammes, ventes et filament inchangés. Les anciennes photos restent disponibles.'))return;
  const updates=new Map(changes.map(c=>[c.shopId,c]));
  const next={...extras,products:extras.products.map(p=>{const c=updates.get(String(p.shopId));return c?{...p,id:c.newId,colors:c.color,legacyPhotoId:p.legacyPhotoId||p.id}:p;})};
  if(!persistExtras(next))return;
  render();notify('✓ '+changes.length+' variantes corrigées. Réattribue leurs photos individuellement.');
 }
 function productPage(){const p=commercialProducts();return header('CATALOGUE','Mes produits','Tes modèles et leurs prix. Pour fabriquer un nouveau modèle, utilise « Impressions » : la fiche se crée automatiquement.',`<div class="header-actions"><button type="button" class="secondary-btn" data-go="commandes-perso">📝 Commandes personnalisées</button><button type="button" class="secondary-btn" id="repair-variant-ids">🔧 Réparer ID variantes</button><button type="button" class="primary-btn" id="add-product">＋ Ajouter un produit</button>${importButton()}</div>`)+warning()+(p.length?'':excelNotice())+`<div class="stats-grid three">${statCard('⬡',number(p.length),'Produits / variantes')}${statCard('▣',number(p.reduce((s,r)=>s+safeNum(r.stock),0)),'Unités en stock')}${statCard('$',money(p.reduce((s,r)=>s+safeNum(r.stock)*safeNum(r.price),0)),'Valeur stock au prix de vente')}</div><section class="panel"><div class="panel-head"><div><h2>Tous mes produits</h2><p>Produits Excel et produits créés dans PrintPilot.</p></div><input class="table-filter" id="product-search" placeholder="Rechercher un produit…" type="search"></div>${filterToolbar('produits')}<div id="product-results">${productRows('')}</div></section>`;}
 function productRows(searchTerm){const p=filteredProducts('produits',searchTerm);return p.length?`<div class="inventory-card-grid">${p.map(r=>`<article class="inventory-card"><button type="button" class="admin-product-preview" data-view-admin-product="${esc(r.shopId)}" aria-label="Agrandir ${esc(r.name)}">${productThumb(r,'product-card-image')}</button><div class="inventory-card-head"><div><h3>${esc(r.name)}</h3><small>ID stock #${esc(r.shopId)} · ${esc(r.id)}</small></div><strong>${money(r.price)}</strong></div><div class="detail-grid"><div><small>Catégorie</small><strong>${esc(r.category||'—')}</strong></div><div><small>Couleurs</small><strong>${esc(r.colors||'—')}</strong></div><div><small>En stock</small><strong>${number(r.stock)}</strong></div><div><small>Temps d’impression</small><strong>${esc(excelPrintDuration(r))}</strong></div><div><small>Coût / unité</small><strong>${money(r.unitCost)}</strong></div><div><small>Montant du temps facturé (${money(r.hourlyRate??2)}/h)</small><strong>${money(r.printTimeCost??safeNum(r.timeDays)*24*2)}</strong></div><div><small>Profit estimé</small><strong>${money(r.unitProfit)}</strong></div></div><div class="actions"><button type="button" class="secondary-btn" data-edit-product="${esc(r.shopId)}">✎ Modifier</button><button type="button" class="secondary-btn" data-new-print-product="${esc(r.id)}">＋ Impression</button><button type="button" class="secondary-btn" data-new-sale-product="${esc(r.id)}">＄ Vente</button>${safeNum(r.stock)>0&&safeNum(r.printed)>0?`<button type="button" class="secondary-btn" data-open-move-off="${esc(r.id)}">⚠ Classer hors production</button>`:""}<button type="button" class="secondary-btn" data-upload-product="${esc(r.shopId)}">🖼 Importer photo</button><button type="button" class="secondary-btn" data-camera-product="${esc(r.shopId)}">📸 Prendre photo</button></div></article>`).join('')}</div>`:'<p class="empty">Aucun produit à afficher.</p>';}

 function fixChristmasColors(){
  const expected=[['20','Bleu'],['21','Blanc'],['22','Or / Mauve']];
  const found=expected.map(([shopId,color])=>({shopId,color,p:extras.products.find(p=>String(p.shopId)===shopId)}));
  if(found.some(x=>!x.p)||found.some(x=>!String(x.p.name||'').toLowerCase().includes('noël')&&!String(x.p.name||'').toLowerCase().includes('noel'))){notify('Les fiches #20, #21 et #22 ne correspondent pas aux décorations attendues. Aucune modification.',true);return;}
  if(!confirm('Corriger uniquement les couleurs des 3 sets de Noël ?\n#20 : Bleu\n#21 : Blanc\n#22 : Or / Mauve\n\nLes ID, photos, stocks, ventes, grammes et coûts resteront inchangés.'))return;
  const colorByShop=new Map(expected);
  const next={...extras,products:extras.products.map(p=>colorByShop.has(String(p.shopId))?{...p,colors:colorByShop.get(String(p.shopId))}:p)};
  if(!persistExtras(next)){notify('Impossible de sauvegarder les couleurs.',true);return;}
  render();notify('✓ Couleurs des sets #20–22 mises à jour. Modifie ensuite leurs ID individuels avec Modifier.');
 }
 function productMaterialRow(rollId='',grams=''){
  return `<div class="usage-line product-material-line"><select class="product-roll" aria-label="Bobine pour ce produit"><option value="">Choisir une bobine…</option>${rollId&&!rolls.some(r=>r.id===rollId||r.code===rollId)?`<option value="${esc(rollId)}" selected>Référence historique : ${esc(rollId)}</option>`:''}${rolls.filter(r=>safeNum(r.remaining)>0||r.id===rollId).map(r=>`<option value="${esc(r.id)}" ${r.id===rollId?'selected':''}>${esc(r.brand)} — ${esc(r.color)} (${esc(r.code||r.id)})</option>`).join('')}</select><input type="number" class="product-grams" aria-label="Grammes par unité" min="0.1" step="0.1" placeholder="Grammes" value="${esc(grams)}"><button type="button" class="secondary-btn product-remove-material" aria-label="Retirer">×</button></div>`;
 }
 // Composants : coût par unité sur la fiche Produit, déduction réelle dans Impressions.
 function hardwareRow(kind,id='',quantity=''){
  const opts=extras.hardware.map(h=>`<option value="${esc(h.id)}" ${h.id===id?'selected':''}>${esc(h.name||h.id)} — ${money(safeNum(h.unitCost))}/pièce (${number(safeNum(h.remaining))} restants)</option>`).join('');
  return `<div class="usage-line hardware-line"><select class="hardware-select" aria-label="Composant"><option value="">Choisir un composant…</option>${opts}</select><input class="hardware-qty" type="number" min="1" step="1" placeholder="Quantité" aria-label="Quantité de composants" value="${esc(quantity)}"><button type="button" class="secondary-btn hardware-remove" aria-label="Retirer ce composant">×</button></div>`;
 }
 function getHardwareLines(container){
  return [...document.querySelectorAll('#'+container+' .hardware-line')].map(el=>({id:el.querySelector('.hardware-select').value,quantity:Number(el.querySelector('.hardware-qty').value),raw:el.querySelector('.hardware-qty').value}));
 }
 function hardwareLinesValid(lines){return lines.every(x=>(!x.id&&!x.raw)||(x.id&&x.raw!==''&&Number.isInteger(x.quantity)&&x.quantity>0&&extras.hardware.some(h=>h.id===x.id)));}
 function hardwareCost(lines){return lines.reduce((total,line)=>total+safeNum(extras.hardware.find(h=>h.id===line.id)?.unitCost)*line.quantity,0);}
 function drawProductHardware(list=[]){document.getElementById('product-hardware-lines').innerHTML=list.length?list.map(x=>hardwareRow('product',x.id,x.quantity)).join(''):hardwareRow('product');}
 function drawPrintHardware(list=[]){document.getElementById('print-hardware-lines').innerHTML=list.length?list.map(x=>hardwareRow('print',x.id,x.quantity)).join(''):hardwareRow('print');}
 function suggestHardwareFromProduct(){
  if(editingPrintId)return;
  const p=extras.products.find(x=>x.id===document.getElementById('print-product').value);
  const qty=Math.max(1,Number(document.getElementById('print-form').elements.namedItem('quantity').value)||1);
  drawPrintHardware((p?.hardware||[]).map(h=>({id:h.id,quantity:safeNum(h.quantity)*qty})));
  updatePrintCreationCost();
 }
 let newProductPhotoDraft=null;
 function productMaterialLines(){return [...document.querySelectorAll('#product-material-lines .product-material-line')].map(line=>({id:line.querySelector('.product-roll').value, grams:Number(line.querySelector('.product-grams').value),raw:line.querySelector('.product-grams').value}));}
 function productMaterialCost(materials){return materials.reduce((sum,m)=>{const r=rolls.find(x=>x.id===m.id||x.code===m.id);return sum+(r&&Number(r.initial)>0?Number(m.grams)*safeNum(r.price)/Number(r.initial):0);},0);}
 function updateProductCost(){
  const f=document.getElementById('product-form');const lines=productMaterialLines().filter(m=>m.id&&m.raw!==''&&m.grams>0);
  const filamentCost=productMaterialCost(lines),hardwarePerUnit=hardwareCost(getHardwareLines('product-hardware-lines').filter(x=>x.id&&x.raw)),otherCost=Number(f.elements.namedItem('otherCost').value)||0,price=Number(f.elements.namedItem('price').value)||0,rate=Number(f.elements.namedItem('commissionRate').value)||0;
  const hours=Number(f.elements.namedItem('hours').value)||0,mins=Number(f.elements.namedItem('mins').value)||0,hourlyRate=Number(f.elements.namedItem('hourlyRate').value)||0;
  const timeCharge=Math.max(0,hours+mins/60)*Math.max(0,hourlyRate);
  const realCosts=filamentCost+hardwarePerUnit+otherCost;
  const commission=price*rate/100,profit=price-realCosts-commission;
  const proposedPrice=rate<100?(realCosts+timeCharge)/(1-rate/100):0;
  document.getElementById('product-cost-preview').innerHTML=`<div><small>Filament / unité</small><strong>${money(filamentCost)}</strong></div><div><small>Hardware / unité</small><strong>${money(hardwarePerUnit)}</strong></div><div><small>Autres coûts / unité</small><strong>${money(otherCost)}</strong></div><div><small>Tarif facturé (${number(hours+mins/60,2)} h × ${money(hourlyRate)}/h)</small><strong>${money(timeCharge)}</strong></div><div><small>Coûts réels / unité (sans tarif horaire)</small><strong>${money(realCosts)}</strong></div><div><small>Prix suggéré incluant le tarif horaire et la commission</small><strong>${rate<100?money(proposedPrice):'Commission à vérifier'}</strong></div><div><small>Prix de vente (modifiable)</small><strong>${money(price)}</strong></div><div><small>Commission estimée</small><strong>${money(commission)}</strong></div><div><small>Montant restant après coûts et commission</small><strong>${money(profit)}</strong></div>`;
 }
 // Menus intelligents : valeurs importées d'Excel + celles ajoutées dans PrintPilot.
 const CHOICE_OTHER='__other__';
 function choiceItems(kind){
  const defaults={
   category:['Porte-clés','Décoration','Figurines','Jouets','Accessoires','Supports','Vases','Autre'],
   colors:['Noir','Blanc','Rouge','Bleu','Vert','Rose','Jaune','Gris','Orange','Mauve','Multicolore'],
   printer:['Anycubic Kobra X','Qidi X-Plus 3','Ender-3 V2 Neo']
  };
  const field=kind==='category'?'category':kind==='colors'?'colors':'printer';
  const values=[...defaults[kind],...extras.products.map(p=>p[field]),...(kind==='colors'?rolls.map(r=>r.color):[]),...(kind==='printer'?prints.map(p=>p.printer):[])];
  const seen=new Set();return values.map(v=>String(v||'').trim()).filter(v=>{const k=v.toLocaleLowerCase('fr');if(!v||seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
 }
 function toggleChoice(select){
  const other=select.closest('label')?.querySelector('[data-choice-other]');if(!other)return;
  other.hidden=select.value!==CHOICE_OTHER;
  other.required=select.value===CHOICE_OTHER;
  if(other.hidden)other.value='';
 }
 function populateChoices(form){
  form.querySelectorAll('select[data-choice]').forEach(select=>{
   const chosen=select.value;const values=choiceItems(select.dataset.choice);
   select.innerHTML='<option value="">Sélectionner…</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__other__">＋ Autre…</option>';
   if(values.includes(chosen))select.value=chosen;else select.value='';
   toggleChoice(select);
  });
 }
 function setChoiceValue(form,name,value){
  const select=form.elements.namedItem(name);if(!select)return;
  const v=String(value||'').trim();if(!v){select.value='';toggleChoice(select);return;}
  if(![...select.options].some(o=>o.value===v)){
   const option=document.createElement('option');option.value=v;option.textContent=v;
   select.insertBefore(option,select.querySelector('option[value="__other__"]'));
  }
  select.value=v;toggleChoice(select);
 }
 function choiceValue(form,field){
  const select=form.elements.namedItem(field);if(!select)return '';
  if(select.value===CHOICE_OTHER)return String(form.querySelector(`[data-choice-other="${field}"]`)?.value||'').trim();
  return String(select.value||'').trim();
 }
 document.querySelectorAll('select[data-choice]').forEach(select=>select.addEventListener('change',()=>toggleChoice(select)));
 function openProduct(shopId=null){
  const p=shopId?extras.products.find(x=>String(x.shopId)===String(shopId)):null;
  const f=document.getElementById('product-form');f.reset();populateChoices(f);newProductPhotoDraft=null;
  document.getElementById('product-form-error').textContent='';document.getElementById('product-dialog-title').textContent=p?'Modifier un produit':'Ajouter un produit';
  const rows=p?.materials?.length?p.materials.map(m=>productMaterialRow(rolls.find(r=>r.id===m.id||r.code===m.id)?.id||m.id,m.grams)).join(''):productMaterialRow();
  document.getElementById('product-material-lines').innerHTML=rows;drawProductHardware(p?.hardware||[]);
  document.getElementById('product-new-photo-preview').replaceChildren();
  if(p){for(const key of ['id','name','category','colors','printer','stock','otherCost','price','commissionRate','notes']){const input=f.elements.namedItem(key);if(input){const value=(key==='commissionRate'?safeNum(p[key])*100:p[key])??'';if(input.matches('select[data-choice]'))setChoiceValue(f,key,value);else input.value=value;}}f.elements.namedItem('originalId').value=p.id;f.elements.namedItem('originalShopId').value=p.shopId;const mins=Math.round(safeNum(p.timeDays)*1440);f.elements.namedItem('hours').value=Math.floor(mins/60);f.elements.namedItem('mins').value=mins%60;f.elements.namedItem('hourlyRate').value=Number.isFinite(Number(p.hourlyRate))&&p.hourlyRate!==undefined?Number(p.hourlyRate):2;getProductPhoto(p).then(photo=>{if(photo&&document.getElementById('product-dialog').open){const img=document.createElement('img');img.src=photo;img.alt='Photo actuelle';document.getElementById('product-new-photo-preview').replaceChildren(img);}});}
  else {f.elements.namedItem('originalId').value='';f.elements.namedItem('originalShopId').value='';f.elements.namedItem('id').placeholder='Généré automatiquement';f.elements.namedItem('commissionRate').value=30;f.elements.namedItem('stock').value='';f.elements.namedItem('hours').value='';f.elements.namedItem('mins').value='';f.elements.namedItem('price').value='';f.elements.namedItem('otherCost').value='';f.elements.namedItem('hourlyRate').value='2';}
  updateProductCost();document.getElementById('product-dialog').showModal();
 }
 let convertingPrintId=null;
 async function createProductFromExistingPrint(id){
  const entry=prints.find(x=>x.id===id&&x.status==='active');if(!entry)return;
  if(entry.productId&&extras.products.some(p=>p.id===entry.productId)){notify('Cette impression est déjà liée à un produit.',true);return;}
  const candidate=extras.products.find(p=>p.name.trim().toLowerCase()===entry.product.trim().toLowerCase());
  if(candidate){
   if(!confirm(`Un produit « ${candidate.name} » existe. Lier cette impression au produit #${candidate.shopId} ? Aucun nouveau filament ne sera déduit.`))return;
   const nextPrints=prints.map(p=>p.id===id?{...p,productId:candidate.id}:p);
   const nextProducts=extras.products.map(p=>p.id===candidate.id?{...p,stock:safeNum(p.stock)+safeNum(entry.quantity),printed:p.source==='Excel'?safeNum(p.printed):safeNum(p.printed)+safeNum(entry.quantity)}:p);
   if(persistWorkshop(rolls,nextPrints,{...extras,products:nextProducts})){render();notify('✓ Impression reliée au produit et unités ajoutées, sans redéduire le filament.');}
   return;
  }
  convertingPrintId=id;openProduct();
  const f=document.getElementById('product-form');f.elements.namedItem('name').value=entry.product;
  setChoiceValue(f,'printer',entry.printer||'');
  f.elements.namedItem('stock').value=String(entry.quantity||1);
  f.elements.namedItem('hours').value=String(Math.floor(safeNum(entry.minutes)/60));f.elements.namedItem('mins').value=String(safeNum(entry.minutes)%60);
  document.getElementById('product-material-lines').innerHTML=entry.usage.map(u=>productMaterialRow(u.rollId,(u.grams/Math.max(1,entry.quantity)).toFixed(3))).join('');drawProductHardware((entry.hardwareUsage||[]).map(h=>({id:h.id,quantity:h.quantity/Math.max(1,entry.quantity)})));
  document.getElementById('product-dialog-title').textContent='Créer le produit depuis cette impression — sans déduire à nouveau';
  const pic=await getPhoto('print:'+id);if(pic&&document.getElementById('product-dialog').open){newProductPhotoDraft=pic;const img=document.createElement('img');img.src=pic;img.alt='Photo de l’impression';document.getElementById('product-new-photo-preview').replaceChildren(img);}
  updateProductCost();
 }
 function saveProduct(event){
  event.preventDefault();const f=event.currentTarget,raw=Object.fromEntries(new FormData(f)),err=document.getElementById('product-form-error');err.textContent='';
  const name=String(raw.name||'').trim(),originalId=String(raw.originalId||''),originalShopId=String(raw.originalShopId||''),id=String(raw.id||'').trim()||originalId||'PROD-'+Date.now().toString(36).toUpperCase(),materialsRaw=productMaterialLines();
  const stock=Number(raw.stock),hours=Number(raw.hours),mins=Number(raw.mins),other=Number(raw.otherCost),price=Number(raw.price),rate=Number(raw.commissionRate),hourlyRate=Number(raw.hourlyRate);
  if(!name||!Number.isInteger(stock)||stock<0||!Number.isInteger(hours)||hours<0||!Number.isInteger(mins)||mins<0||mins>59||![other,price,rate,hourlyRate].every(Number.isFinite)||other<0||price<0||hourlyRate<0||rate<0||rate>100){err.textContent='Vérifie le nom, les durées (minutes 0–59), la quantité, le prix et les coûts.';return;}
  if(extras.products.some(p=>p.id===id&&String(p.shopId)!==originalShopId)){err.textContent='Cet ID est déjà utilisé par une autre variante. Choisis un ID unique.';return;}
  const prev=originalShopId?extras.products.find(p=>String(p.shopId)===originalShopId):null;
  if(originalShopId&&!prev){err.textContent='Produit original introuvable : annulation de la modification pour protéger le stock.';return;}
  if(prev&&id!==originalId){
    const linkedPrints=prints.some(p=>p.productId===originalId);
    const linkedSales=(extras.sales||[]).some(v=>v.productId===originalId);
    const linkedOff=(extras.nonCommercial||[]).some(v=>v.originProductId===originalId);
    if(linkedPrints||linkedSales||linkedOff){err.textContent='Cet ID est utilisé dans une impression, une vente ou un historique. Renommage bloqué pour préserver les liens.';return;}
  }
  if(materialsRaw.some(m=>(m.id&&!m.raw)||(!m.id&&m.raw)||(m.id&&(!Number.isFinite(m.grams)||m.grams<=0)))){err.textContent='Sélectionne une bobine et des grammes positifs pour chaque ligne utilisée.';return;}
  const hardwareRaw=getHardwareLines('product-hardware-lines');if(!hardwareLinesValid(hardwareRaw)){err.textContent='Vérifie le composant et sa quantité entière par unité.';return;}const hardware=hardwareRaw.filter(h=>h.id).map(h=>({id:h.id,quantity:h.quantity}));
  const materials=materialsRaw.filter(m=>m.id&&m.grams>0).map(m=>({id:rolls.find(r=>r.id===m.id)?.code||m.id,grams:m.grams}));
  const unchangedMaterials=prev&&JSON.stringify(materials)===JSON.stringify(prev.materials||[]);const filamentCost=unchangedMaterials?safeNum(prev.filamentCost):productMaterialCost(materials),printTimeCost=(hours+mins/60)*hourlyRate,unitCost=filamentCost+hardwareCost(hardware)+other;
  const row={...prev,id,legacyPhotoId:prev?.legacyPhotoId||prev?.id||id,name,category:choiceValue(f,'category'),colors:choiceValue(f,'colors'),printer:choiceValue(f,'printer'),materials,hardware,grams:materials.reduce((a,m)=>a+m.grams,0),timeDays:(hours*60+mins)/1440,hourlyRate,printTimeCost,pricingModel:'hourly-revenue-v1',filamentCost,otherCost:other,unitCost,stock,price,commissionRate:rate/100,unitProfit:price-unitCost-price*rate/100,notes:String(raw.notes||'').trim(),printed:prev?.printed??0,sold:prev?.sold??0,shopId:prev?.shopId||'',source:prev?.source||'PrintPilot'};
  // Commission en modèle Excel : fraction 0..1. Existing XLSM uses e.g. 0.30.
  const next={...extras,products:ensureShopIds(prev?extras.products.map(p=>String(p.shopId)===originalShopId?row:p):[...extras.products,row])};
  if(convertingPrintId){
   const nextPrints=prints.map(p=>p.id===convertingPrintId?{...p,productId:id}:p);
   if(!persistWorkshop(rolls,nextPrints,next)){err.textContent='Impossible de créer le produit associé.';return;}
  }else if(!persistExtras(next)){err.textContent='Impossible de sauvegarder le produit.';return;}
  convertingPrintId=null;document.getElementById('product-dialog').close();render();notify(prev?'✓ Variante #'+originalShopId+' mise à jour. Stock et filament inchangés.':'✓ Produit créé, impression reliée, catalogue mis à jour. Aucun filament déduit en double.');
  // Le numéro de stock suit la photo malgré les modifications de l'ID descriptif.
  if(newProductPhotoDraft){const image=newProductPhotoDraft;newProductPhotoDraft=null;const saved=next.products.find(p=>p.id===id&&(!prev||String(p.shopId)===originalShopId));if(saved)setPhoto(uniqueProductPhotoKey(saved),image).then(()=>hydratePhotos()).catch(e=>{console.error(e);notify('Produit enregistré, mais photo non synchronisée. Réessaie sur la fiche.',true);});}
 }
 async function selectNewProductPhoto(file){if(!file)return;try{newProductPhotoDraft=await fileToPhoto(file);const img=document.createElement('img');img.src=newProductPhotoDraft;img.alt='Aperçu';document.getElementById('product-new-photo-preview').replaceChildren(img);}catch(e){notify(e.message,true);}}

 function hardwarePage(){const h=extras.hardware;return header('COMPOSANTS','Hardware et fournitures','Ajoute, modifie et surveille tes composants.',`<button type="button" class="primary-btn" id="add-hardware">＋ Ajouter du hardware</button>`)+warning()+`<div class="stats-grid three">${statCard('▣',number(h.length),'Types de composants')}${statCard('◉',number(h.reduce((a,r)=>a+safeNum(r.remaining),0)),'Pièces restantes')}${statCard('⚠',number(h.filter(r=>safeNum(r.remaining)<=safeNum(r.threshold)).length),'Stocks à surveiller')}</div><section class="panel"><div class="panel-head"><div><h2>Inventaire hardware</h2><p>Les changements sont sauvegardés dans ce navigateur.</p></div></div><div class="inventory-card-grid">${h.map(r=>`<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(r.name||'Composant')}</h3><small>${esc(r.id||'')}</small></div><span class="pill ${safeNum(r.remaining)<=safeNum(r.threshold)?'low':'ok'}">${safeNum(r.remaining)<=safeNum(r.threshold)?'Stock faible':'En stock'}</span></div><div class="detail-grid"><div><small>Catégorie</small><strong>${esc(r.category||'—')}</strong></div><div><small>Restant</small><strong>${number(r.remaining)}</strong></div><div><small>Seuil bas</small><strong>${number(r.threshold)}</strong></div><div><small>Coût / pièce</small><strong>${money(r.unitCost)}</strong></div><div><small>Fournisseur</small><strong>${esc(r.supplier||'—')}</strong></div><div><small>Notes</small><strong>${esc(r.notes||'—')}</strong></div></div><div class="actions"><button type="button" class="secondary-btn" data-edit-hardware="${esc(r.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-delete-hardware="${esc(r.id)}">Supprimer</button></div></article>`).join('')||'<p class="empty">Aucun hardware. Clique sur « Ajouter du hardware ».</p>'}</div></section>`;}
 // Les factures payées créent une vente financière unique, sans retirer le stock :
 // une vente manuelle ou un transfert de stock peut déjà l'avoir fait.
 function reconcileInvoiceSales(next){
  const invoices=Array.isArray(next.invoices)?next.invoices:[];
  const existing=Array.isArray(next.sales)?next.sales:[];
  const byId=new Map(invoices.filter(i=>i?.id).map(i=>[String(i.id),i]));
  const generated=new Map(existing.filter(v=>v.invoiceId&&v.source==='JJ3D Facture').map(v=>[String(v.invoiceId),v]));
  const result=existing.filter(v=>!(v.invoiceId&&v.source==='JJ3D Facture'));
  for(const invoice of invoices){
   if(!invoice?.id)continue;
   const old=generated.get(String(invoice.id))||{};
   const lines=Array.isArray(invoice.lines)?invoice.lines:[];
   const subtotal=lines.reduce((a,l)=>a+(Number(l.qty)||0)*(Number(l.price)||0),0);
   const discount=Math.min(subtotal,Math.max(0,Number(invoice.discount)||0));
   const pretax=subtotal-discount+Math.max(0,Number(invoice.shipping)||0);
   // Ventes brutes et marge excluent les taxes perçues pour ne pas les confondre avec du revenu.
   const gross=Math.round(pretax*100)/100;
   const products=Array.isArray(next.products)?next.products:[];
   const cost=lines.reduce((a,l)=>{
    const product=products.find(p=>String(p.id)===String(l.productId||'')&&l.productId);
    return a+(product?Math.max(0,Number(product.unitCost)||0)*(Number(l.qty)||0):0);
   },0);
   const active=invoice.status==='paid';
   const order=Array.isArray(next.customOrders)?next.customOrders.find(o=>o.id===invoice.customOrderId):null;
   const rate=order?.paymentCollector==='boutique'?Math.min(1,Math.max(0,Number(order.boutiqueCommissionPercent||0)/100)):0;
   const fee=Math.round(gross*rate*100)/100;
   if(!active&&!old.id)continue; // une facture brouillon ne crée jamais de vente
   result.push({...old,id:'invoice-sale-'+invoice.id,invoiceId:invoice.id,source:'JJ3D Facture',status:active?'active':'cancelled',date:invoice.paidDate||invoice.date||'',product:lines.map(l=>l.name).filter(Boolean).join(' + ')||'Facture '+(invoice.number||''),productId:'',shopId:'',channel:order?.paymentCollector==='boutique'?'Facture Boutique':'Facture JJ3D',quantity:Math.max(1,lines.reduce((a,l)=>a+(Number(l.qty)||0),0)),unitPrice:gross,commissionRate:rate,gross:active?gross:0,commission:active?fee:0,cost:active?Math.round(cost*100)/100:0,profit:active?Math.round((gross-cost-fee)*100)/100:0,notes:'Facture '+(invoice.number||'')+' · '+(invoice.clientName||'')+(active?' · payée':' · non payée / annulée'),noStockDeduction:true});
  }
  // Entrées historiques dont la facture n'existe plus : conserver une trace annulée.
  for(const [id,sale] of generated){if(!byId.has(id))result.push({...sale,status:'cancelled',gross:0,profit:0,cost:0});}
  return {...next,sales:result};
 }
 function persistExtras(next){backupBeforeChange();try{next=reconcileInvoiceSales(next);const str=JSON.stringify(next);localStorage.setItem(EXTRA_KEY,str);if(localStorage.getItem(EXTRA_KEY)!==str)throw Error('Échec de vérification');extras=next;queueMicrotask(()=>window.dispatchEvent(new Event('printpilot:changed')));return true;}catch(e){console.error('Sauvegarde hardware:',e);notify('Impossible de sauvegarder le hardware.',true);return false;}}
 function openHardware(id){const r=id?extras.hardware.find(x=>x.id===id):null;const f=document.getElementById('hardware-form');f.reset();document.getElementById('hardware-error').textContent='';document.getElementById('hardware-dialog-title').textContent=r?'Modifier du hardware':'Ajouter du hardware';if(r){for(const [k,v] of Object.entries(r)){const inp=f.elements.namedItem(k);if(inp)inp.value=v??'';}f.elements.namedItem('originalId').value=r.id;}else{f.elements.namedItem('originalId').value='';f.elements.namedItem('initial').value='1';f.elements.namedItem('remaining').value='1';f.elements.namedItem('threshold').value='5';f.elements.namedItem('unitCost').value='0';}document.getElementById('hardware-dialog').showModal();}
 function saveHardware(e){e.preventDefault();const f=e.currentTarget;const data=Object.fromEntries(new FormData(f));const originalId=data.originalId;const id=data.id.trim();const row={...(extras.hardware.find(r=>r.id===originalId)||{}),id,name:data.name.trim(),category:data.category.trim(),initial:Number(data.initial),remaining:Number(data.remaining),threshold:Number(data.threshold),unitCost:Number(data.unitCost),supplier:data.supplier.trim(),notes:data.notes.trim()};const err=document.getElementById('hardware-error');if(!id||!row.name||!Number.isFinite(row.initial)||row.initial<0||!Number.isFinite(row.remaining)||row.remaining<0||!Number.isFinite(row.threshold)||row.threshold<0||!Number.isFinite(row.unitCost)||row.unitCost<0){err.textContent='Vérifie le nom, la référence et les valeurs numériques (0 ou plus).';return;}if(extras.hardware.some(r=>r.id===id&&r.id!==originalId)){err.textContent='Cet ID existe déjà : choisis une référence unique.';return;}const next={...extras,hardware:originalId?extras.hardware.map(r=>r.id===originalId?row:r):[...extras.hardware,row]};if(!persistExtras(next))return;document.getElementById('hardware-dialog').close();render();notify('✓ Hardware enregistré.');}
 function deleteHardware(id){const r=extras.hardware.find(x=>x.id===id);if(!r||!confirm(`Supprimer ${r.name} (${id}) ?`))return;const next={...extras,hardware:extras.hardware.filter(x=>x.id!==id)};if(persistExtras(next)){render();notify('Hardware supprimé.');}}

 // Chaque vente nouvelle porte un ID immutable; les ventes Excel restent historiques et non modifiables.
 function activeSales(){return extras.sales.filter(s=>!['cancelled','duplicate'].includes(s.status));}
 function salePrice(s){return safeNum(s.unitPrice);}
 function saleSummary(s){return {gross:activeSales().reduce((a,v)=>a+safeNum(v.gross),0),profit:activeSales().reduce((a,v)=>a+safeNum(v.profit),0)};}
 function salesPage(){
  const sales=extras.sales.slice().reverse(), active=activeSales(), gross=active.reduce((a,v)=>a+safeNum(v.gross),0), commission=active.reduce((a,v)=>a+safeNum(v.commission),0), profit=active.reduce((a,v)=>a+safeNum(v.profit),0);
  return header('VENTES','Ventes et commandes','Enregistre chaque vente, suis tes profits et ajuste automatiquement ton stock.',`<button type="button" class="primary-btn" id="add-sale">＋ Enregistrer une vente</button>`)+warning()
   +`<div class="notice">ⓘ &nbsp; Une vente enregistrée ici retire la <b>quantité vendue du stock de produits</b>, mais ne retire pas de filament une deuxième fois. Les anciennes ventes Excel restent en lecture seule; leur stock a déjà été comptabilisé.</div>`
   +`<div class="stats-grid three">${statCard('▣',number(active.length),'Ventes actives')}${statCard('$',money(gross),'Chiffre d’affaires')}${statCard('↗',money(profit),'Profit estimé')}</div>`
   +`<section class="panel"><div class="panel-head"><div><h2>Journal des ventes</h2><p>${number(commission,2)} $ de commissions · ${number(active.reduce((a,v)=>a+safeNum(v.quantity),0))} unités vendues</p></div><input id="sales-search" class="table-filter" type="search" placeholder="Produit, ID, canal…"></div><div id="sales-results">${salesCards('')}</div></section>`;
 }
 function salesCards(query=''){
  const q=String(query).trim().toLowerCase();const records=extras.sales.slice().reverse().filter(v=>v.source!=='JJ3D Facture'||v.status==='active').filter(v=>[v.product,v.productId,v.shopId,v.channel,v.notes,v.date].join(' ').toLowerCase().includes(q));
  if(!records.length)return '<p class="empty">Aucune vente. Clique sur « Enregistrer une vente » pour commencer.</p>';
  return `<div class="inventory-card-grid">${records.map(v=>{const editable=Boolean(v.id&&String(v.id).startsWith('sale-'));const canceled=v.status==='cancelled';const linkedInvoice=v.source==='JJ3D Facture';return `<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(v.product||'Produit')}</h3><small>${esc(v.date||'Date Excel non précisée')} · ${esc(v.channel||'Autre')} · ${v.shopId?'ID #'+esc(v.shopId):'Vente Excel'}</small></div><span class="pill ${canceled?'low':'ok'}">${canceled?'Annulée':(linkedInvoice?'Facture payée':editable?'Enregistrée':'Excel')}</span></div><div class="detail-grid"><div><small>Quantité</small><strong>${number(v.quantity)}</strong></div><div><small>Prix unitaire</small><strong>${money(v.unitPrice)}</strong></div><div><small>Vente brute</small><strong>${money(v.gross)}</strong></div><div><small>Commission</small><strong>${money(v.commission)}</strong></div><div><small>Coût total</small><strong>${money(v.cost)}</strong></div><div><small>Profit estimé</small><strong>${money(v.profit)}</strong></div></div>${v.notes?`<p class="small-hint">${esc(v.notes)}</p>`:''}${editable&&!canceled?`<div class="actions"><button type="button" class="secondary-btn" data-edit-sale="${esc(v.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-cancel-sale="${esc(v.id)}">Annuler / remettre le stock</button></div>`:''}</article>`}).join('')}</div>`;
 }
 function openSale(id=null, preselect=null){
  const prev=id?extras.sales.find(s=>s.id===id&&s.status!=='cancelled'):null;
  if(id&&!prev)return;
  if(!extras.products.length){notify('Importe d’abord tes produits pour enregistrer une vente.',true);return;}
  const f=document.getElementById('sale-form');f.reset();document.getElementById('sale-error').textContent='';document.getElementById('sale-title').textContent=prev?'Modifier la vente':'Enregistrer une vente';
  f.elements.namedItem('saleId').value=prev?.id||'';
  const select=f.elements.namedItem('productId');select.innerHTML='<option value="">Choisir un produit…</option>'+commercialProducts().map(p=>`<option value="${esc(p.id)}">#${esc(p.shopId)} · ${esc(p.name)} · ${esc(p.colors||'')} (${number(p.stock)} en stock)</option>`).join('');
  f.elements.namedItem('date').value=prev?.date||(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})();
  f.elements.namedItem('productId').value=prev?.productId||preselect||'';
  f.elements.namedItem('quantity').value=prev?.quantity||1;
  f.elements.namedItem('channel').value=prev?.channel||'Boutique';
  f.elements.namedItem('unitPrice').value=prev?prev.unitPrice:0;
  f.elements.namedItem('commissionRate').value=prev?Number(prev.commissionRate||0)*100:30;
  f.elements.namedItem('notes').value=prev?.notes||'';
  updateSaleProduct(!prev);updateSaleChannel(!prev);updateSalePreview();
  document.getElementById('sale-dialog').showModal();
 }
 function updateSaleProduct(resetPrice){const f=document.getElementById('sale-form'),id=f.elements.namedItem('productId').value,p=extras.products.find(x=>String(x.id)===id),prev=extras.sales.find(x=>x.id===f.elements.namedItem('saleId').value);
  if(resetPrice&&p)f.elements.namedItem('unitPrice').value=Number(safeNum(p.price).toFixed(2));
  document.getElementById('sale-product-summary').textContent=p?`ID stock #${p.shopId} · ID Excel : ${p.id} · En stock : ${number(p.stock)}${prev&&prev.productId===p.id?' (plus '+prev.quantity+' unité(s) récupérable(s) en modification)':''} · Coût unitaire estimé : ${money(p.unitCost)}`:'Choisis un produit du catalogue pour utiliser son stock et son coût.';
  updateSalePreview();
 }
 function updateSaleChannel(resetRate){const f=document.getElementById('sale-form');if(resetRate)f.elements.namedItem('commissionRate').value=f.elements.namedItem('channel').value==='Boutique'?'30':'0';updateSalePreview();}
 function updateSalePreview(){const f=document.getElementById('sale-form'),p=extras.products.find(x=>String(x.id)===f.elements.namedItem('productId').value);const qty=Number(f.elements.namedItem('quantity').value)||0,price=Number(f.elements.namedItem('unitPrice').value)||0,rate=Number(f.elements.namedItem('commissionRate').value)||0;const gross=qty*price,fee=gross*rate/100,cost=qty*safeNum(p?.unitCost);document.getElementById('sale-preview').textContent=`Vente : ${money(gross)} · Commission : ${money(fee)} · Coût : ${money(cost)} · Profit estimé : ${money(gross-fee-cost)}`;}
 function saveSale(e){e.preventDefault();const f=e.currentTarget,data=Object.fromEntries(new FormData(f).entries()),err=document.getElementById('sale-error');err.textContent='';const p=extras.products.find(x=>String(x.id)===data.productId),old=data.saleId?extras.sales.find(x=>x.id===data.saleId&&x.status!=='cancelled'):null;const qty=Number(data.quantity),price=Number(data.unitPrice),rate=Number(data.commissionRate);
  if(!p){err.textContent='Choisis un produit existant.';return;}
  if(!/^\d{4}-\d\d-\d\d$/.test(data.date)){err.textContent='Date invalide.';return;}
  if(!Number.isInteger(qty)||qty<1||!Number.isFinite(price)||price<0||!Number.isFinite(rate)||rate<0||rate>100){err.textContent='Quantité, prix ou commission invalide.';return;}
  const nextProducts=extras.products.map(x=>({...x}));
  if(old){const original=nextProducts.find(x=>x.id===old.productId);if(!original){err.textContent='Le produit de la vente précédente est introuvable.';return;}original.stock=safeNum(original.stock)+safeNum(old.quantity);}
  const target=nextProducts.find(x=>x.id===p.id);if(safeNum(target.stock)<qty){err.textContent=`Stock insuffisant : ${number(target.stock)} unité(s) disponibles.`;return;}
  target.stock=safeNum(target.stock)-qty;
  const gross=+(qty*price).toFixed(2),commission=+(gross*rate/100).toFixed(2),cost=+(qty*safeNum(p.unitCost)).toFixed(2);
  const sale={id:old?.id||'sale-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date:data.date,productId:p.id,shopId:p.shopId,product:p.name,channel:data.channel,quantity:qty,unitPrice:price,commissionRate:rate/100,gross,commission,cost,profit:+(gross-commission-cost).toFixed(2),notes:String(data.notes||'').trim(),status:'active',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  const nextSales=old?extras.sales.map(x=>x.id===old.id?sale:x):[...extras.sales,sale];
  if(!persistExtras({...extras,products:nextProducts,sales:nextSales})){err.textContent='Enregistrement impossible. Aucun stock modifié.';return;}
  document.getElementById('sale-dialog').close();render();notify('✓ Vente enregistrée et stock produit mis à jour.');
 }
 function cancelSale(id){const old=extras.sales.find(x=>x.id===id&&x.status==='active');if(!old)return;if(!confirm(`Annuler la vente de ${old.quantity} × ${old.product} et remettre les unités dans le stock?`))return;
  const products=extras.products.map(x=>({...x})),p=products.find(x=>x.id===old.productId);if(!p){notify('Produit original introuvable : annulation impossible.',true);return;}
  p.stock=safeNum(p.stock)+safeNum(old.quantity);const sales=extras.sales.map(x=>x.id===id?{...x,status:'cancelled',cancelledAt:new Date().toISOString()}:x);
  if(persistExtras({...extras,products,sales})){render();notify('✓ Vente annulée et stock produit rétabli.');}
 }
 function loadExtras(){try{const raw=localStorage.getItem(EXTRA_KEY);const obj=raw?JSON.parse(raw):{};extras={products:ensureShopIds(Array.isArray(obj.products)?obj.products:[]),hardware:Array.isArray(obj.hardware)?obj.hardware:[],sales:Array.isArray(obj.sales)?obj.sales:[],nonCommercial:Array.isArray(obj.nonCommercial)?obj.nonCommercial:[],printers:Array.isArray(obj.printers)?obj.printers:[],invoices:Array.isArray(obj.invoices)?obj.invoices:[],stockSlips:Array.isArray(obj.stockSlips)?obj.stockSlips:[],invoiceSettings:obj.invoiceSettings&&typeof obj.invoiceSettings==='object'?obj.invoiceSettings:{},packingSlips:Array.isArray(obj.packingSlips)?obj.packingSlips:[],customOrders:Array.isArray(obj.customOrders)?obj.customOrders:[]};if(JSON.stringify(extras.products)!==JSON.stringify(obj.products||[])){try{localStorage.setItem(EXTRA_KEY,JSON.stringify(extras));}catch(e){console.warn('IDs numériques non persistés:',e);}}}catch(e){console.error('Extras invalides:',e);extras={products:[],hardware:[],sales:[],nonCommercial:[],printers:[],invoices:[],stockSlips:[],invoiceSettings:{},packingSlips:[],customOrders:[]};}}
 // Les produits importés du classeur représentent une production historique agrégée.
 // Ces chiffres sont affichés dans les stats, JAMAIS ajoutés au journal transactionnel
 // et JAMAIS déduits à nouveau de l'inventaire des bobines.
 function excelProductionMetrics(){
  // Inventaire canonique : les produits Excel et les produits PrintPilot sont comptabilisés une seule fois.
  const historic=extras.products;
  return historic.reduce((total,p)=>{
   const quantity=Math.max(0,Math.floor(safeNum(p.printed)));
   total.units+=quantity;
   // Dans le classeur, `grams` correspond au poids unitaire du produit.
   total.grams+=Math.max(0,safeNum(p.grams))*quantity;
   // Conformément au Dashboard Excel : la durée est par unité.
   // La feuille Excel calcule SUMPRODUCT(temps d'impression, quantité imprimée).
   // Le stockage des bobines reste inchangé : ces heures sont une statistique, pas une transaction.
   total.minutes+=Math.max(0,safeNum(p.timeDays))*24*60*quantity;
   return total;
  },{units:0,grams:0,minutes:0});
 }
 function combinedProductionMetrics(){
  const historic=excelProductionMetrics();
  // Les impressions rattachées à un produit sont déjà comptées dans p.printed.
  // On additionne uniquement les impressions sans fiche produit.
  const current=prints.filter(p=>p.status==='active' && !extras.products.some(product=>product.id===p.productId));
  const recent={units:current.reduce((a,p)=>a+Math.max(1,safeNum(p.quantity)),0),grams:current.reduce((a,p)=>a+p.usage.reduce((b,u)=>b+safeNum(u.grams),0),0),minutes:current.reduce((a,p)=>a+safeNum(p.minutes)*Math.max(1,safeNum(p.quantity)),0)};
  return {historic,recent,units:historic.units+recent.units,grams:historic.grams+recent.grams,minutes:historic.minutes+recent.minutes};
 }
 // Une entrée hors production provenant de l'Excel est déjà déduite en poids.
 // Les événements nouveaux sont débités exactement une fois et restent hors catalogue.
 function offEntries(){return Array.isArray(extras.nonCommercial)?extras.nonCommercial:[];}
 function offMetrics(){
  const items=offEntries();
  const kinds=items.reduce((o,e)=>{const k=e.kind||'failed';o[k]=(o[k]||0)+safeNum(e.minutes);return o;},{});
  return {items:items.length,minutes:items.reduce((a,e)=>a+safeNum(e.minutes),0),grams:items.reduce((a,e)=>a+(e.usage||[]).reduce((b,u)=>b+safeNum(u.grams),0),0),kinds};
 }
 function humanDuration(minutes){
  const total=Math.round(Math.max(0,safeNum(minutes)));
  return `${number(Math.floor(total/60))} h ${String(total%60).padStart(2,'0')} min`;
 }
 // Format horloge explicite, pas des heures décimales (3:10 h = 3 h 10).
 function clockDuration(minutes){
  const total=Math.round(Math.max(0,safeNum(minutes)));
  return `${number(Math.floor(total/60))}:${String(total%60).padStart(2,'0')} h`;
 }
 function dashboardAnalytics(){
  const m=metrics(),prods=commercialProducts(),sales=activeSales(),prod=combinedProductionMetrics();
  const retail=prods.reduce((sum,p)=>sum+Math.max(0,safeNum(p.stock))*Math.max(0,safeNum(p.price)),0);
  const productionCost=prods.reduce((sum,p)=>sum+Math.max(0,safeNum(p.stock))*Math.max(0,safeNum(p.unitCost)),0);
  const remainingFilamentValue=rolls.reduce((sum,r)=>sum+(safeNum(r.initial)>0?Math.max(0,safeNum(r.remaining))/safeNum(r.initial)*Math.max(0,safeNum(r.price)):0),0);
  const gross=sales.reduce((sum,v)=>sum+safeNum(v.gross),0);
  const commission=sales.reduce((sum,v)=>sum+safeNum(v.commission),0);
  const profit=sales.reduce((sum,v)=>sum+safeNum(v.profit),0);
  const sold=sales.reduce((sum,v)=>sum+Math.max(0,safeNum(v.quantity)),0);
  const categoryNames=new Set(prods.map(p=>String(p.category||'').trim().toLocaleLowerCase('fr')).filter(Boolean));
  const uniqueNames=new Set(prods.map(p=>String(p.name||'').trim().toLocaleLowerCase('fr')).filter(Boolean));
  return {m,prod,retail,productionCost,remainingFilamentValue,gross,commission,profit,sold,
   uniqueProducts:uniqueNames.size,categories:categoryNames.size,
   productsOut:prods.filter(p=>safeNum(p.stock)<=0).length,
   productStock:prods.reduce((sum,p)=>sum+Math.max(0,safeNum(p.stock)),0),
   products:prods.length,transactions:sales.length,
   availableFilamentPercent:m.initial>0?m.grams/m.initial*100:0,
   potentialMargin:retail-productionCost,
   usedFilament:m.initial-m.grams};
 }
 function dashGroup(title,description,cards){return `<section class="pp-dash-section"><div class="pp-dash-section-head"><h2>${esc(title)}</h2><p>${esc(description)}</p></div><div class="pp-dash-kpis">${cards.map(c=>statCard(c[0],c[1],c[2])).join('')}</div></section>`;}
 function dashboard(){
  const d=dashboardAnalytics(),m=d.m,p=d.prod;
  const stockDescription='Stock invendu = unités disponibles × prix actuel. Production totale = unités fabriquées × prix actuel (valeur théorique). Ventes = montants réellement enregistrés, indépendants du stock.';
  return header('VUE D’ENSEMBLE','Tableau de bord','Statistiques de ton atelier — calculs comparables à ton Excel.',importButton())
  +warning()+(()=>{const open=customOrders().filter(x=>!['delivered','cancelled'].includes(x.status));const urgent=open.filter(x=>x.dueAt&&x.dueAt<=new Date(Date.now()+3*86400000).toLocaleDateString('en-CA'));return open.length?`<section class="panel jj-order-reminder"><h2>📝 ${open.length} commande(s) personnalisée(s) à suivre${urgent.length?' · ⚠ '+urgent.length+' proche(s) de la date souhaitée':''}</h2><p>Tu as ${open.length} commande(s) non terminée(s). ${urgent.length?'Vérifie les échéances proches!':''}</p><button type="button" class="primary-btn" data-go="commandes-perso">Voir mes commandes</button></section>`:'';})()
  +(rolls.length?'<div class="notice">ⓘ &nbsp; Chiffres calculés depuis les données actuelles de PrintPilot (locales ou Firebase). Ton ancien Excel reste un instantané et peut différer après des nouvelles impressions ou ventes.</div>':excelNotice())
  +dashGroup('Production','Historique Excel + impressions ajoutées dans PrintPilot. La durée Excel est multipliée par la quantité imprimée.',[
   ['◷',clockDuration(p.minutes),'Temps de production réussie'],
   ['⚠',clockDuration(offMetrics().minutes),'Temps personnel / échecs / tests'],
   ['◉',clockDuration(p.minutes+offMetrics().minutes),'Temps global (production + hors production)'],
   ['▤',number(prints.filter(entry=>entry.status==='active').length),'Sessions enregistrées sur le site'],
   ['◉',number(p.grams/1000,2)+' kg','Filament consommé estimé'],
   ['▣',number(p.units),'Unités fabriquées au total']])
  +`<div class="pp-dash-explain">⏱ <b>Réconciliation des durées :</b> Excel historique : ${clockDuration(p.historic.minutes)}; nouvelles impressions : ${clockDuration(p.recent.minutes)}. Total : <b>${clockDuration(p.minutes)}</b>. Le calcul historique suit la formule de ton Excel (durée unitaire × nombre d’unités), sans déduire de filament supplémentaire. Hors production : ${clockDuration(offMetrics().minutes)} (dont échecs/tests ${clockDuration((offMetrics().kinds.failed||0)+(offMetrics().kinds.test||0))}, personnel ${clockDuration(offMetrics().kinds.personal||0)}).</div>`
  +dashGroup('Produits et valeur du stock',stockDescription,[
   ['$',money(d.retail),'Valeur du stock invendu (prix de vente)'],
   ['▣',money(commercialProducts().reduce((total,product)=>total+Math.max(0,safeNum(product.printed),Math.max(0,safeNum(product.stock))+Math.max(0,safeNum(product.sold)))*Math.max(0,safeNum(product.price)),0)),'Valeur théorique de toute la production'],
   ['↗',money(d.gross),'Revenus enregistrés des ventes'],
   ['▣',money(d.productionCost),'Coût de fabrication du stock'],
   ['⬡',number(d.productStock),'Unités disponibles'],
   ['↗',money(d.potentialMargin),'Écart théorique vente − fabrication'],
   ['◈',number(d.products),'Variantes de produits'],
   ['◉',number(d.uniqueProducts),'Modèles distincts'],
   ['⚠',number(d.productsOut),'Variantes en rupture'],
   ['▤',number(d.categories),'Catégories']])
  +dashGroup('Filaments','Le prix payé pour les bobines entières est différent de la valeur du filament restant.',[
   ['◉',number(m.grams/1000,2)+' kg','Filament restant'],
   ['$',money(d.remainingFilamentValue),'Valeur estimée du filament restant'],
   ['▣',money(m.cost),'Total payé pour les bobines'],
   ['◷',number(d.availableFilamentPercent,1)+' %','Poids initial encore disponible'],
   ['⬡',number(m.count),'Bobines enregistrées'],
   ['⚠',number(m.low),'Bobines sous 200 g'],
   ['◈',number(m.initial/1000,2)+' kg','Poids initial des bobines'],
   ['▤',number(d.usedFilament/1000,2)+' kg','Poids utilisé selon le stock']])
  +dashGroup('Ventes','Transactions enregistrées (annulations exclues). Les profits sont ceux du journal de ventes.',[
   ['$',money(d.gross),'Ventes brutes'],
   ['↗',money(d.profit),'Profit des ventes'],
   ['▣',money(d.commission),'Commissions'],
   ['◉',number(d.sold),'Unités vendues'],
   ['▤',number(d.transactions),'Transactions'],
   ['◷',d.gross>0?number(d.profit/d.gross*100,1)+' %':'—','Marge constatée']])
  +`<div class="dash-grid"><section class="panel"><div class="panel-head"><div><h2>Stock par matériau</h2><p>Poids restant de tes bobines</p></div></div>${materialChart()}</section><section class="panel"><div class="panel-head"><div><h2>Actions rapides</h2><p>Pour gérer l’atelier</p></div></div><div class="quick-actions"><button type="button" data-go="filaments">◉ &nbsp; Filaments <span>→</span></button><button type="button" data-go="produits">⬡ &nbsp; Produits <span>→</span></button><button type="button" data-go="impressions">▤ &nbsp; Impressions <span>→</span></button><button type="button" data-go="horsproduction">⚠ &nbsp; Personnel / Échecs / Tests <span>→</span></button><button type="button" data-go="finances">$ &nbsp; Finances <span>→</span></button></div></section></div>`
  +`<section class="panel recent"><div class="panel-head"><div><h2>Derniers filaments ajoutés</h2><p>Bobines de ton inventaire</p></div><button type="button" class="link-btn" data-go="filaments">Voir les bobines →</button></div>${rolls.length?`<div class="table-wrap"><table><thead><tr><th>ROULEAU</th><th>MATÉRIAU</th><th>RESTANT</th></tr></thead><tbody>${rolls.slice(-5).reverse().map(r=>`<tr><td><i class="dot" style="background:${safeColor(r.swatch)}"></i>${esc(r.brand)} — ${esc(r.color)}</td><td>${esc(r.material)}</td><td>${number(r.remaining)} g</td></tr>`).join('')}</tbody></table></div>`:`<p class="empty">Aucun filament enregistré.</p>`}</section>`;
 }
 function materialChart(){const totals={};rolls.forEach(r=>{const mat=String(r.material||'Autre');totals[mat]=(totals[mat]||0)+Number(r.remaining)});const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...entries.map(x=>x[1]));return entries.length?`<div class="bars">${entries.map(([name,value])=>`<div class="bar-row"><b>${esc(name)}</b><div class="bar-track"><span style="width:${Math.round(value/max*100)}%"></span></div><strong>${number(value/1000,2)} kg</strong></div>`).join('')}</div>`:'<p class="empty">Le graphique apparaîtra dès que tu ajouteras un rouleau.</p>';}
 function tableRows(){const filtered=rolls.filter(r=>safeNum(r.remaining)>0).filter(r=>`${r.brand} ${r.color} ${r.material} ${r.code||''}`.toLowerCase().includes(search.toLowerCase()));if(!filtered.length)return `<div class="empty">${rolls.length?'Aucun résultat pour cette recherche.':'Aucun rouleau enregistré. Clique sur « Ajouter un rouleau » pour commencer.'}</div>`;return `<div class="table-wrap"><table><thead><tr><th>FILAMENT</th><th>TYPE</th><th>RESTANT</th><th>PRIX</th><th>ÉTAT</th><th>ACTIONS</th></tr></thead><tbody>${filtered.map(r=>{const p=Math.round(Number(r.remaining)/Number(r.initial)*100);return `<tr data-roll-row="${esc(r.id)}"><td><i class="dot" style="background:${safeColor(r.swatch)}"></i><b>${esc(r.brand)} — ${esc(r.color)}</b><small class="code">${esc(r.code||'')}</small></td><td>${esc(r.material)}</td><td><b>${number(r.remaining)} / ${number(r.initial)} g</b><div class="progress"><span style="width:${p}%"></span></div></td><td>${money(r.price||0)}</td><td><span class="pill ${Number(r.remaining)<200?'low':'ok'}">${Number(r.remaining)<200?'Stock faible':'OK'}</span></td><td class="actions"><button type="button" class="secondary-btn" data-edit="${esc(r.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-delete="${esc(r.id)}">Supprimer</button></td></tr>`}).join('')}</tbody></table></div>`;}
 function filaments(){const m=metrics();const emptyRolls=rolls.filter(r=>safeNum(r.remaining)<=0);return header('INVENTAIRE','Mes filaments','Ajoute et gère tes rouleaux. Données enregistrées dans ce navigateur.',`<div class="header-actions"><button type="button" id="add-roll" class="primary-btn">＋ Ajouter un rouleau</button>${importButton()}</div>`)+warning()+`<div class="notice">ⓘ &nbsp; Version locale : les données ne sont pas encore synchronisées avec ton téléphone. Évite toute donnée professionnelle ou sensible.</div><div class="stats-grid three">${statCard('◉',number(m.count),'Rouleaux')}${statCard('▥',number(m.grams/1000,2)+' kg','Poids restant')}${statCard('⚠',number(m.low),'Stock faible : moins de 200 g')}</div><section class="panel"><div class="panel-head inventory-title"><div><h2>Inventaire</h2><p>Modifie ou supprime tes rouleaux à droite.</p></div><div class="inventory-tools"><input type="search" id="roll-search" placeholder="Rechercher un rouleau…" value="${esc(search)}" aria-label="Rechercher un rouleau"><button type="button" class="secondary-btn" id="export-json">Exporter JSON</button></div></div><div id="inventory-rows">${tableRows()}</div></section><section class="panel"><div class="panel-head"><div><h2>Bobines vides (${emptyRolls.length})</h2><p>Historique conservé. Les bobines à 0 g ne sont plus proposées pour les nouvelles impressions.</p></div></div>${emptyRolls.length?`<div class="inventory-card-grid">${emptyRolls.map(r=>`<div class="inventory-card"><h3>${esc(r.brand)} — ${esc(r.color)}</h3><small>${esc(r.code||r.id)}</small><p>0 g restant · ${esc(r.material)}</p><button type="button" class="secondary-btn" data-edit="${esc(r.id)}">Modifier / réapprovisionner</button></div>`).join('')}</div>`:'<p class="empty">Aucune bobine vide.</p>'}</section>`;}

 function printPage(){const active=prints.filter(p=>p.status==='active');const grams=active.reduce((a,p)=>a+p.usage.reduce((b,u)=>b+Number(u.grams),0),0);const mins=active.reduce((a,p)=>a+Number(p.minutes||0),0);const production=combinedProductionMetrics();
  const rows=prints.slice().reverse().map(p=>{const used=p.usage.map(u=>{const r=rolls.find(x=>x.id===u.rollId);return esc(r?(r.brand+' — '+r.color):(u.label||u.rollId))+' · '+number(u.grams,1)+' g'}).join('<br>');return `<tr><td><div class="print-product-cell">${thumb(p.id)}<div><b>${esc(p.product||'Impression libre')}</b><small class="code">${esc(p.date||'')} · ${esc(p.printer||'—')}</small><small class="code">${esc(p.id)}</small></div></div></td><td>${number(p.quantity||1)}</td><td>${used}</td><td>${number(p.usage.reduce((a,u)=>a+Number(u.grams),0),1)} g</td><td>${clockDuration(p.minutes||0)}</td><td><span class="pill ${p.status==='active'?'ok':'low'}">${p.status==='active'?'Enregistrée':p.status==='noncommercial'?'Hors production':'Annulée'}</span></td><td>${p.status==='active'?`<div class="actions"><button type="button" class="secondary-btn" data-edit-print="${esc(p.id)}">Modifier</button>${!p.productId?`<button type="button" class="secondary-btn" data-convert-print="${esc(p.id)}">📦 Créer la fiche Produit</button>`:""}<button type="button" class="secondary-btn danger" data-move-print-off="${esc(p.id)}">⚠ Déplacer hors production</button><button type="button" class="secondary-btn danger" data-cancel-print="${esc(p.id)}">Annuler</button></div>`:'—'}</td></tr>`}).join('');
  return header('PRODUCTION','Mes impressions','Une seule saisie : crée ton produit au besoin, déduis les bobines et ajoute les unités au catalogue.',`<div class="header-actions"><button type="button" class="primary-btn" id="add-print">＋ Ajouter une impression terminée</button></div>`)+warning()+`<div class="notice">ⓘ &nbsp; L’enregistrement déduit immédiatement les grammes indiqués de chaque bobine. Une annulation remet ces grammes dans le stock. Les anciennes impressions sont conservées dans l’historique.</div><div class="stats-grid three">${statCard('▤',number(production.units),'Unités produites (Excel + nouvelles)')}${statCard('◉',number(production.grams,1)+' g','Filament consommé (historique + nouveau)')}${statCard('◷',clockDuration(production.minutes),'Temps de production équivalent')}</div><div class="notice">📄 &nbsp; <b>Production des fiches (Excel + PrintPilot) :</b> ${number(production.historic.units)} unités · ${number(production.historic.grams,1)} g estimés · ${clockDuration(production.historic.minutes)} recensées. &nbsp; <b>Sessions enregistrées sur le site :</b> ${number(active.length)} (avec ou sans fiche produit) · ${number(grams,1)} g · ${clockDuration(mins)}. Les impressions liées à une fiche ne sont pas ajoutées deux fois. <b>Le stock historique n’est jamais déduit une deuxième fois.</b></div><section class="panel"><div class="panel-head"><div><h2>Historique des impressions</h2><p>${prints.length} entrée(s), annulations incluses</p></div><div class="pp-history-tools"><input id="print-history-search" class="table-filter" type="search" placeholder="Rechercher une impression, une bobine, une date…" aria-label="Rechercher les impressions terminées"><button class="secondary-btn" id="export-full" type="button">Exporter une sauvegarde</button><button class="secondary-btn" id="apply-reconciliation" type="button">Appliquer correction d’inventaire</button></div></div>${rows?`<div class="table-wrap"><table id="print-history-table"><thead><tr><th>PRODUIT / DATE</th><th>QTÉ</th><th>BOBINES UTILISÉES</th><th>CONSOMMATION</th><th>DURÉE</th><th>STATUT</th><th>ACTION</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="empty">Aucune impression enregistrée. Clique sur « Nouvelle impression » pour commencer.</p>'}</section><section class="panel"><div class="panel-head"><div><h2>Historique de production Excel — détails des filaments</h2><p>${extras.products.length} variantes disponibles comme références pour tes impressions. L’historique Excel est déjà reflété dans le stock : aucune déduction supplémentaire.</p></div><input id="print-catalog-search" type="search" class="table-filter" placeholder="Rechercher nom ou ID…" aria-label="Rechercher dans les produits Excel"></div>${filterToolbar('impressions')}<div id="print-catalog-results">${printCatalogRows('')}</div></section>`;
 }
 // Les matériaux du classeur sont des références historiques, par unité, sans nouveau débit de stock.
 function excelMaterials(p){
  const rows=Array.isArray(p.materials)?p.materials:[];
  if(!rows.length)return '<span class="muted">Non renseigné dans Excel</span>';
  return rows.map(m=>{const r=rolls.find(x=>x.id===m.id || x.code===m.id);
   const label=r?`${r.brand} — ${r.color}`:m.id;
   return `<div class="material-item"><strong>${esc(label)}</strong><small>${number(safeNum(m.grams),2)} g / unité · ${esc(m.id)}</small></div>`;
  }).join('');
 }
 function excelUsageTotal(p){return (Array.isArray(p.materials)?p.materials:[]).reduce((a,m)=>a+safeNum(m.grams),0);}
 function suggestExcelUsage(p){
  const lines=document.getElementById('usage-lines');
  const rows=Array.isArray(p?.materials)?p.materials.filter(m=>safeNum(m.grams)>0):[];
  const box=document.getElementById('usage-excel-hint');
  if(!rows.length){lines.innerHTML=usageRow();box.textContent=p?'Aucune bobine détaillée dans Excel : choisis-la manuellement.':'';return;}
  const qty=Math.max(1,Number(document.getElementById('print-form').elements.namedItem('quantity').value)||1);
  lines.innerHTML=rows.map(m=>{
   const r=rolls.find(x=>x.id===m.id || x.code===m.id);
   return usageRow(r?.id||'',Number((safeNum(m.grams)*qty).toFixed(3)));
  }).join('');
  const missing=rows.filter(m=>!rolls.some(r=>r.id===m.id||r.code===m.id)).map(m=>m.id);
  box.textContent=`Suggestion Excel : ${number(excelUsageTotal(p),2)} g par unité, soit ${number(excelUsageTotal(p)*qty,2)} g pour ${qty} unité(s). Vérifie les grammes réels (purge/supports) avant Enregistrer et déduire.`+(missing.length?' ⚠ Références introuvables dans tes bobines : '+missing.join(', ')+'. Choisis les bonnes bobines avant de sauvegarder.':'');
 }
 function printCatalogRows(query=''){const items=filteredProducts('impressions',query);return items.length?`<div class="inventory-card-grid">${items.map(p=>`<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(p.name)}</h3><small>ID stock #${esc(p.shopId)} · ${esc(p.id)}</small></div><strong>${money(p.price)}</strong></div><div class="detail-grid"><div><small>Couleurs</small><strong>${esc(p.colors||'—')}</strong></div><div><small>Quantité en stock</small><strong>${number(p.stock)}</strong></div><div><small>Temps d’impression (Excel)</small><strong>${esc(excelPrintDuration(p))}</strong></div><div><small>Unités fabriquées</small><strong>${number(p.printed||0)}</strong></div><div><small>Poids déclaré / unité</small><strong>${number(safeNum(p.grams),2)} g</strong></div><div><small>Matériaux détaillés / unité</small><strong>${number(excelUsageTotal(p),2)} g</strong></div></div><div class="material-history"><span class="material-heading">Bobines et grammes (Excel, par unité)</span>${excelMaterials(p)}</div><button type="button" class="secondary-btn" data-new-print-product="${esc(p.id)}">＋ Enregistrer une nouvelle impression</button>${safeNum(p.stock)>0&&safeNum(p.printed)>0?`<button type="button" class="secondary-btn" data-open-move-off="${esc(p.id)}">⚠ Déplacer 1 unité hors production</button>`:""}</article>`).join('')}</div>`:'<p class="empty">Aucun produit pour cette recherche.</p>';}
 function usageRow(rollId='',grams=''){
  const opts=rolls.filter(r=>safeNum(r.remaining)>0||r.id===rollId).map(r=>`<option value="${esc(r.id)}" ${r.id===rollId?'selected':''}>${esc(r.brand)} — ${esc(r.color)} (${esc(r.code||r.id)}) · ${number(r.remaining,1)} g</option>`).join('');
  return `<div class="usage-line"><select class="usage-roll" aria-label="Bobine utilisée" required><option value="">Choisir une bobine…</option>${opts}</select><input type="number" class="usage-grams" aria-label="Grammes consommés" min="0.1" step="0.1" placeholder="Grammes" value="${esc(grams)}" required><button class="secondary-btn usage-remove" type="button" title="Retirer cette bobine">×</button></div>`;
 }
 // Données Excel affichées dans le formulaire; seules les mesures connues sont préremplies.
 function selectedProductInfo({prefillDuration=false}={}){
  const select=document.getElementById('print-product');
  const panel=document.getElementById('selected-product-info');
  const p=extras.products.find(item=>String(item.id)===select.value);
  if(!p){panel.hidden=true;panel.innerHTML='';if(prefillDuration){const f=document.getElementById('print-form');f.elements.namedItem('minutes').value='' ;f.elements.namedItem('hours').value='' ;f.elements.namedItem('minutePart').value='' ;}return;}
  const rawDays=Number(p.timeDays);
  const knownTime=p.timeDays!==null&&p.timeDays!==undefined&&p.timeDays!==''&&Number.isFinite(rawDays)&&rawDays>0;
  const mins=knownTime?Math.round(rawDays*24*60):null;
  if(prefillDuration){const f=document.getElementById('print-form');f.elements.namedItem('minutes').value=mins===null?'0':String(mins);f.elements.namedItem('hours').value=mins===null?'':String(Math.floor(mins/60));f.elements.namedItem('minutePart').value=mins===null?'':String(mins%60);}
  panel.innerHTML=`<div class="selected-product-title"><strong>📦 Informations du produit (Excel)</strong><span>ID stock #${esc(p.shopId||'—')}</span></div>
   <div class="selected-product-name">${esc(p.name)}</div>
   <div class="selected-product-details">
    <div><small>ID Excel</small><b>${esc(p.id)}</b></div>
    <div><small>Couleurs</small><b>${esc(p.colors||'—')}</b></div>
    <div><small>Temps enregistré</small><b>${esc(excelPrintDuration(p))}</b></div>
    <div><small>Unités déjà fabriquées</small><b>${number(p.printed||0)}</b></div>
    <div><small>En stock (Excel)</small><b>${number(p.stock||0)}</b></div>
    <div><small>Prix du produit</small><b>${money(p.price||0)}</b></div>
    <div><small>Poids par unité (Excel)</small><b>${number(safeNum(p.grams),2)} g</b></div>
   </div><div class="material-history"><span class="material-heading">Filaments utilisés dans Excel (par unité)</span>${excelMaterials(p)}</div><p class="small-hint">La durée est préremplie à partir du fichier Excel si elle est connue. Elle peut représenter un lot : adapte-la à ton impression réelle. La quantité reste à 1 par défaut et les grammes ne sont jamais déduits automatiquement depuis l’historique.</p>`;
  panel.hidden=false;
 }
 async function openPrint(id=null, preselectProduct=null){
  if(!rolls.some(r=>safeNum(r.remaining)>0)){notify('Ajoute une bobine avec du filament disponible.',true);location.hash='filaments';return;}
  const prev=id?prints.find(x=>x.id===id&&x.status==='active'):null;if(id&&!prev)return;
  editingPrintId=id;photoDraft=null;
  const f=document.getElementById('print-form');f.reset();populateChoices(f);
  document.getElementById('print-form-error').textContent='';
  document.getElementById('print-dialog-title').textContent=id?'Modifier une impression':'Ajouter une impression terminée';
  document.getElementById('print-submit').textContent=id?'Enregistrer les modifications':'Enregistrer et déduire';
  document.getElementById('print-date').value=(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})();
  const select=document.getElementById('print-product');
  select.innerHTML='<option value="__new__">＋ Nouveau produit (créé automatiquement)</option><option value="">Impression libre sans produit</option>'+extras.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · #${esc(p.shopId)} · ${esc(p.id)}</option>`).join('');
  document.getElementById('usage-lines').innerHTML=prev?prev.usage.map(u=>usageRow(u.rollId,u.grams)).join(''):usageRow();
  document.getElementById('usage-excel-hint').textContent=prev?'Valeurs réelles enregistrées pour cette impression; une modification recalcule le stock.':'';drawPrintHardware(prev?.hardwareUsage||[]);
  if(prev){
   for(const k of ['date','printer','quantity','minutes','notes']){const inp=f.elements.namedItem(k);if(inp){if(inp.matches('select[data-choice]'))setChoiceValue(f,k,prev[k]??'');else inp.value=prev[k]??'';}}
   f.elements.namedItem('hours').value=Math.floor(safeNum(prev.minutes)/60);f.elements.namedItem('minutePart').value=safeNum(prev.minutes)%60;select.value=prev.productId||'';
   f.elements.namedItem('customProduct').value=prev.productId?'':prev.product;
   selectedProductInfo(); // Ne jamais écraser la durée d’une impression déjà enregistrée.
  }else{
   select.value=preselectProduct||'__new__';
   selectedProductInfo({prefillDuration:true});suggestHardwareFromProduct();
   const product=extras.products.find(p=>String(p.id)===select.value);
   if(product){suggestExcelUsage(product);if(product.printer)setChoiceValue(f,'printer',product.printer);}
  }
  const preview=document.getElementById('photo-preview');preview.replaceChildren();
  if(id){const photo=await getPhoto('print:'+id);if(photo){const img=document.createElement('img');img.src=photo;img.alt='Photo actuelle';preview.appendChild(img);}}
  document.getElementById('print-photo').value='';
  refreshPrintCreation();
  document.getElementById('print-dialog').showModal();
 }

 function printMode(){return document.getElementById('print-product').value;}
 function refreshPrintCreation(){
  const isNew=printMode()==='__new__',panel=document.getElementById('new-from-print');panel.hidden=!isNew;
  const free=document.querySelector('#print-form [name="customProduct"]');
  const label=free.closest('label');label.hidden=!(isNew||printMode()==='');
  label.firstChild.textContent=isNew?'Nom du nouveau produit':'Nom libre (sans fiche produit)';
  updatePrintCreationCost();
 }
 function updatePrintCreationCost(){
  const target=document.getElementById('print-create-preview');if(!target||printMode()!=='__new__')return;
  const f=document.getElementById('print-form');
  const qty=Math.max(1,Number(f.elements.namedItem('quantity').value)||1);
  const usage=[...document.querySelectorAll('#usage-lines .usage-line')].map(line=>({rollId:line.querySelector('.usage-roll').value,grams:Number(line.querySelector('.usage-grams').value)}));
  const cost=usage.reduce((sum,u)=>{const roll=rolls.find(r=>r.id===u.rollId);return sum+(roll?Math.max(0,u.grams||0)*safeNum(roll.price)/Math.max(1,safeNum(roll.initial)):0);},0)/qty;
  const hw=hardwareCost(getHardwareLines('print-hardware-lines').filter(x=>x.id&&x.raw))/qty;
  const price=Number(f.elements.namedItem('newPrice').value)||0,extra=Number(f.elements.namedItem('newOther').value)||0,rate=Number(f.elements.namedItem('newRate').value)||0;
  target.innerHTML=`<div><small>Filament / unité</small><strong>${money(cost)}</strong></div><div><small>Hardware / unité</small><strong>${money(hw)}</strong></div><div><small>Fabrication / unité</small><strong>${money(cost+hw+extra)}</strong></div><div><small>Prix de vente</small><strong>${money(price)}</strong></div><div><small>Profit après commission</small><strong>${money(price-cost-hw-extra-price*rate/100)}</strong></div>`;
 }
 function newProductFromPrint(entry,printUsage,raw){
  const qty=entry.quantity,id='PROD-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6);
  const materials=printUsage.map(u=>({id:rolls.find(r=>r.id===u.rollId)?.code||u.rollId,grams:Math.round(u.grams/qty*1000)/1000}));
  const filamentCost=printUsage.reduce((sum,u)=>{const r=rolls.find(x=>x.id===u.rollId);return sum+(r?safeNum(r.price)*u.grams/Number(r.initial):0);},0)/qty;
  const hardware=(entry.hardwareUsage||[]).map(h=>({id:h.id,quantity:h.quantity/qty}));
  const rate=Number(raw.newRate)/100,other=Number(raw.newOther),price=Number(raw.newPrice),unitCost=filamentCost+hardwareCost(hardware)+other;
  return {id,name:entry.product,category:choiceValue(document.getElementById('print-form'),'newCategory'),colors:choiceValue(document.getElementById('print-form'),'newColors'),printer:entry.printer,materials,hardware,grams:materials.reduce((a,m)=>a+m.grams,0),timeDays:entry.minutes/1440,filamentCost,otherCost:other,unitCost,price,commissionRate:rate,unitProfit:price-unitCost-price*rate,stock:qty,printed:qty,sold:0,shopId:'',source:'PrintPilot',notes:entry.notes};
 }
 function savePrint(event){event.preventDefault();const f=event.currentTarget;const error=document.getElementById('print-form-error');error.textContent='';const usages=[...document.querySelectorAll('#usage-lines .usage-line')].map(line=>({rollId:line.querySelector('.usage-roll').value,grams:Number(line.querySelector('.usage-grams').value),raw:line.querySelector('.usage-grams').value}));if(!usages.length||usages.some(u=>!u.rollId||!Number.isFinite(u.grams)||u.grams<=0||u.raw==='')){error.textContent='Sélectionne une bobine et une quantité positive pour chaque ligne.';return;}
  const hardwareRaw=getHardwareLines('print-hardware-lines');if(!hardwareLinesValid(hardwareRaw)){error.textContent='Sélectionne un composant et une quantité entière positive.';return;}const hardwareUsage=hardwareRaw.filter(h=>h.id).map(h=>({id:h.id,quantity:h.quantity}));
  const existing=editingPrintId?prints.find(p=>p.id===editingPrintId&&p.status==='active'):null;
  const combined=new Map();for(const u of usages)combined.set(u.rollId,(combined.get(u.rollId)||0)+u.grams);
  for(const [id,qty] of combined){const r=rolls.find(x=>x.id===id);if(!r){error.textContent='Une bobine sélectionnée est introuvable.';return;}const refundable=existing?existing.usage.filter(u=>u.rollId===id).reduce((a,u)=>a+Number(u.grams),0):0;if(Number(r.remaining)+refundable+1e-7<qty){error.textContent=`Stock insuffisant pour ${r.brand} — ${r.color} : ${number(r.remaining,1)} g disponibles, ${number(qty,1)} g demandés.`;return;}}
  const oldHardware=new Map();for(const h of existing?.hardwareUsage||[])oldHardware.set(h.id,(oldHardware.get(h.id)||0)+safeNum(h.quantity));
  const newHardware=new Map();for(const h of hardwareUsage)newHardware.set(h.id,(newHardware.get(h.id)||0)+h.quantity);
  const nextHardware=extras.hardware.map(h=>({...h,remaining:safeNum(h.remaining)+(oldHardware.get(h.id)||0)-(newHardware.get(h.id)||0)}));
  if(nextHardware.some(h=>h.remaining<0)){error.textContent='Stock de hardware insuffisant pour cette impression.';return;}
  if([...newHardware.keys()].some(id=>!extras.hardware.some(h=>h.id===id))){error.textContent='Un composant sélectionné a été supprimé.';return;}
  const quantity=Number(f.elements.namedItem('quantity').value),hours=Number(f.elements.namedItem('hours').value),minutePart=Number(f.elements.namedItem('minutePart').value),minutes=hours*60+minutePart;if(!Number.isInteger(quantity)||quantity<1||!Number.isInteger(hours)||hours<0||!Number.isInteger(minutePart)||minutePart<0||minutePart>59){error.textContent='Vérifie la quantité et la durée.';return;}
  const selection=document.getElementById('print-product');const creating=selection.value==='__new__';const product=extras.products.find(p=>String(p.id)===selection.value);
  const name=product?.name||(f.elements.namedItem('customProduct').value.trim()||(creating?'':'Impression libre'));
  if(creating){const vals=['newPrice','newOther','newRate'].map(k=>Number(f.elements.namedItem(k).value));if(!name||vals.some(v=>!Number.isFinite(v)||v<0)||vals[2]>100){error.textContent='Pour créer le produit, indique son nom et des prix / commissions valides.';return;}}
  if(existing&&creating){error.textContent='Pour associer une impression existante, utilise « Créer la fiche Produit » dans son historique.';return;}
  const usage=[...combined].map(([rollId,grams])=>{const r=rolls.find(x=>x.id===rollId);return {rollId,grams,label:r.brand+' — '+r.color};});
  const entry={id:existing?existing.id:'print-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),date:f.elements.namedItem('date').value,productId:product?.id||'',product:name,printer:choiceValue(f,'printer'),quantity,minutes,notes:f.elements.namedItem('notes').value.trim(),usage,hardwareUsage,status:'active',createdAt:existing?existing.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const refunds=new Map();if(existing)existing.usage.forEach(u=>refunds.set(u.rollId,(refunds.get(u.rollId)||0)+Number(u.grams)));
  const nextRolls=rolls.map(r=>{const remaining=Math.round((Number(r.remaining)+(refunds.get(r.id)||0)-(combined.get(r.id)||0))*1000)/1000;return {...r,remaining};});
  if(nextRolls.some(r=>r.remaining<0||r.remaining>Number(r.initial)+1e-7)){error.textContent='Stock insuffisant ou poids initial dépassé. Vérifie les bobines.';return;}
  const nextPrints=existing?prints.map(p=>p.id===existing.id?entry:p):[...prints,entry];
  const nextProducts=extras.products.map(p=>({...p}));
  // Stock produit : ajuster les quantités lors de nouvelles impressions, modifications et changements de modèle.
  if(existing?.productId){const previousProduct=nextProducts.find(p=>p.id===existing.productId);if(previousProduct){previousProduct.stock=safeNum(previousProduct.stock)-safeNum(existing.quantity);previousProduct.printed=Math.max(0,safeNum(previousProduct.printed)-safeNum(existing.quantity));}}
  if(creating){
   const row=newProductFromPrint(entry,usage,Object.fromEntries(new FormData(f)));
   const productRow=ensureShopIds([...nextProducts,row]).at(-1);entry.productId=productRow.id;nextProducts.push(productRow);
  }else if(product){const target=nextProducts.find(p=>p.id===product.id);target.stock=safeNum(target.stock)+quantity;target.printed=safeNum(target.printed)+quantity;target.hiddenOffProduction=false;}
  if(nextProducts.some(p=>safeNum(p.stock)<0)){error.textContent='Modification impossible : des produits de cette impression ont déjà été vendus. Vérifie leur stock avant de modifier.';return;}
  if(!persistWorkshop(nextRolls,nextPrints,{...extras,hardware:nextHardware,products:nextProducts})){error.textContent='Impossible de sauvegarder ensemble l’impression et le catalogue.';return;}
  document.getElementById('print-dialog').close();editingPrintId=null;render();notify('✓ Impression enregistrée, bobines déduites et catalogue / stock mis à jour!');
  if(photoDraft){const pic=photoDraft;photoDraft=null;Promise.all([setPhoto('print:'+entry.id,pic),...(creating&&entry.productId?[setPhoto(uniqueProductPhotoKey(extras.products.find(p=>p.id===entry.productId)||{shopId:entry.productId}),pic)]:[])]).then(()=>hydratePhotos()).catch(e=>{console.error(e);notify('Production enregistrée, mais photo non synchronisée; garde ta photo originale.',true);});}

 }
 function cancelPrint(id){const p=prints.find(x=>x.id===id&&x.status==='active');if(!p)return;if(!confirm(`Annuler « ${p.product} » et remettre les grammes utilisés sur les bobines ?`))return;
  for(const u of p.usage){if(!rolls.some(r=>r.id===u.rollId)){notify('Impossible : une bobine de cette impression a été supprimée.',true);return;}}
  const restore=new Map();p.usage.forEach(u=>restore.set(u.rollId,(restore.get(u.rollId)||0)+Number(u.grams)));
  const nextRolls=rolls.map(r=>restore.has(r.id)?{...r,remaining:Math.round((Number(r.remaining)+restore.get(r.id))*1000)/1000}:r);
  // Un ajustement manuel pourrait déjà avoir remis du stock : éviter de dépasser le poids initial.
  if(nextRolls.some(r=>Number(r.remaining)>Number(r.initial)+1e-7)){notify('Annulation impossible : le retour dépasserait le poids initial d’une bobine. Ajuste son stock avant de réessayer.',true);return;}
  const hardwareRefunds=new Map();for(const h of p.hardwareUsage||[])hardwareRefunds.set(h.id,(hardwareRefunds.get(h.id)||0)+safeNum(h.quantity));
  if([...hardwareRefunds.keys()].some(id=>!extras.hardware.some(h=>h.id===id))){notify('Impossible : un composant de cette impression a été supprimé.',true);return;}
  const nextHardware=extras.hardware.map(h=>({...h,remaining:safeNum(h.remaining)+(hardwareRefunds.get(h.id)||0)}));
  const nextPrints=prints.map(x=>x.id===id?{...x,status:'cancelled',cancelledAt:new Date().toISOString()}:x);
  const nextProducts=extras.products.map(x=>({...x}));const target=nextProducts.find(x=>x.id===p.productId);
  if(target){if(safeNum(target.stock)<safeNum(p.quantity)){notify('Annulation impossible : ces unités ont déjà été vendues. Annule la vente d’abord.',true);return;}target.stock-=safeNum(p.quantity);target.printed=Math.max(0,safeNum(target.printed)-safeNum(p.quantity));}
  if(!persistWorkshop(nextRolls,nextPrints,{...extras,hardware:nextHardware,products:nextProducts}))return;
  render();notify('✓ Impression annulée, filament remis et stock produit ajusté.');
 }

 function chooseReconciliation(){
  const input=document.createElement('input'); input.type='file';input.accept='.json,application/json';
  input.onchange=async()=>{if(!input.files?.[0])return;try{await applyReconciliation(input.files[0]);}catch(e){console.error('Correction inventaire',e);notify('Correction refusée : '+e.message,true);alert('Correction refusée : '+e.message);}};
  input.click();
 }
 async function applyReconciliation(file){
  if(file.size>2_000_000)throw Error('Fichier trop volumineux.');
  const patch=JSON.parse(await file.text());
  if(patch.format!=='PrintPilotReconciliationV1'||!Array.isArray(patch.products)||!Array.isArray(patch.baseline)||!patch.expectedCounts)throw Error('Ce fichier n’est pas une correction PrintPilot reconnue.');
  // Three-way merge: only fields intentionally corrected in the patch are touched.
  // A field that already matches the target is accepted as previously corrected;
  // a field that differs from both baseline and target is a genuine conflict.
  if(prints.length!==patch.expectedCounts.prints||extras.sales.length!==patch.expectedCounts.sales)throw Error('Les impressions ou les ventes ont changé depuis la sauvegarde. Exporte une nouvelle sauvegarde pour recalculer la correction.');
  const baseByShop=new Map(patch.baseline.map(p=>[String(p.shopId),p]));
  const desiredByShop=new Map(patch.products.map(p=>[String(p.shopId),p]));
  const currentByShop=new Map(extras.products.map(p=>[String(p.shopId),p]));
  const equal=(a,b)=>typeof a==='number'||typeof b==='number'?Math.abs(safeNum(a)-safeNum(b))<=1e-7:String(a??'')===String(b??'');
  const corrections=['printed','stock','price','timeDays'];
  const conflicts=[];
  const nextProducts=extras.products.map(curr=>{
    const key=String(curr.shopId),base=baseByShop.get(key),wanted=desiredByShop.get(key);
    if(!base||!wanted)return {...curr}; // Respect products added to PrintPilot meanwhile.
    if(curr.id!==base.id||String(curr.colors||'')!==String(base.colors||'')){
      conflicts.push(`${curr.name||curr.id} : identité ou couleur modifiée`);return {...curr};
    }
    const merged={...curr}; // Preserve photos, notes, components, latest metadata, etc.
    for(const field of corrections){
      if(equal(base[field],wanted[field]))continue;
      if(equal(curr[field],base[field]))merged[field]=wanted[field];
      else if(!equal(curr[field],wanted[field]))conflicts.push(`${curr.name||curr.id} : ${field} (${curr[field]} différent de ${base[field]} et ${wanted[field]})`);
    }
    return merged;
  });
  for(const desired of patch.products){
    const key=String(desired.shopId);
    if(currentByShop.has(key)){
      if(!baseByShop.has(key) && currentByShop.get(key).id!==desired.id)conflicts.push(`ID boutique #${key} utilisé par un autre produit`);
      continue;
    }
    if(baseByShop.has(key)){conflicts.push(`Produit existant supprimé depuis la sauvegarde : ${desired.name||desired.id}`);continue;}
    if(nextProducts.some(p=>p.id===desired.id && String(p.colors||'')===String(desired.colors||''))){conflicts.push(`Produit déjà présent sous un autre ID : ${desired.name||desired.id}`);continue;}
    nextProducts.push(desired);
  }
  if(conflicts.length)throw Error('Conflits à vérifier (aucune donnée modifiée) : '+conflicts.slice(0,3).join(' ; ')+(conflicts.length>3?` ; +${conflicts.length-3} autres`:''));
  if(!nextProducts.every(p=>p&&typeof p.id==='string'&&Number.isFinite(Number(p.price))&&Number.isFinite(Number(p.stock))))throw Error('Produits invalides dans le correctif.');
  const newRetail=nextProducts.reduce((sum,p)=>sum+safeNum(p.stock)*safeNum(p.price),0);
  const newMins=nextProducts.reduce((sum,p)=>sum+safeNum(p.timeDays)*1440*safeNum(p.printed),0);
  const msg=`Correction vérifiée.\n\nAvant : ${extras.products.length} variantes, ${money(extras.products.reduce((s,p)=>s+safeNum(p.stock)*safeNum(p.price),0))} de stock.\nAprès : ${nextProducts.length} variantes, ${money(newRetail)} de stock et ${clockDuration(newMins)} de production équivalente.\n\nLes rouleaux, les impressions, les ventes, le hardware et les photos ne seront PAS modifiés. Aucun gramme déduit.\n\nTu as bien exporté ta sauvegarde JSON avant de continuer ?`;
  if(!confirm(msg))return;
  const next={...extras,products:nextProducts};
  if(!persistExtras(next))throw Error('Échec de sauvegarde des nouveaux produits.');
  render();notify('✓ Correction appliquée. Vérifie la synchronisation Firebase et les statistiques.');
 }
 function exportFull(){const data={version:2,exportedAt:new Date().toISOString(),filaments:rolls,prints,products:extras.products,hardware:extras.hardware,sales:extras.sales,nonCommercial:extras.nonCommercial||[],printers:extras.printers||[],invoices:extras.invoices||[],stockSlips:extras.stockSlips||[],packingSlips:extras.packingSlips||[],customOrders:extras.customOrders||[],invoiceSettings:extras.invoiceSettings||{}};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='printpilot-sauvegarde-complete.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Sauvegarde complète exportée.');}
 function financeProductRows(query=''){
  const products=commercialProducts().filter(p=>[p.shopId,p.id,p.name,p.category,p.colors].join(' ').toLowerCase().includes(String(query).toLowerCase()));
  if(!products.length)return '<p class="empty">Aucun produit correspondant.</p>';
  return `<div class="finance-card-grid">${products.map(p=>{
   const rate=safeNum(p.commissionRate), commission=safeNum(p.price)*rate;
   const profit=safeNum(p.price)-commission-safeNum(p.unitCost);
   return `<article class="finance-product-card">
     <div class="finance-card-head"><div class="finance-product-name"><span class="finance-shop-id">#${esc(p.shopId)}</span><div><strong>${esc(p.name)}</strong><small>ID Excel : ${esc(p.id)}</small></div></div><span class="finance-price">${money(p.price)}</span></div>
     <div class="finance-card-color"><span>Couleurs</span><b>${esc(p.colors||'—')}</b></div>
     <dl class="finance-cost-grid">
       <div><dt>Filament</dt><dd>${money(p.filamentCost)}</dd></div><div><dt>Tarif facturé pour les heures</dt><dd>${money((Number(p.timeDays)||0)*24*(Number(p.hourlyRate)||0))}</dd></div>
       <div><dt>Autres coûts</dt><dd>${money(p.otherCost)}</dd></div>
       <div><dt>Coût matériel unitaire</dt><dd>${money(p.unitCost)}</dd></div>
       <div><dt>Commission (${number(rate*100,0)} %)</dt><dd>${money(commission)}</dd></div>
     </dl>
     <div class="finance-card-footer"><div><span>Montant restant / unité (avant dépenses non saisies)</span><strong>${money(profit)}</strong></div><div><span>En stock</span><strong>${number(p.stock)}</strong></div></div>
   </article>`;
  }).join('')}</div>`;
 }
 function financePage(){
  const products=commercialProducts(),sales=activeSales(),active=prints.filter(p=>p.status==='active');
  const gross=sales.reduce((a,x)=>a+safeNum(x.gross),0),commissions=sales.reduce((a,x)=>a+safeNum(x.commission),0),profits=sales.reduce((a,x)=>a+safeNum(x.profit),0);
  const stockRevenue=products.reduce((a,p)=>a+safeNum(p.stock)*safeNum(p.price),0);
  const stockCost=products.reduce((a,p)=>a+safeNum(p.stock)*safeNum(p.unitCost),0);
  const materials=active.reduce((a,p)=>a+printMaterialCost(p),0);
  return header('GESTION','Finances','Tous les prix, les coûts et les profits de ton Excel, produit par produit.',`<button type="button" class="secondary-btn" id="export-finance">↧ Exporter les prix CSV</button>`)
   +warning()+(!products.length?excelNotice():'')
   +`<div class="notice">ⓘ &nbsp; Prix et coûts importés de ton Excel. Les profits par produit sont des <b>estimations</b> d’après prix − commission − coût unitaire; les montants réels des ventes sont affichés séparément. Les coûts d’impression ne sont pas additionnés aux coûts des produits pour éviter de compter deux fois.</div>`
   +`<div class="stats-grid">${statCard('$',money(stockRevenue),'Valeur du stock au prix de vente')}${statCard('▣',money(stockCost),'Coût total estimé du stock')}${statCard('↗',money(profits),'Profit des ventes')}${statCard('◉',money(gross),'Ventes brutes')}</div>`
   +`<section class="panel"><div class="panel-head"><div><h2>Ventes enregistrées</h2><p>Ventes importées et nouvelles ventes enregistrées, annulations exclues.</p></div></div><div class="stats-grid three">${statCard('$',money(gross),'Ventes brutes')}${statCard('▣',money(commissions),'Commissions payées')}${statCard('↗',money(profits),'Profit déclaré')}</div><div class="jj-finance-sale-table table-wrap"><table><thead><tr><th>PRODUIT</th><th>QUANTITÉ</th><th>CANAL</th><th>PRIX UNIT.</th><th>VENTES</th><th>COMMISSION</th><th>COÛT</th><th>PROFIT</th></tr></thead><tbody>${sales.map(x=>`<tr><td>${esc(x.product)}</td><td>${number(x.quantity)}</td><td>${esc(x.channel)}</td><td>${money(x.unitPrice)}</td><td>${money(x.gross)}</td><td>${money(x.commission)}</td><td>${money(x.cost)}</td><td>${money(x.profit)}</td></tr>`).join('')||'<tr><td colspan="8">Aucune vente enregistrée.</td></tr>'}</tbody></table></div><div class="jj-finance-sale-grid">${sales.map(x=>`<article class="jj-finance-sale-card"><div class="jj-finance-sale-heading"><strong>${esc(x.product||'Produit')}</strong><span>${esc(x.channel||'Direct')} · Qté ${number(x.quantity)}</span></div><div class="jj-finance-sale-amounts"><div><small>Vente</small><strong>${money(x.gross)}</strong></div><div><small>Profit estimé</small><strong class="jj-finance-profit">${money(x.profit)}</strong></div></div>${x.source!=='JJ3D Facture'&&sales.some(inv=>inv.source==='JJ3D Facture'&&inv.product===x.product&&Math.abs(safeNum(inv.gross)-safeNum(x.gross))<0.011&&safeNum(inv.quantity)===safeNum(x.quantity))?`<button class="secondary-btn jj-duplicate-button" data-hide-duplicate-sale="${esc(x.id)}">Masquer doublon possible (Direct)</button>`:''}<details><summary>Voir les détails</summary><div class="jj-finance-details"><span>Prix unitaire</span><strong>${money(x.unitPrice)}</strong><span>Commission</span><strong>${money(x.commission)}</strong><span>Coût déclaré</span><strong>${money(x.cost)}</strong></div></details></article>`).join('')||'<p>Aucune vente enregistrée.</p>'}</div></section>`
   +`<section class="panel"><div class="panel-head"><div><h2>Coûts matière des impressions ajoutées</h2><p>Calculés selon le prix payé par bobine et les grammes enregistrés : ${money(materials)} au total.</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>IMPRESSION</th><th>DATE</th><th>QUANTITÉ</th><th>GRAMMES</th><th>COÛT MATIÈRE</th></tr></thead><tbody>${active.map(p=>`<tr><td>${esc(p.id)}</td><td>${esc(p.product)}</td><td>${esc(p.date)}</td><td>${number(p.quantity)}</td><td>${number(p.usage.reduce((a,u)=>a+Number(u.grams),0),1)} g</td><td>${money(printMaterialCost(p))}</td></tr>`).join('')||'<tr><td colspan="6">Aucune impression pour le moment.</td></tr>'}</tbody></table></div></section>`   +`<div class="notice">ⓘ Une vente directe et une facture payée peuvent représenter la même transaction. Utilise « Masquer doublon possible » après vérification : JJ3D conserve l’entrée masquée et peut la rétablir.</div>${extras.sales.filter(x=>x.status==='duplicate').map(x=>`<p class="jj-restored-duplicate">Masquée : ${esc(x.product)} · ${money(x.gross)} <button type="button" class="secondary-btn" data-restore-duplicate-sale="${esc(x.id)}">Rétablir</button></p>`).join('')}`
   +`<section class="panel"><div class="panel-head"><div><h2>Liste des prix et coûts (${products.length} variantes)</h2><p>Tous les prix et coûts affichés en fiches, sans défilement horizontal.</p></div><input type="search" id="finance-search" class="table-filter" placeholder="Rechercher ID, nom, couleur…" aria-label="Rechercher dans les finances"></div><div id="finance-products">${financeProductRows('')}</div></section>`;
 } function catalogPage(){const items=commercialProducts();return header('PARTAGE','Catalogue à partager','ID, nom, photo, prix et stock : une vue destinée à ta partenaire de vente.',`<button type="button" class="primary-btn" id="download-catalog">↧ Catalogue HTML</button><button type="button" class="secondary-btn" id="download-catalog-csv">↧ IDs / stock CSV</button>`)+`<div class="notice">🔒 &nbsp; Le catalogue exporté est une copie publique sans tes coûts ni tes profits. Il n’est pas encore accessible par lien : pour cela, il faudra le publier sur un hébergement autorisé. Ajoute une photo à un produit ci-dessous; connecté à Firebase, elle sera visible sur tes autres appareils.</div><section class="jj-order-info" aria-label="Informations destinées aux clients"><h3>✨ Informations commandes JJ3D</h3><p><b>Couleurs :</b> noir, blanc, bleu, rouge, vert en stock; autres couleurs sur demande, avec supplément possible selon le filament choisi.</p><p><b>Expédition :</b> frais à la charge du client, confirmés avant envoi.</p><p><b>Délai :</b> prévoir environ 2 semaines pour fabriquer et préparer l’expédition, hors temps de transport.</p></section><section class="panel"><div class="panel-head"><div><h2>Produits à présenter (${items.length})</h2></div><input type="search" id="catalog-search" class="table-filter" placeholder="Rechercher un ID ou produit…"></div>${filterToolbar('catalogue')}<div id="catalog-results">${catalogRows('')}</div></section>`;}
 function catalogRows(query){
  const items=filteredProducts('catalogue',query);
  return `<div class="catalog-grid">${items.map(p=>`<article class="catalog-card"><button type="button" class="catalog-card-open" data-view-catalog="${esc(p.id)}" aria-label="Voir la fiche de ${esc(p.name)}">${productThumb(p,'catalog-image')}<div class="catalog-card-caption"><span class="catalog-card-name">${esc(p.name)}</span><span class="catalog-card-price">${money(p.price)}</span><small>ID stock #${esc(p.shopId)} · Stock : ${number(p.stock)}</small><span class="catalog-card-hint">Voir la fiche →</span></div></button></article>`).join('')||'<p class="empty">Aucun produit.</p>'}</div>`;
 }
 function openCatalogDetails(id,byShop=false){
  const p=extras.products.find(x=>byShop?String(x.shopId)===String(id):String(x.id)===String(id));
  if(!p){notify('Ce produit est introuvable.',true);return;}
  const dialog=document.getElementById('catalog-detail-dialog');
  const photo=document.getElementById('catalog-detail-photo');
  const title=document.getElementById('catalog-detail-name');
  photo.innerHTML=productThumb(p,'catalog-detail-image');
  title.textContent=p.name||'Produit';
  const details=document.getElementById('catalog-detail-fields');
  details.innerHTML=`<div><small>Prix de vente</small><strong class="catalog-detail-price">${money(p.price)}</strong></div><div><small>Quantité en stock</small><strong>${number(p.stock)}</strong></div><div><small>ID stock</small><strong>#${esc(p.shopId)}</strong></div><div><small>ID Excel / référence</small><strong>${esc(p.id)}</strong></div><div><small>Catégorie</small><strong>${esc(p.category||'—')}</strong></div><div><small>Couleur(s)</small><strong>${esc(p.colors||'—')}</strong></div>`;
  document.getElementById('catalog-detail-upload').dataset.uploadProduct=p.shopId;
  document.getElementById('catalog-detail-camera').dataset.cameraProduct=p.shopId;
  dialog.showModal();
  hydratePhotos();
 }

 function downloadText(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function exportFinance(){
  const rows=[['ID stock','ID Excel','Produit','Catégorie','Couleurs','Prix de vente CAD','Coût filament CAD','Autres coûts CAD','Coût unitaire CAD','Commission %','Commission unitaire CAD','Profit unitaire estimé CAD','Quantité stock','Valeur stock CAD'],
   ...commercialProducts().map(p=>[p.shopId,p.id,p.name,p.category,p.colors,safeNum(p.price).toFixed(2),safeNum(p.filamentCost).toFixed(2),safeNum(p.otherCost).toFixed(2),safeNum(p.unitCost).toFixed(2),(safeNum(p.commissionRate)*100).toFixed(0),(safeNum(p.price)*safeNum(p.commissionRate)).toFixed(2),(safeNum(p.price)*(1-safeNum(p.commissionRate))-safeNum(p.unitCost)).toFixed(2),safeNum(p.stock),(safeNum(p.stock)*safeNum(p.price)).toFixed(2)])];
  downloadText('printpilot-prix-produits.csv','\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8');
  notify('Liste complète des prix exportée en CSV.');
 }
 async function exportCatalog(){try{const cards=await Promise.all(commercialProducts().map(async p=>{const pic=await getProductPhoto(p);return `<article>${pic?`<img src="${pic}" alt="">`:'<div class="placeholder-img">Photo à venir</div>'}<small><b>ID stock : ${esc(p.shopId)}</b></small><p><small>ID Excel : ${esc(p.id)}</small></p><h2>${esc(p.name)}</h2><p>${esc(p.category||'')} • ${esc(p.colors||'')}</p><strong>${money(p.price)}</strong><p>Stock : ${number(p.stock)}</p></article>`;}));const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catalogue 3D</title><style>body{font:16px system-ui;margin:0;background:#f5f5fa;color:#222}header{background:#171a30;color:white;padding:35px 5%}main{padding:25px 5%;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}article{background:white;border-radius:14px;padding:18px;box-shadow:0 3px 18px #0001}img,.placeholder-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:#e6e5f2;display:grid;place-items:center;color:#666}h2{font-size:17px}small{color:#6a61b0}strong{font-size:20px}footer{padding:30px 5%;color:#777}</style></head><body><header><h1>Catalogue de créations 3D</h1><p>Produits, ID numérique, ID Excel et prix — copie du ${new Date().toLocaleDateString('fr-CA')}</p></header><main>${cards.join('')}</main><footer>Couleurs spéciales disponibles sur demande (supplément possible). Frais d’expédition à la charge du client. Prévoir environ 2 semaines pour la fabrication et la préparation avant expédition, hors délai de transport. — Ce catalogue est une copie statique; les stocks ne se mettent pas à jour automatiquement.</footer></body></html>`;downloadText('catalogue-3d-partage.html',html,'text/html;charset=utf-8');notify('Catalogue HTML créé. Il peut être envoyé comme fichier.');}catch(e){console.error(e);notify('Impossible de préparer le catalogue.',true)}}
 // v4.6 : conservation du temps et de la consommation pour les impressions hors vente.
 function offKindLabel(k){return ({failed:'Impression ratée',personal:'Projet personnel',test:'Test / calibration'})[k]||'Hors production';}
 function offPage(){
  const entries=offEntries().slice().reverse(), m=offMetrics();
  const rows=entries.map(e=>`<tr><td><b>${esc(e.name)}</b><small class="code">${esc(e.date||'')} · ${esc(offKindLabel(e.kind))}</small></td><td>${number(e.quantity||1)}</td><td>${clockDuration(e.minutes)}</td><td>${number((e.usage||[]).reduce((a,u)=>a+safeNum(u.grams),0),1)} g</td><td>${e.deducted?'Déduit à l’enregistrement':'Déjà déduit / historique'}</td><td><button class="secondary-btn" data-restore-off="${esc(e.id)}">${e.originProductId||e.linkedPrintId?'↩ Remettre en production':'↩ Annuler et restituer'}</button> <button type="button" class="secondary-btn danger" data-delete-off="${esc(e.id)}">🗑 Supprimer</button></td></tr>`).join('');
  const products=extras.products.filter(p=>safeNum(p.stock)>0&&safeNum(p.printed)>0);
  return header('HORS PRODUCTION','Personnel / Échecs / Tests','Les heures comptent dans le temps global; aucun produit n’est ajouté au catalogue.',`<button type="button" class="primary-btn" id="add-off">＋ Enregistrer une utilisation</button>`)
    +`<div class="notice">ⓘ <b>Nouvelle impression :</b> les grammes consommés sont déduits de tes bobines. <b>Ancien produit Excel :</b> le filament est déjà inclus dans ton inventaire et ne sera pas redéduit. Un déplacement retire les unités concernées du stock commercial et transfère leur temps.</div>`
    +`<div class="stats-grid three">${statCard('⚠',clockDuration(m.minutes),'Temps hors production')}${statCard('◉',number(m.grams,1)+' g','Filament historique / hors production')}${statCard('▤',number(m.items),'Entrées hors production')}</div>`
    +`<section class="panel"><div class="panel-head"><div><h2>Déplacer un produit déjà comptabilisé</h2><p>Exemple : ton dragon provenant d’Excel. La durée et le poids sont conservés dans le suivi, mais aucune déduction supplémentaire.</p></div></div><form id="move-off-form" class="pp-off-form"><div class="pp-off-formgrid"><label>Produit existant<select required name="productId"><option value="">Sélectionner un produit…</option>${products.map(p=>`<option value="${esc(p.id)}">#${esc(p.shopId)} · ${esc(p.name)} (${number(p.stock)} disponibles)</option>`).join('')}</select></label><label>Nombre d’unités à déplacer<input type="number" name="quantity" min="1" step="1" value="1" required></label><label>Classer comme<select name="kind"><option value="failed">Impression ratée</option><option value="personal">Personnel</option><option value="test">Test / calibration</option></select></label></div><button type="button" id="move-off-action" class="secondary-btn">↪ Déplacer hors du stock à vendre</button><p id="move-off-feedback" class="form-error" role="alert" aria-live="assertive"></p></form></section>`
    +`<section class="panel"><div class="panel-head"><div><h2>Historique hors production</h2><p>${entries.length} entrée(s) enregistrée(s)</p></div></div>${rows?`<div class="table-wrap"><table><thead><tr><th>OBJET / TYPE</th><th>QTÉ</th><th>DURÉE</th><th>FILAMENT</th><th>COMPTABILISATION</th><th>ACTIONS</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="empty">Aucun échec, projet personnel ou test enregistré.</p>'}</section>`;
 }
 function openOffDialog(){
  const f=document.getElementById('off-form');f.reset();f.elements.namedItem('date').value=new Date().toLocaleDateString('en-CA');
  document.getElementById('off-usage-lines').innerHTML=offUsageRow();document.getElementById('off-error').textContent='';document.getElementById('off-dialog').showModal();
 }
 function offUsageRow(){return `<div class="pp-off-line"><select class="off-roll" required aria-label="Bobine"><option value="">Choisir une bobine…</option>${rolls.filter(r=>safeNum(r.remaining)>0).map(r=>`<option value="${esc(r.id)}">${esc(r.brand)} — ${esc(r.color)} · ${number(r.remaining,1)} g</option>`).join('')}</select><input type="number" class="off-grams" min="0.001" step="0.001" placeholder="Grammes utilisés" required><button type="button" class="secondary-btn off-remove">×</button></div>`;}
 function saveOff(event){
  event.preventDefault();const f=event.currentTarget,err=document.getElementById('off-error');err.textContent='';
  const name=f.elements.namedItem('name').value.trim(),kind=f.elements.namedItem('kind').value,quantity=Number(f.elements.namedItem('quantity').value),h=Number(f.elements.namedItem('hours').value),m=Number(f.elements.namedItem('minutes').value);
  const us=[...document.querySelectorAll('.pp-off-line')].map(row=>({rollId:row.querySelector('.off-roll').value,grams:Number(row.querySelector('.off-grams').value)}));
  if(!name||!['failed','personal','test'].includes(kind)||!Number.isInteger(quantity)||quantity<1||!Number.isInteger(h)||h<0||!Number.isInteger(m)||m<0||m>59||(!h&&!m)){err.textContent='Vérifie le nom, le nombre et la durée (HH:MM).';return;}
  if(!us.length||us.some(u=>!u.rollId||!Number.isFinite(u.grams)||u.grams<=0)){err.textContent='Indique une bobine et le poids réel consommé pour chaque ligne.';return;}
  const sums=new Map();us.forEach(u=>sums.set(u.rollId,(sums.get(u.rollId)||0)+u.grams));
  for(const [id,g] of sums){const r=rolls.find(x=>x.id===id);if(!r||safeNum(r.remaining)+1e-7<g){err.textContent=`Stock insuffisant pour ${r?.brand||id}.`;return;}}
  const nextRolls=rolls.map(r=>sums.has(r.id)?{...r,remaining:Math.round((safeNum(r.remaining)-sums.get(r.id))*1000)/1000}:r);
  const entry={id:'off-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date:f.elements.namedItem('date').value,kind,name,quantity,minutes:h*60+m,printer:f.elements.namedItem('printer').value.trim(),notes:f.elements.namedItem('notes').value.trim(),usage:us,deducted:true,origin:'new',createdAt:new Date().toISOString()};
  if(!persistWorkshop(nextRolls,prints,{...extras,nonCommercial:[...offEntries(),entry]})){err.textContent='Impossible d’enregistrer les données.';return;}
  document.getElementById('off-dialog').close();render();notify('✓ Durée ajoutée et filament réellement consommé déduit des bobines.');
 }
 function moveProductOff(){
  // Clic explicite : aucune validation HTML implicite ne peut bloquer l'action silencieusement.
  const f=document.getElementById('move-off-form');
  if(!f){notify('Formulaire de déplacement introuvable.',true);return;}
  const feedback=f.querySelector('#move-off-feedback');
  const fail=(message)=>{if(feedback)feedback.textContent=message;notify(message,true);};
  if(feedback)feedback.textContent='';
  try{
   const productId=f.querySelector('select[name="productId"]')?.value;
   const qty=Number(f.querySelector('input[name="quantity"]')?.value);
   const kind=f.querySelector('select[name="kind"]')?.value;
   const p=extras.products.find(x=>x.id===productId);
   if(!p){fail('Sélectionne un produit valide.');return;}
   if(!['failed','personal','test'].includes(kind)){fail('Choisis un classement valide.');return;}
   if(!Number.isInteger(qty)||qty<1||qty>safeNum(p.stock)||qty>safeNum(p.printed)){
    fail(`Impossible de déplacer ${qty} unité(s) : stock ${safeNum(p.stock)}, unités fabriquées ${safeNum(p.printed)}.`);return;
   }
   const mins=safeNum(p.timeDays)*1440*qty;
   if(!confirm(`Déplacer ${qty} × « ${p.name} » vers ${offKindLabel(kind)} ?\n\n−${qty} unité(s) en stock et fabriquées, ${clockDuration(mins)} transférées au suivi hors production.\nLe filament historique NE sera PAS déduit une deuxième fois.`))return;
   const nextProducts=extras.products.map(x=>x.id===p.id?{...x,stock:safeNum(x.stock)-qty,printed:safeNum(x.printed)-qty,hiddenOffProduction:safeNum(x.stock)===qty&&safeNum(x.printed)===qty}:x);
   const ev={id:'off-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),kind,name:p.name,quantity:qty,minutes:mins,date:new Date().toLocaleDateString('en-CA'),usage:(p.materials||[]).map(u=>({rollId:u.id,grams:safeNum(u.grams)*qty})),deducted:false,origin:'product',originProductId:p.id,createdAt:new Date().toISOString()};
   if(persistWorkshop(rolls,prints,{...extras,products:nextProducts,nonCommercial:[...offEntries(),ev]})){
    render();notify('✓ Produit transféré hors production. Aucune nouvelle déduction de filament.');
   }else fail('Sauvegarde refusée. Aucune quantité n’a été modifiée.');
  }catch(e){console.error('Déplacement hors production:',e);fail('Erreur de déplacement : '+(e?.message||String(e)));}
 }
 function movePrintOff(id){
  const pr=prints.find(x=>x.id===id&&x.status==='active');if(!pr)return;
  const target=extras.products.find(p=>p.id===pr.productId),qty=Math.max(1,safeNum(pr.quantity));
  if(target&&(safeNum(target.stock)<qty||safeNum(target.printed)<qty)){notify('Ces unités ne sont pas toutes disponibles en stock; utilise le déplacement depuis les produits.',true);return;}
  const kind=prompt('Classement : failed (ratée), personal (personnel) ou test (calibration)','failed');if(kind===null)return;if(!['failed','personal','test'].includes(kind)){notify('Choisis failed, personal ou test.',true);return;}
  const duration=safeNum(pr.minutes)*qty;
  if(!confirm(`Déplacer « ${pr.product} » en ${offKindLabel(kind)} ?\nLes grammes déjà déduits restent déduits, le stock commercial baisse de ${target?qty:0} unité(s), et ${clockDuration(duration)} est transféré.`))return;
  const nextProducts=extras.products.map(p=>p.id===pr.productId?{...p,stock:safeNum(p.stock)-qty,printed:safeNum(p.printed)-qty,hiddenOffProduction:safeNum(p.stock)===qty&&safeNum(p.printed)===qty}:p);
  const nextPrints=prints.map(p=>p.id===id?{...p,status:'noncommercial'}:p);
  const ev={id:'off-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),kind,name:pr.product,quantity:qty,minutes:duration,date:pr.date,usage:pr.usage,deducted:false,origin:'print',linkedPrintId:id,originProductId:pr.productId||'',createdAt:new Date().toISOString()};
  if(persistWorkshop(rolls,nextPrints,{...extras,products:nextProducts,nonCommercial:[...offEntries(),ev]})){render();notify('✓ Impression reclassée; filament conservé sans double déduction.');}
 }
 function deleteOffEntry(id){
  const ev=offEntries().find(x=>x.id===id);if(!ev)return;
  const hasSource=Boolean(ev.originProductId||ev.linkedPrintId);
  const warning=hasSource
   ?'Cette entrée provient d’un produit ou d’une impression déjà comptabilisée. La supprimer ne remettra PAS le produit en vente, ne réactivera PAS l’impression, et ne modifiera PAS le filament.'
   :'Les heures seront retirées du suivi. Le filament réellement consommé RESTERA déduit. Pour corriger une erreur de saisie de filament, utilise plutôt « Annuler et restituer ». ';
  if(!confirm('Supprimer définitivement « '+ev.name+' » ?\n\n'+warning))return;
  const remaining=offEntries().filter(x=>x.id!==id);
  if(persistWorkshop(rolls,prints,{...extras,nonCommercial:remaining})){
   render();notify('✓ Entrée supprimée; stock et bobines inchangés.');
  }else notify('Impossible de supprimer cette entrée.',true);
 }
 function restoreOff(id){
  const ev=offEntries().find(x=>x.id===id);if(!ev)return;
  if(!confirm(`Annuler le classement hors production de « ${ev.name} » ?`))return;
  let nextRolls=rolls,nextPrints=prints,nextProducts=extras.products;
  if(ev.deducted){const sums=new Map();(ev.usage||[]).forEach(u=>sums.set(u.rollId,(sums.get(u.rollId)||0)+safeNum(u.grams)));
   if([...sums.keys()].some(rid=>!rolls.some(r=>r.id===rid))){notify('Une bobine liée n’existe plus; impossible de restituer le filament.',true);return;}
   nextRolls=rolls.map(r=>sums.has(r.id)?{...r,remaining:Math.round((safeNum(r.remaining)+sums.get(r.id))*1000)/1000}:r);
   if(nextRolls.some(r=>safeNum(r.remaining)>safeNum(r.initial)+1e-7)){notify('Restitution impossible : une bobine dépasserait son poids initial.',true);return;}
  }
  if(ev.originProductId){if(!extras.products.some(p=>p.id===ev.originProductId)){notify('Produit d’origine introuvable, restauration refusée.',true);return;}
   nextProducts=extras.products.map(p=>p.id===ev.originProductId?{...p,stock:safeNum(p.stock)+safeNum(ev.quantity),printed:safeNum(p.printed)+safeNum(ev.quantity),hiddenOffProduction:false}:p);
  }
  if(ev.linkedPrintId)nextPrints=prints.map(p=>p.id===ev.linkedPrintId?{...p,status:'active'}:p);
  if(persistWorkshop(nextRolls,nextPrints,{...extras,products:nextProducts,nonCommercial:offEntries().filter(x=>x.id!==id)})){render();notify('✓ Classement annulé. Les heures et stocks ont été rétablis.');}
 }
  // Les huit outils restent dans la même interface : le module Firebase existant
  // est hébergé dans la page au lieu de lancer une seconde application.
  function atelierPanel(p){
    const tab=p.slice('atelier-'.length);
    const iframeUrl='atelier-plus.html?embedded=1&tab='+encodeURIComponent(tab);
    return `<section class="pp-atelier-integrated"><div class="pp-atelier-heading"><p class="eyebrow">PRINTPILOT 3D · ATELIER</p><h1>${esc(pages[p])}</h1><p>Les changements sont enregistrés dans Firebase. Aucun changement automatique au stock principal depuis une demande Boutique.</p></div><iframe id="pp-atelier-frame" title="${esc(pages[p])}" src="${iframeUrl}" loading="eager" referrerpolicy="same-origin" sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-downloads allow-popups" scrolling="no"></iframe></section>`;
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin || !event.data || event.data.source!=='printpilot-atelier')return;
    const iframe=document.getElementById('pp-atelier-frame');
    if(!iframe || event.source!==iframe.contentWindow)return;
    if(event.data.type==='height' && Number.isFinite(event.data.height))iframe.style.height=Math.max(650,Math.min(24000,Math.ceil(event.data.height)+28))+'px';
    if(event.data.type==='import-boutique-request')jjImportBoutiqueRequest(event.data.request).then(ok=>jjBoutiqueFlowReply(event.data.request?.id,ok?'reviewed':'',ok?'':'Impossible de sauvegarder cette demande.')).catch(e=>jjBoutiqueFlowReply(event.data.request?.id,'',e.message));
    if(event.data.type==='approve-boutique-quote')jjApproveBoutiqueQuote(event.data.request);
    if(event.data.type==='validate-boutique-payment')jjValidateBoutiquePayment(event.data.request);
    if(event.data.type==='open-custom-order'){location.hash='#commandes-perso';setTimeout(()=>{const card=document.querySelector('[data-custom-order-id]');const wanted=[...document.querySelectorAll('[data-custom-order-id]')].find(el=>el.dataset.customOrderId===event.data.id);wanted?.scrollIntoView({block:'center',behavior:'smooth'});},80);}
  });

 function jjBoutiqueFlowReply(requestId,nextStatus,error='',quoteDetails=null){const iframe=document.getElementById('pp-atelier-frame');iframe?.contentWindow?.postMessage({source:'jj3d-admin-flow',requestId,nextStatus,error,quoteDetails},location.origin);}
 async function jjApproveBoutiqueQuote(r){
  const o=customOrders().find(x=>x.boutiqueRequestId===r?.id);
  if(!o){jjBoutiqueFlowReply(r?.id,'','Importe d’abord cette demande.');return;}
  if(o.clientApproval!=='approved'){jjBoutiqueFlowReply(r.id,'','Modifie la commande dans JJ3D : indique « Modèle et prix approuvés » avant de demander le paiement.');return;}
  if(!(jjCustomOrderTotal(o)>0)){jjBoutiqueFlowReply(r.id,'','Indique un prix convenu supérieur à zéro dans la commande.');return;}
  const inv=(extras.invoices||[]).find(i=>i.customOrderId===o.id);
  if(!inv||inv.status==='cancelled'){jjBoutiqueFlowReply(r.id,'','Prépare une facture brouillon valide avant paiement.');return;}
  jjBoutiqueFlowReply(r.id,'awaiting_payment','',{quoteTotal:jjCustomOrderTotal(o),quoteInvoiceNumber:inv.number||'',quotePreviewUrl:o.previewUrl||''});notify('✓ Prix et lien d’aperçu disponibles côté Boutique. Le client doit payer là-bas.');
 }
 // v4.11.40 — import privé d'une demande Boutique, sans création anticipée d'impression ni de vente.
 async function jjImportBoutiqueRequest(r){
  if(!r||!r.id||!r.customer||!r.item){notify('Demande Boutique incomplète.',true);return;}
  const existing=customOrders().find(x=>x.boutiqueRequestId===r.id);
  if(existing){notify('Demande déjà importée, aucune copie créée. Ouvre Commandes personnalisées pour la consulter.');return true;}
  const now=new Date().toISOString();const id='boutique-'+String(r.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70);
  const order={id,number:'JJ-B-'+String(r.id).slice(0,9).toUpperCase(),boutiqueRequestId:r.id,source:'boutique',productionHold:true,createdAt:now,updatedAt:now,orderedAt:now.slice(0,10),customer:String(r.customer).slice(0,120),contact:[r.phone,r.email].filter(Boolean).join(' · '),phone:r.phone||'',email:r.email||'',item:String(r.item).slice(0,160),quantity:Math.max(1,Math.min(300,Number(r.quantity)||1)),colors:String(r.colors||'').slice(0,160),filamentType:'',dueAt:String(r.dueAt||''),notes:String(r.note||'').slice(0,2000),price:0,deposit:0,status:'new',delivery:'boutique',paymentCollector:'boutique',boutiqueCommissionPercent:30,clientApproval:'pending',hasPhoto:!!r.photo,filamentPurchased:false,filamentChargePercent:50,filamentChargeMode:'extra',dimensionShape:'cylinder',dimensionUnit:'mm',dimensionRaw:{},dimensionMm:{}};
  const invoice=jjInvoiceForOrder(order);
  if(!persistExtras({...extras,customOrders:[...customOrders(),order],invoices:[...(extras.invoices||[]),invoice]})){notify('Échec de la sauvegarde de la demande.',true);return false;}
  if(typeof r.photo==='string'&&r.photo.startsWith('data:image/jpeg;base64,')){
   try{await setPhoto('custom-order:'+id,r.photo);}catch(err){console.warn('Photo importée non sauvegardée',err);notify('Commande importée, mais photo à recharger.',true);}
  }
  notify('✓ Demande Boutique importée. Ouvre Commandes personnalisées pour préparer la soumission et l’aperçu.');return true;
 }
 async function jjValidateBoutiquePayment(r){
  if(!r?.id)return;
  const o=customOrders().find(x=>x.boutiqueRequestId===r.id);
  if(!o){notify('Importe cette demande dans Commandes personnalisées avant de valider le paiement.',true);return;}
  if(o.clientApproval!=='approved'){notify('Le modèle et le prix doivent être confirmés avant de valider la commande.',true);return;}
  const inv=(extras.invoices||[]).find(x=>x.customOrderId===o.id);
  if(!inv){notify('Facture liée introuvable.',true);return;}
  if(r.status!=='payment_reported'){notify('Aucun paiement déclaré par la Boutique.',true);return;}
  const due=jjCustomOrderTotal(o),received=Number(r.paymentAmount||0);if(received+0.01<due){notify('Montant insuffisant : '+money(received)+' déclaré pour un total de '+money(due)+'. Vérifie la différence avant de valider.',true);return;}
  if(!confirm('As-tu réellement vérifié le paiement de '+o.customer+' reçu par la Boutique? Cela marquera la facture PAYÉE et autorisera la production.'))return;
  const when=new Date().toISOString(),date=String(r.paymentDate||when.slice(0,10));
  const updatedInvoice={...inv,status:'paid',paidDate:date,paymentMethod:'Boutique — '+String(r.paymentMethod||'non précisé'),updatedAt:when,history:[...(inv.history||[]),{at:when,action:'Paiement Boutique vérifié par administrateur',status:'paid'}]};
  const updatedOrder={...o,productionHold:false,paymentValidatedAt:when,status:'approved',updatedAt:when};
  if(!persistExtras({...extras,invoices:(extras.invoices||[]).map(x=>x.id===inv.id?updatedInvoice:x),customOrders:customOrders().map(x=>x.id===o.id?updatedOrder:x)})){notify('Impossible de valider le paiement.',true);return;}
  try{await window.JJ3DSyncOrderQueue?.(updatedOrder);}catch(e){notify('Facture payée, mais la tâche À imprimer doit être vérifiée : '+e.message,true);}
  jjBoutiqueFlowReply(r.id,'paid');notify('✓ Paiement Boutique vérifié, facture PAYÉE et impression autorisée. Consulte À imprimer.');
 }
 // v4.11.6 — Registre des imprimantes, construit sur les vrais journaux d'impression.
 // Les noms correspondent à ceux enregistrés dans les impressions. Pas de statut live inventé.
 const BASE_PRINTERS=['Anycubic Kobra X','Ender-3 V2 Neo','Qidi X-Plus 3'];
 const printerProfiles=()=>Array.isArray(extras.printers)?extras.printers:[];
 function printerNames(){return [...new Set([...BASE_PRINTERS,...printerProfiles().map(p=>p.name),...prints.map(p=>p.printer),...offEntries().map(e=>e.printer)].map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));}
 function printerHistory(name){
  const entries=prints.filter(p=>p.status==='active' && p.printer===name).map(p=>({date:p.date||'',label:p.product||'Impression',minutes:safeNum(p.minutes),type:'Production',grams:(p.usage||[]).reduce((s,u)=>s+safeNum(u.grams),0)}));
  const excluded=new Set(offEntries().map(e=>e.linkedPrintId).filter(Boolean));
  const off=offEntries().filter(e=>e.printer===name).map(e=>({date:e.date||'',label:e.name||'Hors production',minutes:safeNum(e.minutes),type:e.kind==='failed'?'Échec':e.kind==='test'?'Test':'Personnel',grams:(e.usage||[]).reduce((s,u)=>s+safeNum(u.grams),0)}));
  return [...entries.filter(p=>!excluded.has(p.id)),...off].sort((a,b)=>b.date.localeCompare(a.date));
 }
 function printerPage(){
  const names=printerNames(),histories=names.map(name=>({name,history:printerHistory(name)}));
  const totalMinutes=histories.reduce((s,x)=>s+x.history.reduce((n,h)=>n+h.minutes,0),0);
  const totalPrints=histories.reduce((s,x)=>s+x.history.length,0);
  const failureCount=histories.reduce((s,x)=>s+x.history.filter(h=>h.type==='Échec').length,0);
  const cards=histories.map(({name,history})=>{
   const p=printerProfiles().find(p=>p.name===name)||{},mins=history.reduce((s,h)=>s+h.minutes,0),grams=history.reduce((s,h)=>s+h.grams,0),failed=history.filter(h=>h.type==='Échec').length;
   const recordedHours=mins/60,prior=Math.max(0,safeNum(p.priorHours)),lifetime=prior+recordedHours;
   const interval=safeNum(p.serviceInterval),remaining=interval>0?interval-(lifetime-Math.max(0,safeNum(p.lastServiceHours))):null;
   const status=p.status||'Non renseigné',statusClass=status==='Fonctionnelle'?'ok':'low';
   const last=history[0];
   return `<article class="pp-printer-card"><div class="pp-printer-heading"><div><span class="pp-printer-icon">🖨️</span><h2>${esc(name)}</h2><p>${esc(p.model||'Modèle non renseigné')}</p></div><span class="pill ${statusClass}">${esc(status)}</span></div>
     <div class="pp-printer-metrics"><div><small>Heures journalisées</small><strong>${clockDuration(mins)}</strong></div><div><small>Impressions suivies</small><strong>${number(history.length)}</strong></div><div><small>Filament suivi</small><strong>${number(grams,1)} g</strong></div><div><small>Échecs déclarés</small><strong>${number(failed)}</strong></div></div>
     <div class="pp-printer-info"><p><b>Compteur estimé :</b> ${number(lifetime,1)} h <small>(+ heures antérieures : ${number(prior,1)} h)</small></p>
     <p><b>Dernière activité suivie :</b> ${last?esc(last.date||'Date inconnue')+' — '+esc(last.label):'Aucune impression enregistrée'}</p>
     <p><b>Zone :</b> ${esc(p.location||'Non renseignée')} · <b>Volume :</b> ${esc(p.volume||'Non renseigné')}</p>
     <p><b>Matériaux :</b> ${esc(p.materials||'Non renseignés')}</p>
     <p><b>Entretien :</b> ${remaining===null?'Intervalle non défini':remaining<=0?'<span class="pp-service-due">À vérifier — seuil atteint</span>':number(remaining,1)+' h avant le prochain rappel estimé'}</p>
     ${p.notes?`<p><b>Notes :</b> ${esc(p.notes)}</p>`:''}</div>
     <div class="pp-printer-actions"><button type="button" class="primary-btn" data-printer-edit="${esc(name)}">✏ Modifier la fiche</button><button type="button" class="secondary-btn" data-printer-history="${esc(name)}">Historique</button><button type="button" class="secondary-btn" data-go="atelier-maintenance">🛠 Entretien</button></div></article>`;
  }).join('');
  return header('PARC MACHINES','Gestion des imprimantes','Fiches, utilisation et suivi basé sur tes impressions réellement enregistrées.',`<button type="button" class="primary-btn" id="add-printer">＋ Ajouter une imprimante</button>`)+warning()+
   `<div class="stats-grid three">${statCard('🖨️',number(names.length),'Imprimantes répertoriées')}${statCard('⏱',clockDuration(totalMinutes),'Temps suivi')}${statCard('▤',number(totalPrints),'Activités suivies')}${statCard('⚠',number(failureCount),'Échecs déclarés')}</div>
    <div class="notice">ℹ Les heures sont calculées à partir des impressions et activités hors production enregistrées dans PrintPilot. Le compteur réel de la machine, les états et les rappels d’entretien doivent être renseignés manuellement. Aucune connexion en direct à Anycubic ou Klipper.</div>
    <div class="pp-printer-grid">${cards}</div>`;
 }
 function openPrinter(name=''){
  const f=document.getElementById('printer-profile-form');f.reset();const p=printerProfiles().find(x=>x.name===name)||{};
  for(const field of ['name','model','status','location','volume','materials','priorHours','lastServiceHours','serviceInterval','notes']){
   const input=f.elements.namedItem(field);if(input)input.value=p[field]??(field==='name'?name:'');
  }
  f.elements.namedItem('originalName').value=name;
  f.elements.namedItem('name').readOnly=Boolean(name); // conserver les liens avec les impressions enregistrées
  document.getElementById('printer-dialog-title').textContent=name?'Modifier '+name:'Ajouter une imprimante';
  document.getElementById('printer-profile-error').textContent='';
  document.getElementById('printer-profile-dialog').showModal();
 }
 function savePrinter(e){
  e.preventDefault();const f=e.currentTarget,raw=Object.fromEntries(new FormData(f));const name=String(raw.name||'').trim().slice(0,100),original=String(raw.originalName||'');
  const error=document.getElementById('printer-profile-error');
  if(!name){error.textContent='Indique un nom pour cette imprimante.';return;}
  if(!original&&printerNames().some(x=>x.toLowerCase()===name.toLowerCase())){error.textContent='Cette imprimante existe déjà. Modifie plutôt sa fiche.';return;}
  for(const key of ['priorHours','lastServiceHours','serviceInterval'])if(raw[key]!==''&&(!Number.isFinite(Number(raw[key]))||Number(raw[key])<0||Number(raw[key])>1000000)){error.textContent='Les heures et intervalles doivent être des nombres positifs.';return;}
  const profile={name,model:String(raw.model||'').trim().slice(0,100),status:String(raw.status||'Non renseigné'),location:String(raw.location||'').trim().slice(0,100),volume:String(raw.volume||'').trim().slice(0,80),materials:String(raw.materials||'').trim().slice(0,150),priorHours:Number(raw.priorHours)||0,lastServiceHours:Number(raw.lastServiceHours)||0,serviceInterval:Number(raw.serviceInterval)||0,notes:String(raw.notes||'').trim().slice(0,600)};
  const next=printerProfiles().filter(p=>p.name!==original&&p.name!==name);
  next.push(profile);
  if(!persistExtras({...extras,printers:next})){error.textContent='Sauvegarde impossible.';return;}
  document.getElementById('printer-profile-dialog').close();render();notify('✓ Fiche imprimante enregistrée');
 }
 function showPrinterHistory(name){
  const items=printerHistory(name);const container=document.getElementById('printer-history-content');
  document.getElementById('printer-history-title').textContent='Historique — '+name;
  container.innerHTML=items.length?items.slice(0,100).map(h=>`<div class="pp-printer-history-row"><div><b>${esc(h.label)}</b><small>${esc(h.date||'Date inconnue')} · ${esc(h.type)}</small></div><span>${clockDuration(h.minutes)} · ${number(h.grams,1)} g</span></div>`).join(''):'<p class="empty">Aucune impression enregistrée pour cette imprimante.</p>';
  document.getElementById('printer-history-dialog').showModal();
 }
  function placeholder(p){return header('PRINTPILOT 3D',pages[p], 'Une section du gestionnaire complet.')+`<section class="panel placeholder"><div class="placeholder-icon">⬡</div><h2>À venir</h2><p>On ajoutera ici les fonctionnalités de ${esc(pages[p].toLowerCase())}.</p><button type="button" class="primary-btn" data-go="filaments">Voir mes filaments</button></section>`;}
 
 // Commandes prises directement par l'atelier: privées, indépendantes des ventes déjà réalisées.
 let editingCustomOrderId=null;
 const customOrderStages={new:'Nouvelle demande',quoted:'Soumission envoyée',approved:'Confirmée',awaiting_payment:'Paiement à confirmer',printing:'En production',ready:'Prête',delivered:'Remise / livrée',cancelled:'Annulée'};
 const customOrders=()=>Array.isArray(extras.customOrders)?extras.customOrders:[];
 // Dimensions : saisie naturelle 1', 6\", 1' 6\", 30 cm, 304.8 mm, 12 in.
 function jjParseDimension(raw,defaultUnit='mm'){
  const s=String(raw||'').trim().toLowerCase().replace(/,/g,'.').replace(/′/g,"'").replace(/[″“”]/g,'"');
  if(!s)return null;
  const footInch=/^\s*(?:(\d+(?:\.\d+)?)\s*(?:'|ft|feet|pieds?))\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches|pouces?))?\s*$/i.exec(s);
  if(footInch)return +(Number(footInch[1])*304.8+Number(footInch[2]||0)*25.4).toFixed(2);
  const named=/^\s*(\d+(?:\.\d+)?)\s*(mm|millim[eè]tres?|cm|centim[eè]tres?|"|in|inch|inches|pouces?|ft|feet|pieds?|')\s*$/i.exec(s);
  if(named){const unit=named[2];const factor=unit.startsWith('mm')||unit.startsWith('milli')?1:unit==='cm'||unit.startsWith('centi')?10:unit==='"'||unit==='in'||unit.startsWith('inch')||unit.startsWith('pouce')?25.4:304.8;return +(Number(named[1])*factor).toFixed(2);}
  if(/^\d+(?:\.\d+)?$/.test(s)){const n=Number(s);const factor=defaultUnit==='cm'?10:defaultUnit==='in'?25.4:defaultUnit==='ft'?304.8:1;return +(n*factor).toFixed(2);}
  return NaN;
 }
 function jjDimensionsFromForm(f){
  const shape=f.elements.namedItem('dimensionShape').value,unit=f.elements.namedItem('dimensionUnit').value;
  const names=shape==='cylinder'?['height','diameter']:['length','width','height'];
  const raw={},mm={};
  for(const name of names){const val=f.elements.namedItem('dimension_'+name).value.trim();raw[name]=val;const converted=jjParseDimension(val,unit);if(Number.isNaN(converted))throw Error('Dimension invalide : '+name+'. Exemples : 1\', 6", 15 cm, 304.8 mm.');if(converted!==null){if(converted<=0)throw Error('Les dimensions doivent être positives.');mm[name]=converted;}}
  return {dimensionShape:shape,dimensionUnit:unit,dimensionRaw:raw,dimensionMm:mm};
 }
 function jjDimHtml(o){const raw=o.dimensionRaw||{},mm=o.dimensionMm||{},shape=o.dimensionShape||'cylinder';const keys=shape==='cylinder'?['height','diameter']:['length','width','height'];const labels={height:'Hauteur',diameter:'Diamètre',length:'Longueur',width:'Largeur'};const values=keys.filter(k=>raw[k]||mm[k]);return values.length?`<p><b>Dimensions :</b> ${values.map(k=>`${labels[k]} ${esc(raw[k]||'—')} → <strong>${esc(mm[k])} mm</strong>`).join(' · ')}</p>`:'';}
 function jjDimensionPreview(){const f=document.getElementById('custom-order-form'),out=document.getElementById('custom-dimension-preview');if(!f||!out)return;const shape=f.elements.namedItem('dimensionShape').value;f.querySelectorAll('[data-dimension-key]').forEach(el=>el.hidden=(shape==='cylinder'?!['height','diameter'].includes(el.dataset.dimensionKey):el.dataset.dimensionKey==='diameter'));try{const d=jjDimensionsFromForm(f),keys=d.dimensionShape==='cylinder'?['height','diameter']:['length','width','height'];const labels={height:'Hauteur',diameter:'Diamètre',length:'Longueur',width:'Largeur'};out.textContent=keys.filter(k=>d.dimensionMm[k]!=null).map(k=>labels[k]+' : '+d.dimensionMm[k]+' mm').join(' · ')||'Entre tes mesures pour voir les millimètres.';out.classList.remove('form-error');}catch(e){out.textContent=e.message;out.classList.add('form-error');}}
 // Prix fournisseur, taxes payées et frais de livraison : ces montants sont internes à JJ3D.
 function jjCents(n){return Math.round(Math.max(0,safeNum(n))*100);}
 function jjFilamentFullCost(o){return (jjCents(o?.filamentPurchasePrice)+jjCents(o?.filamentPurchaseTax)+jjCents(o?.filamentPurchaseShipping))/100;}
 function jjCustomOrderFee(o){return o?.filamentPurchased?Math.round(jjCents(jjFilamentFullCost(o))*Math.min(100,Math.max(0,safeNum(o.filamentChargePercent)))/100)/100:0;}
 function jjCustomOrderTotal(o){return (jjCents(o?.price)+(o?.filamentChargeMode==='included'?0:jjCents(jjCustomOrderFee(o))))/100;}
 function jjFilamentPurchaseToggle(){
  const f=document.getElementById('custom-order-form');if(!f)return;
  const yes=f.elements.namedItem('filamentPurchased').checked;
  const detail=document.getElementById('custom-order-filament-details');if(detail)detail.hidden=!yes;
  const preview=document.getElementById('custom-order-filament-preview');if(!preview)return;
  if(!yes){preview.innerHTML='<strong>Pas d’achat de filament spécial.</strong> Aucun supplément sur la facture.';return;}
  const v={filamentPurchased:true,filamentPurchasePrice:f.elements.namedItem('filamentPurchasePrice').value,filamentPurchaseTax:f.elements.namedItem('filamentPurchaseTax').value,filamentPurchaseShipping:f.elements.namedItem('filamentPurchaseShipping').value,filamentChargePercent:f.elements.namedItem('filamentChargePercent').value};
  const full=jjFilamentFullCost(v), fee=jjCustomOrderFee(v),pct=Math.max(0,Math.min(100,safeNum(v.filamentChargePercent)));
  const mode=f.elements.namedItem('filamentChargeMode').value;
  const base=Math.max(0,safeNum(f.elements.namedItem('price').value));
  preview.innerHTML='<div class="jj-filament-totals"><div><span>Coût de la bobine (taxes et livraison comprises)</span><b>'+money(full)+'</b></div><div><span>Part facturée au client ('+pct+' %)</span><b>'+money(fee)+'</b></div><div class="jj-filament-grand-total"><span>Supplément sur la facture</span><strong>'+money(mode==='extra'?fee:0)+'</strong></div><div><span>Total estimé de la facture</span><strong>'+money(base+(mode==='extra'?fee:0))+'</strong></div></div>'+(mode==='included'?'<small>Le supplément de '+money(fee)+' sera détaillé sur une ligne, mais déjà compris dans le prix convenu : aucun montant ajouté.</small>':'<small>Le client verra une ligne « Filament spécial » avec le montant facturé, sans ton prix d’achat fournisseur.</small>');
 }
 function jjInvoiceLinesFromOrder(o){
  const qty=Math.max(1,Number(o.quantity)||1),fee=jjCustomOrderFee(o),included=!!o.filamentPurchased&&o.filamentChargeMode==='included';
  // Facture: ligne du filament visible même si déjà inclus; on évite toute double facturation.
  const invoiceFee=included?Math.min(jjCents(o.price),jjCents(fee))/100:fee;
  const projectCents=jjCents(o.price)-(included?jjCents(invoiceFee):0);
  const lines=[{name:o.item+' — '+(o.colors||o.filamentType||'commande personnalisée'),qty:1,price:projectCents/100}];
  if(o.filamentPurchased){
   const material=[o.filamentType,o.colors].filter(Boolean).join(' / ');
   const label='Filament acheté spécialement'+(material?' — '+material:'')+' ('+Math.min(100,Math.max(0,safeNum(o.filamentChargePercent)))+' % des frais d’achat'+(included?', inclus dans le projet':'')+')';
   lines.push({name:label,qty:1,price:invoiceFee});
  }
  return lines;
 }
 function jjInvoiceForOrder(o,previous){const now=new Date().toISOString(),date=now.slice(0,10);const invoices=extras.invoices||[];const same=previous||invoices.find(x=>x.customOrderId===o.id);
   if(same&&same.status!=='draft')return same;
   const numbers=invoices.map(x=>String(x.number||'')).filter(x=>x.startsWith('JJ3D-'+now.slice(0,4)+'-')).map(x=>parseInt(x.split('-').at(-1),10)||0);
   const number=same?.number||('JJ3D-'+now.slice(0,4)+'-'+String(Math.max(0,...numbers)+1).padStart(4,'0'));
   const selectedEmail=o.email||o.contact||'';const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selectedEmail)?selectedEmail:'';
   const summary='Commande '+o.number+' · '+(o.filamentType||'Filament à déterminer')+' · '+(o.colors||'Couleur à préciser')+(o.filamentPurchased?' · Filament spécial commandé pour ce projet ('+safeNum(o.filamentChargePercent)+' % facturé au client).':'')+' · Acompte noté : '+money(o.deposit||0)+' (à confirmer manuellement dans Factures).';
   return {...same,id:same?.id||'inv-'+crypto.randomUUID(),number,date:same?.date||date,due:same?.due||o.dueAt||date,status:'draft',customOrderId:o.id,clientName:o.customer,clientEmail:same?.clientEmail||email,clientAddress:same?.clientAddress||'',lines:jjInvoiceLinesFromOrder(o),discount:same?.discount||0,shipping:same?.shipping||0,taxRate:same?.taxRate||0,notes:summary,createdAt:same?.createdAt||now,updatedAt:now,history:[...(same?.history||[]),{at:now,action:same?'Brouillon ajusté depuis la commande '+o.number:'Brouillon généré depuis la commande '+o.number,status:'draft'}]};
 }
 function openCustomOrderInvoice(id){const o=customOrders().find(x=>x.id===id);if(!o)return;let inv=(extras.invoices||[]).find(i=>i.customOrderId===id);if(!inv){inv=jjInvoiceForOrder(o);if(!persistExtras({...extras,invoices:[...(extras.invoices||[]),inv]})){notify('Impossible de créer la facture.',true);return;}}if(page()!=='factures'){location.hash='factures';render();}window.JJ3DInvoices.openInvoice(inv.id);}
 function customOrdersPage(){
  const orders=customOrders().slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const active=orders.filter(x=>!['delivered','cancelled'].includes(x.status));
  const now=new Date();const today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  return header('SUIVI CLIENTS','Commandes personnalisées','Enregistre ici les demandes reçues par téléphone, en personne ou sur Messenger. Rien ne sera oublié.')+
   `<div class="stats-grid three">${statCard('📋',active.length,'Commandes actives')}${statCard('⏳',orders.filter(x=>x.status==='printing').length,'En production')}${statCard('🎁',orders.filter(x=>x.status==='ready').length,'Prêtes à remettre')}</div>`+
   `<div class="jj-custom-orders-toolbar"><button type="button" class="primary-btn" id="custom-order-add">＋ Ajouter une commande</button><span class="small-hint">Retrouve et modifie tes commandes ci-dessous. Le formulaire s’ouvre seulement quand tu en as besoin.</span></div>`+
   `<dialog id="custom-order-dialog" class="dialog jj-custom-order-panel jj-custom-order-dialog" aria-labelledby="custom-order-form-title"><div class="jj-custom-order-modal-heading"><div><h2 id="custom-order-form-title">＋ Nouvelle commande personnalisée</h2><p>Complète les détails de ton client, du projet et du filament. Tu pourras modifier la commande plus tard.</p></div><button type="button" class="close" id="custom-order-close" aria-label="Fermer le formulaire" title="Fermer">×</button></div>
   <form id="custom-order-form" novalidate><input type="hidden" name="orderId"><div class="form-grid">
   <label>Nom du client *<input name="customer" maxlength="120" required placeholder="Ex. Marie Tremblay"></label>
   <label>Contact (téléphone, courriel ou Messenger)<input name="contact" maxlength="180" placeholder="Ex. Messenger — Marie"></label>
   <label>Produit / projet demandé *<input name="item" maxlength="160" required placeholder="Ex. Vase personnalisé avec nom"></label>
   <label>Produit existant (facultatif)<select name="productId"><option value="">Commande spéciale / hors catalogue</option>${extras.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · #${esc(p.shopId)}</option>`).join('')}</select></label>
   <label>Quantité *<input name="quantity" type="number" min="1" max="999" value="1" required></label>
   <label>Couleur(s) demandée(s)<input name="colors" maxlength="160" placeholder="Ex. Noir et blanc"></label>
   <label>Type de filament<select name="filamentType"><option value="">À déterminer</option><option>PLA</option><option>PLA+</option><option>PETG</option><option>TPU</option><option>ABS</option><option>ASA</option><option>PVA</option><option>Autre</option></select></label>
   </div><fieldset class="jj-dimension-fieldset"><legend>📐 Dimensions du produit</legend><div class="form-grid">
   <label>Forme<select name="dimensionShape"><option value="cylinder">Rond / vase : hauteur et diamètre</option><option value="box">Rectangulaire : longueur, largeur et hauteur</option></select></label>
   <label>Unité si aucun symbole n’est écrit<select name="dimensionUnit"><option value="mm">Millimètres (mm)</option><option value="cm">Centimètres (cm)</option><option value="in">Pouces (in)</option><option value="ft">Pieds (ft)</option></select></label>
   <label data-dimension-key="height">Hauteur<input name="dimension_height" inputmode="text" placeholder="Ex. 1' ou 304.8 mm"></label>
   <label data-dimension-key="diameter">Diamètre<input name="dimension_diameter" inputmode="text" placeholder='Ex. 6" ou 15.24 cm'></label>
   <label data-dimension-key="length" hidden>Longueur<input name="dimension_length" inputmode="text" placeholder='Ex. 12"'></label>
   <label data-dimension-key="width" hidden>Largeur<input name="dimension_width" inputmode="text" placeholder='Ex. 6"'></label>
   </div><p class="small-hint">Tu peux écrire <b>1'</b> pour un pied, <b>6"</b> pour six pouces ou <b>1' 6"</b> pour un pied et six pouces. Les millimètres sont calculés automatiquement.</p><output id="custom-dimension-preview" class="jj-dimension-preview" aria-live="polite">Entre tes mesures pour voir les millimètres.</output></fieldset>
   <fieldset class="jj-dimension-fieldset jj-filament-purchase-fieldset"><legend>🧵 Achat de filament spécial — détails et facture</legend>
   <label class="jj-inline-check"><input name="filamentPurchased" type="checkbox" value="yes"> <strong>Oui, je dois acheter une couleur / bobine spécialement pour cette commande</strong></label>
   <div id="custom-order-filament-details" hidden>
    <p class="small-hint">Entre les montants que tu paieras réellement au fournisseur. Ces prix d’achat restent privés; le client voit seulement le supplément que tu décides de lui facturer.</p>
    <div class="form-grid">
     <label>Prix du filament, avant taxes ($)<input name="filamentPurchasePrice" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex. 29.99"></label>
     <label>Taxes payées à l'achat ($)<input name="filamentPurchaseTax" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex. 3.90"></label>
     <label>Livraison du filament ($)<input name="filamentPurchaseShipping" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex. 0.00"></label>
     <label>Pourcentage facturé au client (%)<input name="filamentChargePercent" type="number" min="0" max="100" step="1" inputmode="decimal" value="50" placeholder="Ex. 50"></label>
     <label>Traitement sur la facture<select name="filamentChargeMode"><option value="extra">Ajouter le supplément au prix du projet</option><option value="included">Le supplément est déjà inclus dans le prix convenu</option></select></label>
    </div>
   </div>
   <output id="custom-order-filament-preview" class="jj-dimension-preview jj-filament-preview" aria-live="polite">Pas d’achat de filament spécial. Aucun supplément sur la facture.</output>
   <p class="small-hint">JJ3D affichera une ligne « Filament acheté spécialement » sur la facture avec le montant facturé au client. Les taxes Amazon et les taxes facturées au client sont deux choses différentes : le taux de taxe de la facture reste réglable séparément.</p>
   </fieldset>
   <div class="form-grid">
   <label>Date de la demande<input name="orderedAt" type="date" value="${today}"></label>
   <label>Date souhaitée par le client<input name="dueAt" type="date"></label>
   <label>Prix total convenu ($)<input name="price" type="number" min="0" max="100000" step="0.01" placeholder="Ex. 35.00"></label>
   <label>Acompte reçu ($)<input name="deposit" type="number" min="0" max="100000" step="0.01" placeholder="Ex. 10.00"></label>
   <label>Mode de remise<select name="delivery"><option value="pickup">Ramassage</option><option value="boutique">Boutique</option><option value="shipping">Expédition</option><option value="other">À déterminer</option></select></label>
   <label>État de la commande<select name="status">${Object.entries(customOrderStages).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
   <label>Validation du client<select name="clientApproval"><option value="pending">En attente de confirmation</option><option value="approved">Modèle et prix approuvés</option><option value="changes">Modifications demandées</option></select></label>
   <label>Fichier / aperçu envoyé au client (lien facultatif)<input name="previewUrl" type="url" maxlength="600" placeholder="https://…"></label>
   <label>Encaissement<select name="paymentCollector"><option value="direct">Paiement direct à JJ3D</option><option value="boutique">Paiement encaissé à la Boutique</option></select></label>
   <label>Commission Boutique (%)<input name="boutiqueCommissionPercent" type="number" min="0" max="100" step="0.5" value="30"></label>
   <label class="jj-inline-check"><input name="boutiqueSettlementReceived" type="checkbox"> <strong>La Boutique m’a remis ma part du paiement</strong></label>
   <label>Date du règlement de la Boutique<input name="boutiqueSettlementDate" type="date"></label>
   </div><label>Notes / instructions (dimensions, personnalisation, conversation…)<textarea name="notes" maxlength="2000" rows="4" placeholder="Détails à ne pas oublier…"></textarea></label>
   <div class="jj-order-photo-grid">
    <div class="jj-order-photo-field"><strong>📷 Photo du produit demandé</strong><label class="jj-photo-upload">
      <input type="file" name="photo" accept="image/*" aria-label="Choisir la photo du produit demandé">
      <span class="jj-photo-upload-icon" aria-hidden="true">🖼️</span><span class="jj-photo-upload-title">Choisir une photo</span>
      <span class="jj-photo-upload-subtitle">Photo, modèle ou capture du slicer</span>
    </label><div class="jj-upload-result" data-upload-result="photo" aria-live="polite">Aucune nouvelle photo sélectionnée</div><img class="jj-upload-preview" data-upload-preview="photo" alt="Aperçu du modèle demandé" hidden></div>
    <div class="jj-order-photo-field"><strong>🎨 Photo de la couleur / du filament</strong><label class="jj-photo-upload">
      <input type="file" name="colorPhoto" accept="image/*" aria-label="Choisir la photo de couleur ou de filament">
      <span class="jj-photo-upload-icon" aria-hidden="true">🎨</span><span class="jj-photo-upload-title">Choisir une photo</span>
      <span class="jj-photo-upload-subtitle">Bobine ou couleur exacte demandée</span>
    </label><div class="jj-upload-result" data-upload-result="colorPhoto" aria-live="polite">Aucune nouvelle photo sélectionnée</div><img class="jj-upload-preview" data-upload-preview="colorPhoto" alt="Aperçu de la couleur demandée" hidden></div>
   </div>
   <p class="small-hint">La photo est stockée séparément et synchronisée avec Firebase si tu es connecté. Cette commande ne retire pas automatiquement de stock. Une facture brouillon privée est automatiquement associée à son enregistrement; elle n’est ni envoyée ni marquée payée.</p>
   <p id="custom-order-edit-hint" class="small-hint" hidden></p>
   <p id="custom-order-error" class="form-error" role="alert" aria-live="assertive"></p><div class="actions"><button class="primary-btn" type="submit" id="custom-order-submit">💾 Enregistrer la commande</button><button class="secondary-btn" type="button" id="custom-order-reset">Annuler</button></div></form></dialog>`+
   `<section class="panel"><div class="panel-head"><div><h2>Mes commandes (${orders.length})</h2><p>Les commandes terminées restent dans l'historique.</p></div></div>
   <div class="jj-custom-orders-grid">${orders.map(o=>`<article class="inventory-card jj-customer-order" data-custom-order-id="${esc(o.id)}"><div class="inventory-card-head"><div><small>${esc(o.number||'Commande')}</small><h3>${esc(o.item||'Projet')} × ${esc(o.quantity||1)}</h3></div><span class="pill ${o.status==='cancelled'?'low':'ok'}">${esc(customOrderStages[o.status]||o.status||'Nouvelle')}</span></div>
   <div class="jj-customer-order-overview"><span>👤 ${esc(o.customer||'Client non précisé')}</span><span>🧵 ${esc(o.filamentType||'Filament à préciser')} · ${esc(o.colors||'Couleur à préciser')}</span><span>💰 ${money(jjCustomOrderTotal(o))}</span><span>🧾 ${esc(({draft:'Paiement en attente',sent:'Paiement en attente',paid:'Payée',cancelled:'Facture annulée'})[(extras.invoices||[]).find(i=>i.customOrderId===o.id)?.status]||'Paiement en attente')}</span></div><details class="jj-customer-order-expand"><summary>Voir les détails de la commande</summary><div class="jj-customer-order-expanded"><div class="jj-order-photo-grid"><div><small>Modèle demandé</small><div class="jj-custom-order-photo" data-custom-order-photo="${esc(o.id)}">${o.hasPhoto?'📸 Chargement…':'Aucune photo'}</div></div><div><small>Couleur demandée</small><div class="jj-custom-order-photo" data-custom-order-color-photo="${esc(o.id)}">${o.hasColorPhoto?'🎨 Chargement…':'Aucune photo'}</div></div></div>
   <div class="jj-order-facts"><div><small>👤 Client</small><strong>${esc(o.customer||'—')}</strong><span>${esc(o.contact||'Aucun contact')}</span></div><div><small>🧵 Filament</small><strong>${esc(o.filamentType||'À déterminer')} · ${esc(o.colors||'À préciser')}</strong><span>${o.filamentPurchased?'Bobine spéciale à acheter':'Stock habituel'}</span></div><div><small>📅 Dates</small><strong>Demande : ${esc(o.orderedAt||'—')}</strong><span>Souhaitée : ${esc(o.dueAt||'—')}</span></div><div><small>📐 Dimensions</small><strong>${o.dimensionShape==='box'?'Rectangulaire':'Rond / vase'}</strong><span>${Object.entries(o.dimensionMm||{}).map(([k,v])=>esc(({height:'H',diameter:'Ø',length:'L',width:'l'})[k]||k)+' '+esc(v)+' mm').join(' · ')||'À préciser'}</span></div></div>
   <div class="jj-order-financial"><h4>🧾 Résumé de la facture</h4><div class="jj-order-money-line"><span>Fabrication : ${esc(o.item||'Projet')}</span><strong>${money(o.filamentChargeMode==='included'?Math.max(0,safeNum(o.price)-jjCustomOrderFee(o)):safeNum(o.price))}</strong></div>${o.filamentPurchased?`<div class="jj-order-money-line"><span>Filament spécial (${safeNum(o.filamentChargePercent)} % de ${money(jjFilamentFullCost(o))})</span><strong>${money(jjCustomOrderFee(o))}</strong></div>`:''}<div class="jj-order-money-line jj-order-money-total"><span>Total convenu hors taxes</span><strong>${money(jjCustomOrderTotal(o))}</strong></div><div class="jj-order-money-line"><span>Acompte déclaré</span><strong>${money(o.deposit||0)}</strong></div><div class="jj-order-money-line"><span>Solde indicatif</span><strong>${money(Math.max(0,jjCustomOrderTotal(o)-safeNum(o.deposit)))}</strong></div><div class="jj-order-money-line"><span>Facture liée</span><strong>${esc((extras.invoices||[]).find(i=>i.customOrderId===o.id)?.number||'À créer')} · ${esc((extras.invoices||[]).find(i=>i.customOrderId===o.id)?.status||'brouillon')}</strong></div></div>
   <div class="jj-order-facts"><div><small>✓ Validation client</small><strong>${esc(({approved:'Modèle et prix approuvés',changes:'Corrections demandées',pending:'En attente'})[o.clientApproval]||'En attente')}</strong>${o.previewUrl?`<a href="${esc(o.previewUrl)}" target="_blank" rel="noopener noreferrer">Voir l’aperçu envoyé</a>`:''}</div><div><small>💳 Paiement</small><strong>${o.paymentCollector==='boutique'?'Encaissé par la Boutique':'Direct JJ3D'}</strong><span>Commission Boutique : ${safeNum(o.boutiqueCommissionPercent||0)} %</span>${o.paymentCollector==='boutique'?`<span>${o.boutiqueSettlementReceived?'✓ Règlement reçu de la Boutique'+(o.boutiqueSettlementDate?' le '+esc(o.boutiqueSettlementDate):''):'⏳ Règlement Boutique à recevoir'}</span><strong>Part JJ3D estimée : ${money(jjCustomOrderTotal(o)*(1-safeNum(o.boutiqueCommissionPercent||0)/100))}</strong>`:''}</div></div>
   <div class="jj-order-notes"><strong>📝 Notes de production</strong><p>${esc(o.notes||'Aucune note')}</p></div></div></details><div class="actions jj-order-card-actions"><button type="button" class="secondary-btn" data-edit-custom-order="${esc(o.id)}">✎ Modifier la commande</button><button type="button" class="secondary-btn" data-invoice-custom-order="${esc(o.id)}">🧾 Ouvrir la facture</button><button type="button" class="secondary-btn" data-queue-custom-order="${esc(o.id)}">🖨️ À imprimer</button><button type="button" class="secondary-btn danger" data-delete-custom-order="${esc(o.id)}">Supprimer</button><select class="jj-order-status-select" aria-label="Statut de la commande" data-custom-status="${esc(o.id)}">${Object.entries(customOrderStages).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div></article>`).join('')||'<p class="empty">Aucune commande pour le moment. Clique sur « + Ajouter une commande » pour commencer!</p>'}</div></section>`;
 }
 async function jjQueuePhotoFromOrder(src){
  const img=new Image();img.src=src;await img.decode();
  const canvas=document.createElement('canvas'),ratio=Math.min(1,760/Math.max(img.naturalWidth,img.naturalHeight));
  canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.77,.63,.49,.35]){const out=canvas.toDataURL('image/jpeg',quality);if(out.length<175000)return out;}
  throw Error('Photo trop volumineuse pour la file; ajoute-la depuis À imprimer.');
 }
 async function saveCustomOrder(event){
  event.preventDefault();
  const f=event.target, e=document.getElementById('custom-order-error'), button=f.querySelector('#custom-order-submit');
  // Le submit est écouté sur document; currentTarget serait document et non le formulaire.
  if(!(f instanceof HTMLFormElement)||f.id!=='custom-order-form')return false;
  if(button?.disabled)return;
  const fail=(message,field)=>{e.textContent=message;e.setAttribute('role','alert');notify('Commande non enregistrée : '+message,true);if(field){const el=f.elements.namedItem(field);if(el?.focus)el.focus();}return false;};
  e.textContent='';
  try{
   const v=Object.fromEntries(new FormData(f).entries());
   const customer=String(v.customer||'').trim(), item=String(v.item||'').trim();
   if(!customer)return fail('Entre le nom du client.','customer');
   if(!item)return fail('Entre le produit ou projet demandé.','item');
   const qty=Number(v.quantity);
   if(!Number.isInteger(qty)||qty<1||qty>999)return fail('La quantité doit être entre 1 et 999.','quantity');
   const priceEntered=String(v.price||'').trim()!=='';
   const price=priceEntered?Number(v.price):0;
   const deposit=String(v.deposit||'').trim()===''?0:Number(v.deposit);
   if(!Number.isFinite(price)||price<0||!Number.isFinite(deposit)||deposit<0)return fail('Vérifie les montants du prix et de l’acompte.','price');
   // Une commande peut être reçue avant qu'un prix final soit établi.
   if(priceEntered&&deposit>price)return fail('L’acompte ne peut pas dépasser le prix total convenu.','deposit');
   let dimensions;
   try{dimensions=jjDimensionsFromForm(f);}catch(error){return fail(error.message);}
   const filamentPurchased=!!f.elements.namedItem('filamentPurchased')?.checked;
   const filamentPurchasePrice=filamentPurchased?Number(v.filamentPurchasePrice||0):0;
   const filamentPurchaseTax=filamentPurchased?Number(v.filamentPurchaseTax||0):0;
   const filamentPurchaseShipping=filamentPurchased?Number(v.filamentPurchaseShipping||0):0;
   const filamentChargePercent=filamentPurchased?Number(v.filamentChargePercent||0):0;const filamentChargeMode=String(v.filamentChargeMode||'extra');
   if(!Number.isFinite(filamentChargePercent)||filamentChargePercent<0||filamentChargePercent>100)return fail('Le pourcentage du filament doit être entre 0 et 100.','filamentChargePercent');
   if(!Number.isFinite(filamentPurchasePrice)||filamentPurchasePrice<0)return fail('Le prix du filament doit être égal ou supérieur à 0.','filamentPurchasePrice');
   if(!Number.isFinite(filamentPurchaseTax)||filamentPurchaseTax<0)return fail('Les taxes payées doivent être égales ou supérieures à 0.','filamentPurchaseTax');
   if(!Number.isFinite(filamentPurchaseShipping)||filamentPurchaseShipping<0)return fail('La livraison du filament doit être égale ou supérieure à 0.','filamentPurchaseShipping');
   if(filamentPurchased&&filamentChargeMode==='included'&&jjCents(price)<jjCents(jjCustomOrderFee({filamentPurchased,filamentPurchasePrice,filamentPurchaseTax,filamentPurchaseShipping,filamentChargePercent})))return fail('La part de filament incluse dépasse le prix du projet. Réduis le pourcentage ou choisis « Ajouter le supplément ».','filamentChargePercent');
   const old=customOrders().find(x=>x.id===v.orderId),now=new Date().toISOString();
   const id=old?.id||('CO-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
   const row={...old,id,number:old?.number||'JJ-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-7),customer,contact:String(v.contact||'').trim(),item,productId:String(v.productId||''),quantity:qty,colors:String(v.colors||'').trim(),filamentType:String(v.filamentType||'').trim(),orderedAt:String(v.orderedAt||''),dueAt:String(v.dueAt||''),price,deposit,delivery:String(v.delivery||'pickup'),status:String(v.status||'new'),clientApproval:String(v.clientApproval||'pending'),previewUrl:String(v.previewUrl||'').trim().slice(0,600),paymentCollector:String(v.paymentCollector||'direct'),boutiqueCommissionPercent:Math.max(0,Math.min(100,Number(v.boutiqueCommissionPercent)||0)),boutiqueSettlementReceived:!!f.elements.namedItem('boutiqueSettlementReceived')?.checked,boutiqueSettlementDate:String(v.boutiqueSettlementDate||''),notes:String(v.notes||'').trim(),createdAt:old?.createdAt||now,updatedAt:now,hasPhoto:old?.hasPhoto||false,hasColorPhoto:old?.hasColorPhoto||false,filamentPurchased,filamentPurchasePrice,filamentPurchaseTax,filamentPurchaseShipping,filamentChargePercent,filamentChargeMode,...dimensions};
   const next=old?customOrders().map(x=>x.id===id?row:x):[...customOrders(),row];
   // Sauvegarde atomique de la commande et de son brouillon : une seule écriture dans les données privées.
   const existingInvoice=(extras.invoices||[]).find(i=>i.customOrderId===id);
   const linkedInvoice=jjInvoiceForOrder(row,existingInvoice);
   const nextInvoices=existingInvoice?(extras.invoices||[]).map(i=>i.id===existingInvoice.id?linkedInvoice:i):[...(extras.invoices||[]),linkedInvoice];
   if(!persistExtras({...extras,customOrders:next,invoices:nextInvoices}))return fail('La commande et sa facture ne peuvent pas être sauvegardées. Vérifie l’espace disponible.');
   let queueWarning='';try{if(window.JJ3DSyncOrderQueue){await window.JJ3DSyncOrderQueue(row);}else{queueWarning=' La tâche À imprimer sera liée après la connexion Firebase.';}}catch(queueErr){console.error('Liaison commande → À imprimer',queueErr);queueWarning=' ⚠ La commande est sauvée, mais la tâche À imprimer n’a pas été synchronisée : '+String(queueErr.message||queueErr)+'.';}
   const photo=f.elements.namedItem('photo')?.files?.[0];
   const colorPhoto=f.elements.namedItem('colorPhoto')?.files?.[0];
   let photoWarning='';
   if(button){button.disabled=true;button.textContent='Enregistrement des photos…';}
   for(const [selected,key,flag,label] of [[photo,'custom-order:'+id,'hasPhoto','du produit'],[colorPhoto,'custom-order-color:'+id,'hasColorPhoto','de la couleur']]){
    if(!selected)continue;
    try{const src=await fileToPhoto(selected);await setPhoto(key,src);row[flag]=true;if(!persistExtras({...extras,customOrders:customOrders().map(x=>x.id===id?row:x)}))throw Error('sauvegarde des photos impossible');
     if(flag==='hasPhoto'&&window.JJ3DSyncOrderQueuePhoto){try{await window.JJ3DSyncOrderQueuePhoto(id,await jjQueuePhotoFromOrder(src));}catch(photoQueueError){console.warn('Photo À imprimer non synchronisée :',photoQueueError);photoWarning+=' Photo du produit enregistrée sur la commande, mais pas encore dans À imprimer.';}}
    }
    catch(err){console.error('Photo de commande',label,err);photoWarning+=' La photo '+label+' n’a pas pu être sauvegardée.';}
   }
   editingCustomOrderId=null;render();
   notify('✓ Commande et facture brouillon enregistrées!'+(existingInvoice&&existingInvoice.status!=='draft'?' La facture déjà envoyée/payée n’a pas été modifiée.':'')+photoWarning+queueWarning,!!(photoWarning||queueWarning));
   document.querySelector(`[data-custom-order-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
   return true;
  }catch(err){console.error('Enregistrement commande personnalisée:',err);return fail('Une erreur inattendue est survenue : '+(err?.message||'inconnue')+'. Aucune modification supplémentaire ne sera faite.');}
  finally{if(button?.isConnected){button.disabled=false;button.textContent='💾 Enregistrer la commande';}}
 }
 function jjResetOrderPhotoInputs(row){
  const f=document.getElementById('custom-order-form');if(!f)return;
  for(const [field,flag] of [['photo','hasPhoto'],['colorPhoto','hasColorPhoto']]){
   const input=f.elements.namedItem(field);if(input)input.value='';
   const preview=f.querySelector(`[data-upload-preview="${field}"]`);
   if(preview){if(preview.dataset.objectUrl){URL.revokeObjectURL(preview.dataset.objectUrl);delete preview.dataset.objectUrl;}preview.removeAttribute('src');preview.hidden=true;}
   const result=f.querySelector(`[data-upload-result="${field}"]`);
   if(result)result.textContent=row?.[flag]?'✓ Photo déjà enregistrée — choisir une autre photo pour la remplacer':'Aucune nouvelle photo sélectionnée';
  }
 }
 function jjUpdateOrderPhotoInput(input){
  const f=input.closest('#custom-order-form');if(!f)return;
  const field=input.name,preview=f.querySelector(`[data-upload-preview="${field}"]`),result=f.querySelector(`[data-upload-result="${field}"]`);
  if(preview?.dataset.objectUrl){URL.revokeObjectURL(preview.dataset.objectUrl);delete preview.dataset.objectUrl;}
  const file=input.files?.[0];
  if(!file){if(preview){preview.hidden=true;preview.removeAttribute('src');}if(result)result.textContent='Aucune nouvelle photo sélectionnée';return;}
  if(result)result.textContent='✓ '+file.name;
  if(preview&&file.type.startsWith('image/')){const url=URL.createObjectURL(file);preview.dataset.objectUrl=url;preview.src=url;preview.hidden=false;}
 }
 function openNewCustomOrder(){
  editingCustomOrderId=null;
  const dialog=document.getElementById('custom-order-dialog');
  const f=document.getElementById('custom-order-form');
  if(!dialog||!f)return;
  f.reset();f.elements.namedItem('orderId').value='';
  document.getElementById('custom-order-form-title').textContent='＋ Nouvelle commande personnalisée';
  document.getElementById('custom-order-submit').textContent='💾 Enregistrer la commande';
  document.getElementById('custom-order-error').textContent='';
  const hint=document.getElementById('custom-order-edit-hint');if(hint)hint.hidden=true;
  jjDimensionPreview();jjFilamentPurchaseToggle();jjResetOrderPhotoInputs();
  dialog.showModal();dialog.scrollTop=0;
 }
 function editCustomOrder(id){
  const row=customOrders().find(x=>x.id===id);if(!row)return;
  editingCustomOrderId=id;
  const f=document.getElementById('custom-order-form');if(!f)return;
  f.reset();
  // Modifier l'enregistrement existant (même identifiant) et non en créer un nouveau.
  const keys=['customer','contact','item','productId','quantity','colors','filamentType','orderedAt','dueAt','price','deposit','delivery','status','notes','dimensionShape','dimensionUnit','filamentPurchasePrice','filamentPurchaseTax','filamentPurchaseShipping','filamentChargePercent','filamentChargeMode','clientApproval','previewUrl','paymentCollector','boutiqueCommissionPercent','boutiqueSettlementDate'];
  for(const k of keys){const inp=f.elements.namedItem(k);if(inp&&row[k]!==undefined&&row[k]!==null)inp.value=String(row[k]);}
  f.elements.namedItem('filamentPurchased').checked=!!row.filamentPurchased;
  f.elements.namedItem('boutiqueSettlementReceived').checked=!!row.boutiqueSettlementReceived;
  for(const k of ['height','diameter','length','width']){const inp=f.elements.namedItem('dimension_'+k);if(inp)inp.value=String(row.dimensionRaw?.[k]||'');}
  f.elements.namedItem('orderId').value=id;
  jjDimensionPreview();jjFilamentPurchaseToggle();jjResetOrderPhotoInputs(row);
  document.getElementById('custom-order-error').textContent='';
  document.getElementById('custom-order-form-title').textContent='✎ Modifier la commande '+(row.number||'');
  document.getElementById('custom-order-submit').textContent='💾 Enregistrer les modifications';
  const hint=document.getElementById('custom-order-edit-hint');if(hint){hint.hidden=false;hint.textContent='Modification de '+(row.number||'cette commande')+' — les champs non modifiés et les photos déjà enregistrées seront conservés.';}
  const dialog=document.getElementById('custom-order-dialog');
  if(dialog&&!dialog.open)dialog.showModal();
  if(dialog)dialog.scrollTop=0;
  f.elements.namedItem('customer')?.focus({preventScroll:true});
 }
 async function deleteCustomOrder(id){const row=customOrders().find(x=>x.id===id);if(!row||!confirm('Supprimer définitivement la commande « '+row.item+' » de '+row.customer+' ?'))return;if(persistExtras({...extras,customOrders:customOrders().filter(x=>x.id!==id)})){render();try{await window.JJ3DSyncOrderQueue?.({...row,status:'cancelled',deleted:true});notify('Commande supprimée et tâche liée annulée.');}catch(err){notify('Commande supprimée, mais tâche À imprimer à vérifier : '+(err.message||err),true);}}}
 async function updateCustomOrderStatus(id,status){if(!Object.hasOwn(customOrderStages,status))return;const row=customOrders().find(x=>x.id===id);if(!row)return;const updated={...row,status,updatedAt:new Date().toISOString()};if(persistExtras({...extras,customOrders:customOrders().map(x=>x.id===id?updated:x)})){render();try{await window.JJ3DSyncOrderQueue?.(updated);notify('✓ Statut et tâche liée mis à jour.');}catch(err){notify('Statut sauvé, mais À imprimer non actualisé : '+(err.message||err),true);}}}

 function render(){const p=page();app.innerHTML=p.startsWith('atelier-')?atelierPanel(p):p==='dashboard'?dashboard():p==='filaments'?filaments():p==='produits'?productPage():p==='commandes'?salesPage():p==='commandes-perso'?customOrdersPage():p==='sauvegardes'?backupsPage():p==='hardware'?hardwarePage():p==='impressions'?printPage():p==='horsproduction'?offPage():p==='finances'?financePage():p==='factures'?window.JJ3DInvoices.page():p==='catalogue'?catalogPage():p==='imprimantes'?printerPage():placeholder(p);document.getElementById('page-name').textContent=pages[p];document.querySelectorAll('[data-page]').forEach(n=>{n.classList.toggle('active',n.dataset.page===p);n.setAttribute('aria-current',n.dataset.page===p?'page':'false')});document.getElementById('sidebar').classList.remove('open');document.querySelectorAll('#mobile-navigation [data-page]').forEach(n=>{n.classList.toggle('active',n.dataset.page===p);n.setAttribute('aria-current',n.dataset.page===p?'page':'false');});const filterCount=document.getElementById(p+'-count');if(filterCount&&uiFilters[p])filterCount.textContent=filteredProducts(p).length+' résultat(s)';document.body.classList.toggle('finance-view',p==='finances');document.querySelectorAll('.table-wrap table').forEach(table=>{const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.setAttribute('data-label',headers[i]||'')));});hydratePhotos();}
 function openRoll(id){form.reset();form.elements.namedItem('id').value='';document.getElementById('form-error').textContent='';document.getElementById('dialog-title').textContent=id?'Modifier le rouleau':'Ajouter un rouleau';if(id){const r=rolls.find(x=>x.id===id);if(!r)return;for(const [key,val] of Object.entries(r)){const input=form.elements.namedItem(key);if(input){if(key==='material'&&input.tagName==='SELECT'&&![...input.options].some(o=>o.value===String(val)))input.add(new Option(String(val),String(val)));input.value=val??'';}}}dialog.showModal();}
 function saveRoll(event){event.preventDefault();const vals=Object.fromEntries(new FormData(form).entries());const r={id:vals.id||`roll-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,brand:String(vals.brand||'').trim(),color:String(vals.color||'').trim(),material:vals.material,code:String(vals.code||'').trim(),initial:Number(vals.initial),remaining:Number(vals.remaining),price:Number(vals.price),swatch:safeColor(vals.swatch)};const error=document.getElementById('form-error');if(!r.brand||!r.color||!rollOk(r)||!Number.isFinite(r.price)||r.price<0||vals.initial===''||vals.remaining===''||vals.price===''){error.textContent='Vérifie les champs : marque, couleur, poids et prix. Le poids restant ne peut pas dépasser le poids initial.';return;}const next=rolls.slice();const idx=next.findIndex(x=>x.id===r.id);if(idx>=0)next[idx]=r;else next.push(r);if(!persist(next)){error.textContent=storageError;return;}rolls=next;search='';dialog.close();render();notify('✓ Rouleau enregistré!');}
 function removeRoll(id){const r=rolls.find(x=>x.id===id);if(prints.some(p=>p.status==='active'&&p.usage.some(u=>u.rollId===id))){notify('Cette bobine est liée à une impression active. Annule d’abord cette impression.',true);return;}if(!r||!confirm(`Supprimer ${r.brand} — ${r.color} ?`))return;const next=rolls.filter(x=>x.id!==id);if(persist(next)){rolls=next;render();notify('Rouleau supprimé.');}}
 function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),filaments:rolls},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='printpilot-filaments.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Export JSON créé.');}
 // LISTENER DIRECT permanent : il n'est jamais détruit lors d'un render().
 form.addEventListener('submit',saveRoll);
 // Clic sur le fond sombre : ferme seulement si le clic est en dehors du panneau.
 // Ne ferme pas lors d'un clic dans les champs, même quand le dialogue occupe tout l'écran.
 document.querySelectorAll('dialog').forEach(modal=>{
  modal.addEventListener('click',event=>{
   if(event.target!==modal)return;
   const rect=modal.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){
    if(modal.id==='product-dialog')convertingPrintId=null;
    modal.close();
   }
  });
 });
 document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
 document.getElementById('cancel-dialog').addEventListener('click',()=>dialog.close());
 document.getElementById('print-form').addEventListener('submit',savePrint);
 document.addEventListener('submit',e=>{if(e.target.id==='custom-order-form')saveCustomOrder(e);});
 document.addEventListener('input',e=>{if(e.target.closest('#custom-order-form')&&(/^(dimension_|dimensionShape$|dimensionUnit$)/.test(e.target.name||'')))jjDimensionPreview();if(e.target.closest('#custom-order-form')&&['filamentPurchasePrice','filamentPurchaseTax','filamentPurchaseShipping','filamentChargePercent','price'].includes(e.target.name))jjFilamentPurchaseToggle();});
 document.addEventListener('change',e=>{if(e.target.closest('#custom-order-form')&&e.target.matches('input[type=file][name=photo], input[type=file][name=colorPhoto]'))jjUpdateOrderPhotoInput(e.target);if(e.target.closest('#custom-order-form')){if(['filamentPurchased','filamentPurchasePrice','filamentPurchaseTax','filamentPurchaseShipping','filamentChargePercent','filamentChargeMode'].includes(e.target.name))jjFilamentPurchaseToggle();if(e.target.name==='dimensionShape'||e.target.name==='dimensionUnit')jjDimensionPreview();}});
 document.addEventListener('click',e=>{
  const hide=e.target.closest('[data-hide-duplicate-sale]'),restore=e.target.closest('[data-restore-duplicate-sale]');if(!hide&&!restore)return;
  const id=(hide||restore).dataset[hide?'hideDuplicateSale':'restoreDuplicateSale'];const sale=extras.sales.find(s=>s.id===id);if(!sale)return;
  if(hide&&!confirm('Masquer cette vente directe du chiffre d’affaires? Vérifie qu’elle correspond vraiment à la vente de la facture. Aucune donnée ne sera supprimée et le stock restera inchangé.'))return;
  if(persistExtras({...extras,sales:extras.sales.map(s=>s.id===id?{...s,status:hide?'duplicate':'active',duplicateHiddenAt:hide?new Date().toISOString():''}:s)})){render();notify(hide?'Vente directe masquée, sans suppression.':'Vente rétablie.');}
 });
 document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit-custom-order]'),del=e.target.closest('[data-delete-custom-order]');if(e.target.closest('[data-restore-backup]'))restoreBackup(e.target.closest('[data-restore-backup]').dataset.restoreBackup);else if(edit)editCustomOrder(edit.dataset.editCustomOrder);else if(e.target.closest('[data-invoice-custom-order]'))openCustomOrderInvoice(e.target.closest('[data-invoice-custom-order]').dataset.invoiceCustomOrder);else if(e.target.closest('[data-queue-custom-order]')){location.hash='#atelier-queue';notify('🖨️ Impression liée : voir la file À imprimer.');}else if(del)deleteCustomOrder(del.dataset.deleteCustomOrder);else if(e.target.closest('#custom-order-add'))openNewCustomOrder();else if(e.target.closest('#custom-order-reset, #custom-order-close')){editingCustomOrderId=null;document.getElementById('custom-order-dialog')?.close();}else if(e.target.id==='custom-order-dialog'){const dialog=e.target,r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){editingCustomOrderId=null;dialog.close();}}});
 document.addEventListener('change',e=>{if(e.target.matches('[data-custom-status]'))updateCustomOrderStatus(e.target.dataset.customStatus,e.target.value);});
 document.getElementById('print-product').addEventListener('change',()=>{if(!editingPrintId){selectedProductInfo({prefillDuration:true});const p=extras.products.find(x=>String(x.id)===document.getElementById('print-product').value);suggestExcelUsage(p);suggestHardwareFromProduct();if(p?.printer)setChoiceValue(document.getElementById('print-form'),'printer',p.printer);refreshPrintCreation();}else{selectedProductInfo();refreshPrintCreation();}});
 document.getElementById('print-form').addEventListener('input',updatePrintCreationCost);document.getElementById('print-form').addEventListener('change',updatePrintCreationCost);
 document.getElementById('print-form').elements.namedItem('quantity').addEventListener('change',()=>{if(!editingPrintId){const p=extras.products.find(x=>String(x.id)===document.getElementById('print-product').value);if(p)suggestExcelUsage(p);suggestHardwareFromProduct();}});
 document.getElementById('off-form').addEventListener('submit',saveOff);
 document.addEventListener('click',e=>{if(e.target.closest('#move-off-action')){e.preventDefault();moveProductOff();}});
 document.getElementById('off-close').addEventListener('click',()=>document.getElementById('off-dialog').close());
 document.getElementById('sale-form').addEventListener('submit',saveSale);
 document.getElementById('sale-form').elements.namedItem('productId').addEventListener('change',()=>updateSaleProduct(true));
 document.getElementById('sale-form').elements.namedItem('channel').addEventListener('change',()=>updateSaleChannel(true));
 document.getElementById('sale-form').addEventListener('input',updateSalePreview);
 document.getElementById('close-sale').addEventListener('click',()=>document.getElementById('sale-dialog').close());
 document.getElementById('cancel-sale-dialog').addEventListener('click',()=>document.getElementById('sale-dialog').close());
 document.getElementById('print-form').addEventListener('input',e=>{if(e.target.closest('#print-hardware-lines'))updatePrintCreationCost();});document.getElementById('print-form').addEventListener('change',e=>{if(e.target.closest('#print-hardware-lines'))updatePrintCreationCost();});document.getElementById('product-form').addEventListener('submit',saveProduct);document.getElementById('product-form').addEventListener('input',updateProductCost);document.getElementById('product-form').addEventListener('change',updateProductCost);document.getElementById('close-product').addEventListener('click',()=>{convertingPrintId=null;document.getElementById('product-dialog').close();});document.getElementById('cancel-product').addEventListener('click',()=>{convertingPrintId=null;document.getElementById('product-dialog').close();});document.getElementById('product-camera-button').addEventListener('click',()=>document.getElementById('product-new-camera').click());document.getElementById('product-new-camera').addEventListener('change',e=>{selectNewProductPhoto(e.target.files[0]);e.target.value='';});document.getElementById('product-new-photo').addEventListener('change',e=>{selectNewProductPhoto(e.target.files[0]);e.target.value='';});
 document.getElementById('printer-profile-form').addEventListener('submit',savePrinter);
 document.getElementById('printer-profile-close').addEventListener('click',()=>document.getElementById('printer-profile-dialog').close());
 document.getElementById('printer-profile-cancel').addEventListener('click',()=>document.getElementById('printer-profile-dialog').close());
 document.getElementById('printer-history-close').addEventListener('click',()=>document.getElementById('printer-history-dialog').close());
 document.getElementById('hardware-form').addEventListener('submit',saveHardware);
 document.getElementById('close-hardware').addEventListener('click',()=>document.getElementById('hardware-dialog').close());
 document.getElementById('cancel-hardware').addEventListener('click',()=>document.getElementById('hardware-dialog').close());
 document.getElementById('close-print').addEventListener('click',()=>document.getElementById('print-dialog').close());
 document.getElementById('cancel-print-dialog').addEventListener('click',()=>document.getElementById('print-dialog').close());
 document.getElementById('catalog-detail-close').addEventListener('click',()=>document.getElementById('catalog-detail-dialog').close());
 document.getElementById('menu-toggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
 document.addEventListener('click',event=>{const add=event.target.closest('#add-roll');const edit=event.target.closest('[data-edit]');const del=event.target.closest('[data-delete]');const go=event.target.closest('[data-go]');if(event.target.closest('#add-printer'))openPrinter();else if(event.target.closest('[data-printer-edit]'))openPrinter(event.target.closest('[data-printer-edit]').dataset.printerEdit);else if(event.target.closest('[data-printer-history]'))showPrinterHistory(event.target.closest('[data-printer-history]').dataset.printerHistory);else if(add)openRoll();else if(edit)openRoll(edit.dataset.edit);else if(del)removeRoll(del.dataset.delete);else if(go)location.hash=go.dataset.go;else if(event.target.closest('#export-json'))exportData();else if(event.target.closest('#import-excel'))document.getElementById('excel-upload-file').click();else if(event.target.closest('#repair-variant-ids'))repairVariantIds();else if(event.target.closest('#fix-christmas-colors'))fixChristmasColors();else if(event.target.closest('#add-product')){convertingPrintId=null;openProduct();}else if(event.target.closest('[data-edit-product]'))openProduct(event.target.closest('[data-edit-product]').dataset.editProduct);else if(event.target.closest('#add-print'))openPrint();else if(event.target.closest('#add-sale'))openSale();else if(event.target.closest('[data-new-sale-product]')){location.hash='commandes';openSale(null,event.target.closest('[data-new-sale-product]').dataset.newSaleProduct);}else if(event.target.closest('[data-edit-sale]'))openSale(event.target.closest('[data-edit-sale]').dataset.editSale);else if(event.target.closest('[data-cancel-sale]'))cancelSale(event.target.closest('[data-cancel-sale]').dataset.cancelSale);else if(event.target.closest('#add-hardware'))openHardware();else if(event.target.closest('[data-edit-hardware]'))openHardware(event.target.closest('[data-edit-hardware]').dataset.editHardware);else if(event.target.closest('[data-delete-hardware]'))deleteHardware(event.target.closest('[data-delete-hardware]').dataset.deleteHardware);else if(event.target.closest('[data-new-print-product]')){location.hash='impressions';openPrint(null,event.target.closest('[data-new-print-product]').dataset.newPrintProduct);}else if(event.target.closest('[data-convert-print]'))createProductFromExistingPrint(event.target.closest('[data-convert-print]').dataset.convertPrint);else if(event.target.closest('[data-edit-print]'))openPrint(event.target.closest('[data-edit-print]').dataset.editPrint);else if(event.target.closest('#add-product-material')){document.getElementById('product-material-lines').insertAdjacentHTML('beforeend',productMaterialRow());updateProductCost();}else if(event.target.closest('.product-remove-material')){event.target.closest('.product-material-line').remove();updateProductCost();}else if(event.target.closest('#add-product-hardware')){document.getElementById('product-hardware-lines').insertAdjacentHTML('beforeend',hardwareRow('product'));updateProductCost();}else if(event.target.closest('#add-print-hardware')){document.getElementById('print-hardware-lines').insertAdjacentHTML('beforeend',hardwareRow('print'));updatePrintCreationCost();}else if(event.target.closest('.hardware-remove')){event.target.closest('.hardware-line').remove();updateProductCost();updatePrintCreationCost();}else if(event.target.closest('#add-usage'))document.getElementById('usage-lines').insertAdjacentHTML('beforeend',usageRow());else if(event.target.closest('.usage-remove')){const lines=document.querySelectorAll('#usage-lines .usage-line');if(lines.length>1)event.target.closest('.usage-line').remove();else notify('Il faut au moins une bobine.',true);}else if(event.target.closest('[data-move-print-off]'))movePrintOff(event.target.closest('[data-move-print-off]').dataset.movePrintOff);else if(event.target.closest('[data-open-move-off]')){const id=event.target.closest('[data-open-move-off]').dataset.openMoveOff;location.hash='horsproduction';setTimeout(()=>{const f=document.getElementById('move-off-form');if(f)f.elements.namedItem('productId').value=id;},0);}else if(event.target.closest('[data-restore-off]'))restoreOff(event.target.closest('[data-restore-off]').dataset.restoreOff);else if(event.target.closest('[data-delete-off]'))deleteOffEntry(event.target.closest('[data-delete-off]').dataset.deleteOff);else if(event.target.closest('#add-off'))openOffDialog();else if(event.target.closest('#add-off-usage'))document.getElementById('off-usage-lines').insertAdjacentHTML('beforeend',offUsageRow());else if(event.target.closest('.off-remove')){if(document.querySelectorAll('.pp-off-line').length>1)event.target.closest('.pp-off-line').remove();}else if(event.target.closest('[data-cancel-print]'))cancelPrint(event.target.closest('[data-cancel-print]').dataset.cancelPrint);else if(event.target.closest('#export-full'))exportFull();else if(event.target.closest('#apply-reconciliation'))chooseReconciliation();else if(event.target.closest('#export-finance'))exportFinance();else if(event.target.closest('[data-view-admin-product]'))openCatalogDetails(event.target.closest('[data-view-admin-product]').dataset.viewAdminProduct,true);else if(event.target.closest('[data-view-catalog]'))openCatalogDetails(event.target.closest('[data-view-catalog]').dataset.viewCatalog);else if(event.target.closest('#download-catalog'))exportCatalog();else if(event.target.closest('#download-catalog-csv'))catalogCsv();else if(event.target.closest('[data-upload-product]')){document.getElementById('product-photo').dataset.productId=event.target.closest('[data-upload-product]').dataset.uploadProduct;document.getElementById('product-photo').click();}else if(event.target.closest('[data-camera-product]')){const file=document.getElementById('product-camera');file.dataset.productId=event.target.closest('[data-camera-product]').dataset.cameraProduct;file.click();}});
 document.addEventListener('input',event=>{if(event.target.id==='print-history-search'){const q=normFilter(event.target.value);document.querySelectorAll('#print-history-table tbody tr').forEach(row=>{row.hidden=!normFilter(row.textContent).includes(q);});}else if(event.target.id==='print-catalog-search'){uiFilters.impressions.q=event.target.value;updateFilteredView('impressions');}else if(event.target.id==='roll-search'){search=event.target.value;document.getElementById('inventory-rows').innerHTML=tableRows();}else if(event.target.id==='finance-search'){document.getElementById('finance-products').innerHTML=financeProductRows(event.target.value);}else if(event.target.id==='catalog-search'){uiFilters.catalogue.q=event.target.value;updateFilteredView('catalogue');}else if(event.target.id==='sales-search'){document.getElementById('sales-results').innerHTML=salesCards(event.target.value);}else if(event.target.id==='product-search'){uiFilters.produits.q=event.target.value;updateFilteredView('produits');}});
 async function selectPrintPhoto(file){if(!file)return;try{photoDraft=await fileToPhoto(file);const preview=document.getElementById('photo-preview');preview.replaceChildren();const img=document.createElement('img');img.src=photoDraft;img.alt='Aperçu de la photo';preview.appendChild(img);}catch(e){notify(e.message,true);}}
 document.getElementById('print-photo').addEventListener('change',event=>selectPrintPhoto(event.target.files[0]));
 document.getElementById('print-camera').addEventListener('change',event=>{selectPrintPhoto(event.target.files[0]);event.target.value='';});
 document.getElementById('print-camera-button').addEventListener('click',()=>document.getElementById('print-camera').click());
 document.getElementById('excel-upload-file').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';await importExcelFile(file);});
 async function selectProductPhoto(file,shopId){if(!file||!shopId)return;try{const product=extras.products.find(p=>String(p.shopId)===String(shopId));if(!product)throw Error('Produit introuvable pour cet ID stock');const data=await fileToPhoto(file);const location=await setPhoto(uniqueProductPhotoKey(product),data);await hydratePhotos();notify(location==='cloud'?'✓ Photo sauvegardée dans le cloud et sur cet appareil.':'✓ Photo locale enregistrée. Connecte-toi à Firebase pour la partager.');}catch(e){console.error(e);notify('Photo conservée localement; envoi cloud non confirmé : '+e.message,true);}}
 document.getElementById('product-photo').addEventListener('change',event=>{selectProductPhoto(event.target.files[0],event.target.dataset.productId);event.target.value='';});
 document.getElementById('product-camera').addEventListener('change',event=>{selectProductPhoto(event.target.files[0],event.target.dataset.productId);event.target.value='';});
 // Réinitialiser la position lors d'un changement de SECTION seulement.
 // Les rafraîchissements de tableaux/formulaires ne déplacent pas la page.
 window.addEventListener('hashchange',()=>{
   render();
   window.scrollTo({top:0,left:0,behavior:'instant'});
   requestAnimationFrame(()=>window.scrollTo(0,0));
 });
 // Si l'utilisateur reclique la section courante, remonter aussi en haut.
 document.addEventListener('click',event=>{
   const chip=event.target.closest('[data-filter-category]');
   if(chip){const view=chip.dataset.filterView;uiFilters[view].category=chip.dataset.filterCategory;document.querySelectorAll(`[data-filter-toolbar="${view}"] .pp-chip`).forEach(b=>{const selected=b.dataset.filterCategory===uiFilters[view].category;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});updateFilteredView(view);}
 });
 document.addEventListener('change',event=>{
   const el=event.target;if(el.matches('[data-filter-color]')){const view=el.dataset.filterColor;uiFilters[view].color=el.value;updateFilteredView(view);}
   if(el.matches('[data-filter-stock]')){const view=el.dataset.filterStock;uiFilters[view].stock=el.value;updateFilteredView(view);}if(el.matches('[data-filter-sort]')){uiFilters.produits.sort=el.value;updateFilteredView('produits');}
 });
 document.getElementById('mobile-navigation').addEventListener('click',event=>{
   const more=event.target.closest('#mobile-more-btn');if(more){const sheet=document.getElementById('mobile-more-sheet');sheet.hidden=!sheet.hidden;more.setAttribute('aria-expanded',String(!sheet.hidden));return;}
   const link=event.target.closest('[data-page]');if(link){document.getElementById('mobile-more-sheet').hidden=true;document.getElementById('mobile-more-btn').setAttribute('aria-expanded','false');if(location.hash==='#'+link.dataset.page){window.scrollTo({top:0,left:0,behavior:'instant'});}}
 });
 document.getElementById('navigation').addEventListener('click',event=>{
   const link=event.target.closest('a[data-page]');
   if(link && location.hash==='#'+link.dataset.page){
     window.scrollTo({top:0,left:0,behavior:'instant'});
     document.getElementById('sidebar').classList.remove('open');
   }
 });
 document.getElementById('today').textContent=new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
 // Interface volontairement limitée au jeu de données de l’atelier; pas de photos IndexedDB.
 window.PrintPilotCloudAdapter = {
  exportState(){return {version:3,rolls:structuredClone(rolls),prints:structuredClone(prints),products:structuredClone(extras.products),hardware:structuredClone(extras.hardware),sales:structuredClone(extras.sales),...(offEntries().length?{nonCommercial:structuredClone(offEntries())}:{}),printers:structuredClone(extras.printers||[]),invoices:structuredClone(extras.invoices||[]),stockSlips:structuredClone(extras.stockSlips||[]),packingSlips:structuredClone(extras.packingSlips||[]),customOrders:structuredClone(extras.customOrders||[]),invoiceSettings:structuredClone(extras.invoiceSettings||{})};},
  applyState(snapshot){
   if(!snapshot || !Array.isArray(snapshot.rolls) || !Array.isArray(snapshot.prints) || !Array.isArray(snapshot.products) || !Array.isArray(snapshot.hardware) || !Array.isArray(snapshot.sales)) throw Error('Sauvegarde cloud incomplète');
   if(!snapshot.rolls.every(rollOk)||!snapshot.prints.every(validPrint)) throw Error('Données de bobines ou impressions invalides');
   const oldState=localStorage.getItem(STATE_KEY),oldExtras=localStorage.getItem(EXTRA_KEY);
   try {
    const nextState=JSON.stringify({version:2,rolls:snapshot.rolls,prints:snapshot.prints});
    const nextExtras=JSON.stringify({products:ensureShopIds(snapshot.products),hardware:snapshot.hardware,sales:snapshot.sales,nonCommercial:Array.isArray(snapshot.nonCommercial)?snapshot.nonCommercial:[],printers:Array.isArray(snapshot.printers)?snapshot.printers:[],invoices:Array.isArray(snapshot.invoices)?snapshot.invoices:[],stockSlips:Array.isArray(snapshot.stockSlips)?snapshot.stockSlips:(extras.stockSlips||[]),packingSlips:Array.isArray(snapshot.packingSlips)?snapshot.packingSlips:(extras.packingSlips||[]),customOrders:Array.isArray(snapshot.customOrders)?snapshot.customOrders:(extras.customOrders||[]),invoiceSettings:snapshot.invoiceSettings&&typeof snapshot.invoiceSettings==='object'?snapshot.invoiceSettings:{}});
    localStorage.setItem(STATE_KEY,nextState);localStorage.setItem(EXTRA_KEY,nextExtras);
    if(localStorage.getItem(STATE_KEY)!==nextState || localStorage.getItem(EXTRA_KEY)!==nextExtras)throw Error('Écriture locale non confirmée');
   }catch(e){try{if(oldState===null)localStorage.removeItem(STATE_KEY);else localStorage.setItem(STATE_KEY,oldState);if(oldExtras===null)localStorage.removeItem(EXTRA_KEY);else localStorage.setItem(EXTRA_KEY,oldExtras);}catch(_){}throw e;}
   rolls=snapshot.rolls.map(x=>({...x}));prints=snapshot.prints.map(x=>({...x}));extras={products:ensureShopIds(snapshot.products),hardware:snapshot.hardware,sales:snapshot.sales,nonCommercial:Array.isArray(snapshot.nonCommercial)?snapshot.nonCommercial:[],printers:Array.isArray(snapshot.printers)?snapshot.printers:[],invoices:Array.isArray(snapshot.invoices)?snapshot.invoices:[],stockSlips:Array.isArray(snapshot.stockSlips)?snapshot.stockSlips:(extras.stockSlips||[]),packingSlips:Array.isArray(snapshot.packingSlips)?snapshot.packingSlips:(extras.packingSlips||[]),customOrders:Array.isArray(snapshot.customOrders)?snapshot.customOrders:(extras.customOrders||[]),invoiceSettings:snapshot.invoiceSettings&&typeof snapshot.invoiceSettings==='object'?snapshot.invoiceSettings:{}};
   search='';render();return true;
  },
  closeAllDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
 };
 window.addEventListener('jj3d:receipts-updated',()=>{if(page()==='factures')render();});
 load();loadExtras();window.JJ3DInvoices.init({read:()=>extras,save:next=>persistExtras(next),render:()=>render(),notify,esc,money});render();
})();
