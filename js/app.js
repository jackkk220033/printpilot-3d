/* PrintPilot 3D v4.3 — HTML/CSS/JavaScript natif, sans Node.js.
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
 let extras={products:[],hardware:[],sales:[]}; // réutilise la clé des versions précédentes
 const app = document.getElementById('app');
 const dialog = document.getElementById('roll-dialog');
 const form = document.getElementById('roll-form');
 const toastEl = document.getElementById('toast');
 let rolls = [];
 let search = '';
 let storageError = null;
 const pages = {dashboard:'Tableau de bord',filaments:'Filaments',produits:'Produits',impressions:'Impressions',commandes:'Ventes',hardware:'Hardware',imprimantes:'Imprimantes',finances:'Finances',catalogue:'Catalogue à partager'};
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number = (n,d=0) => Number(n).toLocaleString('fr-CA',{minimumFractionDigits:d,maximumFractionDigits:d});
 const money = n => number(n,2)+' $';
 const safeColor = c => /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#8284a0';
 const rollOk = r => r && typeof r.id === 'string' && r.id && typeof r.brand === 'string' && typeof r.color === 'string' && Number.isFinite(Number(r.initial)) && Number(r.initial)>0 && Number.isFinite(Number(r.remaining)) && Number(r.remaining)>=0 && Number(r.remaining)<=Number(r.initial);
 function load() {
  try { const stateRaw=localStorage.getItem(STATE_KEY); const state=stateRaw?JSON.parse(stateRaw):null; const raw=state&&Array.isArray(state.rolls)?null:localStorage.getItem(KEY); const parsed=raw?JSON.parse(raw):[]; rolls=(state&&Array.isArray(state.rolls)?state.rolls:parsed).filter(rollOk); prints=state&&Array.isArray(state.prints)?state.prints.filter(validPrint):[]; }
  catch(e) { storageError = 'Impossible de lire le stockage de ce navigateur.'; console.error('PrintPilot load:',e); rolls=[]; }
 }
 function validPrint(p){return p&&typeof p.id==='string'&&Array.isArray(p.usage)&&p.usage.every(u=>typeof u.rollId==='string'&&Number.isFinite(Number(u.grams))&&Number(u.grams)>0)&&['active','cancelled'].includes(p.status);}
 function persist(next, nextPrints=prints) {
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
 function thumb(id,cls='photo-thumb'){return `<div class="${cls}" data-photo-id="${esc(id)}" aria-label="Photo de l'impression">▧</div>`;}
 async function hydratePhotos(){
   const elements=[...document.querySelectorAll('[data-photo-id]')];
   await Promise.all(elements.map(async el=>{
     const data=await getPhoto('print:'+el.dataset.photoId);
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
   return {...product,shopId:id};
  });
 }
 function catalogCsv(){
  const rows=[['ID numérique','ID Excel','Produit','Catégorie','Couleurs','Prix CAD','Stock'],
   ...extras.products.map(p=>[p.shopId,p.id,p.name,p.category,p.colors,safeNum(p.price).toFixed(2),safeNum(p.stock)])];
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
  const mergedExtras={products:[...extras.products,...withIds],hardware:[...extras.hardware,...newHardware],sales:[...extras.sales,...newSales]};
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
 const uiFilters={catalogue:{category:'all',color:'all',stock:'all',q:''},produits:{category:'all',color:'all',stock:'all',q:''},impressions:{category:'all',color:'all',stock:'all',q:''}};
 const groups=[['all','Tous'],['clicker','Clickers'],['vase','Vases'],['fidget','Fidgets'],['decoration','Décoration'],['keychain','Porte-clés']];
 function normFilter(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();}
 function groupMatch(p,group){if(group==='all')return true;const v=normFilter([p.name,p.category,p.id].join(' '));const checks={clicker:/clicker|cliqueur/,vase:/vase/,fidget:/fidget|infinity cube/,decoration:/decor|noel|christmas|gnome|candle/,keychain:/keychain|key chain|porte.cle|key tag/};return checks[group]?.test(v)||false;}
 function filteredProducts(view,query){const st=uiFilters[view]||uiFilters.catalogue;const q=normFilter(query===undefined?st.q:query);return extras.products.filter(p=>{
  const joined=normFilter([p.shopId,p.id,p.name,p.category,p.colors,p.printer,...(p.materials||[]).map(m=>m.id)].join(' '));
  if(q&&!joined.includes(q))return false;
  if(!groupMatch(p,st.category))return false;
  if(st.color!=='all'&&!normFilter(p.colors).includes(normFilter(st.color)))return false;
  if(st.stock==='available'&&safeNum(p.stock)<=0)return false;
  if(st.stock==='empty'&&safeNum(p.stock)>0)return false;
  return true;
 });}
 function filterToolbar(view){const st=uiFilters[view];const colors=[...new Set(extras.products.flatMap(p=>String(p.colors||'').split(/[\/,;+]/).map(x=>x.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'fr'));
  const options=colors.map(c=>`<option value="${esc(c)}" ${st.color===c?'selected':''}>${esc(c)}</option>`).join('');
  return `<div class="pp-filters" data-filter-toolbar="${view}" aria-label="Filtres ${view}"><div class="pp-filter-chips">${groups.map(([id,label])=>`<button type="button" class="pp-chip ${st.category===id?'selected':''}" data-filter-category="${id}" data-filter-view="${view}" aria-pressed="${st.category===id}">${label}</button>`).join('')}</div><div class="pp-filter-fields"><label>Couleur<select data-filter-color="${view}"><option value="all">Toutes les couleurs</option>${options}</select></label><label>Stock<select data-filter-stock="${view}"><option value="all">Tout le stock</option><option value="available" ${st.stock==='available'?'selected':''}>En stock</option><option value="empty" ${st.stock==='empty'?'selected':''}>Épuisé</option></select></label><span class="pp-filter-count" id="${view}-count"></span></div></div>`;
 }
 function updateFilteredView(view){const map={catalogue:['catalog-results',catalogRows],produits:['product-results',productRows],impressions:['print-catalog-results',printCatalogRows]};const [id,fn]=map[view]||[];if(!id)return;const el=document.getElementById(id);if(!el)return;el.innerHTML=fn(uiFilters[view].q);const count=document.getElementById(view+'-count');if(count)count.textContent=filteredProducts(view).length+' résultat(s)';hydratePhotos();}

 function productPage(){const p=extras.products;return header('CATALOGUE','Mes produits','Tes modèles et leurs prix. Pour fabriquer un nouveau modèle, utilise « Impressions » : la fiche se crée automatiquement.',`<div class="header-actions"><button type="button" class="primary-btn" id="add-product">＋ Ajouter un produit</button>${importButton()}</div>`)+warning()+(p.length?'':excelNotice())+`<div class="stats-grid three">${statCard('⬡',number(p.length),'Produits / variantes')}${statCard('▣',number(p.reduce((s,r)=>s+safeNum(r.stock),0)),'Unités en stock')}${statCard('$',money(p.reduce((s,r)=>s+safeNum(r.stock)*safeNum(r.price),0)),'Valeur stock au prix de vente')}</div><section class="panel"><div class="panel-head"><div><h2>Tous mes produits</h2><p>Produits Excel et produits créés dans PrintPilot.</p></div><input class="table-filter" id="product-search" placeholder="Rechercher un produit…" type="search"></div>${filterToolbar('produits')}<div id="product-results">${productRows('')}</div></section>`;}
 function productRows(searchTerm){const p=filteredProducts('produits',searchTerm);return p.length?`<div class="inventory-card-grid">${p.map(r=>`<article class="inventory-card">${thumb('product:'+r.id,'product-card-image')}<div class="inventory-card-head"><div><h3>${esc(r.name)}</h3><small>ID stock #${esc(r.shopId)} · ${esc(r.id)}</small></div><strong>${money(r.price)}</strong></div><div class="detail-grid"><div><small>Catégorie</small><strong>${esc(r.category||'—')}</strong></div><div><small>Couleurs</small><strong>${esc(r.colors||'—')}</strong></div><div><small>En stock</small><strong>${number(r.stock)}</strong></div><div><small>Temps d’impression</small><strong>${esc(excelPrintDuration(r))}</strong></div><div><small>Coût / unité</small><strong>${money(r.unitCost)}</strong></div><div><small>Profit estimé</small><strong>${money(r.unitProfit)}</strong></div></div><div class="actions"><button type="button" class="secondary-btn" data-edit-product="${esc(r.id)}">✎ Modifier</button><button type="button" class="secondary-btn" data-new-print-product="${esc(r.id)}">＋ Impression</button><button type="button" class="secondary-btn" data-new-sale-product="${esc(r.id)}">＄ Vente</button><button type="button" class="secondary-btn" data-upload-product="${esc(r.id)}">🖼 Importer photo</button><button type="button" class="secondary-btn" data-camera-product="${esc(r.id)}">📸 Prendre photo</button></div></article>`).join('')}</div>`:'<p class="empty">Aucun produit à afficher.</p>';}

 function productMaterialRow(rollId='',grams=''){
  return `<div class="usage-line product-material-line"><select class="product-roll" aria-label="Bobine pour ce produit"><option value="">Choisir une bobine…</option>${rollId&&!rolls.some(r=>r.id===rollId||r.code===rollId)?`<option value="${esc(rollId)}" selected>Référence historique : ${esc(rollId)}</option>`:''}${rolls.map(r=>`<option value="${esc(r.id)}" ${r.id===rollId?'selected':''}>${esc(r.brand)} — ${esc(r.color)} (${esc(r.code||r.id)})</option>`).join('')}</select><input type="number" class="product-grams" aria-label="Grammes par unité" min="0.1" step="0.1" placeholder="Grammes" value="${esc(grams)}"><button type="button" class="secondary-btn product-remove-material" aria-label="Retirer">×</button></div>`;
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
  const total=filamentCost+hardwarePerUnit+otherCost,profit=price-total-price*rate/100;
  document.getElementById('product-cost-preview').innerHTML=`<div><small>Filament / unité</small><strong>${money(filamentCost)}</strong></div><div><small>Hardware / unité</small><strong>${money(hardwarePerUnit)}</strong></div><div><small>Coût total / unité</small><strong>${money(total)}</strong></div><div><small>Prix de vente</small><strong>${money(price)}</strong></div><div><small>Profit après commission</small><strong>${money(profit)}</strong></div>`;
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
 function openProduct(id=null){
  const p=id?extras.products.find(x=>x.id===id):null;
  const f=document.getElementById('product-form');f.reset();populateChoices(f);newProductPhotoDraft=null;
  document.getElementById('product-form-error').textContent='';document.getElementById('product-dialog-title').textContent=p?'Modifier un produit':'Ajouter un produit';
  const rows=p?.materials?.length?p.materials.map(m=>productMaterialRow(rolls.find(r=>r.id===m.id||r.code===m.id)?.id||m.id,m.grams)).join(''):productMaterialRow();
  document.getElementById('product-material-lines').innerHTML=rows;drawProductHardware(p?.hardware||[]);
  document.getElementById('product-new-photo-preview').replaceChildren();
  if(p){for(const key of ['id','name','category','colors','printer','stock','otherCost','price','commissionRate','notes']){const input=f.elements.namedItem(key);if(input){const value=(key==='commissionRate'?safeNum(p[key])*100:p[key])??'';if(input.matches('select[data-choice]'))setChoiceValue(f,key,value);else input.value=value;}}f.elements.namedItem('originalId').value=p.id;const mins=Math.round(safeNum(p.timeDays)*1440);f.elements.namedItem('hours').value=Math.floor(mins/60);f.elements.namedItem('mins').value=mins%60;getPhoto('print:product:'+p.id).then(photo=>{if(photo&&document.getElementById('product-dialog').open){const img=document.createElement('img');img.src=photo;img.alt='Photo actuelle';document.getElementById('product-new-photo-preview').replaceChildren(img);}});}
  else {f.elements.namedItem('originalId').value='';f.elements.namedItem('id').placeholder='Généré automatiquement';f.elements.namedItem('commissionRate').value=30;f.elements.namedItem('stock').value=0;}
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
  const name=String(raw.name||'').trim(),originalId=String(raw.originalId||''),id=originalId||String(raw.id||'').trim()||'PROD-'+Date.now().toString(36).toUpperCase(),materialsRaw=productMaterialLines();
  const stock=Number(raw.stock),hours=Number(raw.hours),mins=Number(raw.mins),other=Number(raw.otherCost),price=Number(raw.price),rate=Number(raw.commissionRate);
  if(!name||!Number.isInteger(stock)||stock<0||!Number.isInteger(hours)||hours<0||!Number.isInteger(mins)||mins<0||mins>59||![other,price,rate].every(Number.isFinite)||other<0||price<0||rate<0||rate>100){err.textContent='Vérifie le nom, les durées (minutes 0–59), la quantité, le prix et les coûts.';return;}
  if(extras.products.some(p=>p.id===id&&p.id!==originalId)){err.textContent='Cet ID interne existe déjà. Choisis un ID unique.';return;}
  if(materialsRaw.some(m=>(m.id&&!m.raw)||(!m.id&&m.raw)||(m.id&&(!Number.isFinite(m.grams)||m.grams<=0)))){err.textContent='Sélectionne une bobine et des grammes positifs pour chaque ligne utilisée.';return;}
  const hardwareRaw=getHardwareLines('product-hardware-lines');if(!hardwareLinesValid(hardwareRaw)){err.textContent='Vérifie le composant et sa quantité entière par unité.';return;}const hardware=hardwareRaw.filter(h=>h.id).map(h=>({id:h.id,quantity:h.quantity}));
  const materials=materialsRaw.filter(m=>m.id&&m.grams>0).map(m=>({id:rolls.find(r=>r.id===m.id)?.code||m.id,grams:m.grams}));
  const prev=extras.products.find(p=>p.id===originalId);const unchangedMaterials=prev&&JSON.stringify(materials)===JSON.stringify(prev.materials||[]);const filamentCost=unchangedMaterials?safeNum(prev.filamentCost):productMaterialCost(materials),unitCost=filamentCost+hardwareCost(hardware)+other;
  const row={...prev,id,name,category:choiceValue(f,'category'),colors:choiceValue(f,'colors'),printer:choiceValue(f,'printer'),materials,hardware,grams:materials.reduce((a,m)=>a+m.grams,0),timeDays:(hours*60+mins)/1440,filamentCost,otherCost:other,unitCost,stock,price,commissionRate:rate/100,unitProfit:price-unitCost-price*rate/100,notes:String(raw.notes||'').trim(),printed:prev?.printed??0,sold:prev?.sold??0,shopId:prev?.shopId||'',source:prev?.source||'PrintPilot'};
  // Commission en modèle Excel : fraction 0..1. Existing XLSM uses e.g. 0.30.
  const next={...extras,products:ensureShopIds(prev?extras.products.map(p=>p.id===originalId?row:p):[...extras.products,row])};
  if(convertingPrintId){
   const nextPrints=prints.map(p=>p.id===convertingPrintId?{...p,productId:id}:p);
   if(!persistWorkshop(rolls,nextPrints,next)){err.textContent='Impossible de créer le produit associé.';return;}
  }else if(!persistExtras(next)){err.textContent='Impossible de sauvegarder le produit.';return;}
  convertingPrintId=null;document.getElementById('product-dialog').close();render();notify('✓ Produit créé, impression reliée, catalogue mis à jour. Aucun filament déduit en double.');
  if(newProductPhotoDraft){const image=newProductPhotoDraft;newProductPhotoDraft=null;setPhoto('print:product:'+id,image).then(()=>hydratePhotos()).catch(e=>{console.error(e);notify('Produit enregistré, mais photo non synchronisée. Réessaie sur la fiche.',true);});}
 }
 async function selectNewProductPhoto(file){if(!file)return;try{newProductPhotoDraft=await fileToPhoto(file);const img=document.createElement('img');img.src=newProductPhotoDraft;img.alt='Aperçu';document.getElementById('product-new-photo-preview').replaceChildren(img);}catch(e){notify(e.message,true);}}

 function hardwarePage(){const h=extras.hardware;return header('COMPOSANTS','Hardware et fournitures','Ajoute, modifie et surveille tes composants.',`<button type="button" class="primary-btn" id="add-hardware">＋ Ajouter du hardware</button>`)+warning()+`<div class="stats-grid three">${statCard('▣',number(h.length),'Types de composants')}${statCard('◉',number(h.reduce((a,r)=>a+safeNum(r.remaining),0)),'Pièces restantes')}${statCard('⚠',number(h.filter(r=>safeNum(r.remaining)<=safeNum(r.threshold)).length),'Stocks à surveiller')}</div><section class="panel"><div class="panel-head"><div><h2>Inventaire hardware</h2><p>Les changements sont sauvegardés dans ce navigateur.</p></div></div><div class="inventory-card-grid">${h.map(r=>`<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(r.name||'Composant')}</h3><small>${esc(r.id||'')}</small></div><span class="pill ${safeNum(r.remaining)<=safeNum(r.threshold)?'low':'ok'}">${safeNum(r.remaining)<=safeNum(r.threshold)?'Stock faible':'En stock'}</span></div><div class="detail-grid"><div><small>Catégorie</small><strong>${esc(r.category||'—')}</strong></div><div><small>Restant</small><strong>${number(r.remaining)}</strong></div><div><small>Seuil bas</small><strong>${number(r.threshold)}</strong></div><div><small>Coût / pièce</small><strong>${money(r.unitCost)}</strong></div><div><small>Fournisseur</small><strong>${esc(r.supplier||'—')}</strong></div><div><small>Notes</small><strong>${esc(r.notes||'—')}</strong></div></div><div class="actions"><button type="button" class="secondary-btn" data-edit-hardware="${esc(r.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-delete-hardware="${esc(r.id)}">Supprimer</button></div></article>`).join('')||'<p class="empty">Aucun hardware. Clique sur « Ajouter du hardware ».</p>'}</div></section>`;}
 function persistExtras(next){try{const str=JSON.stringify(next);localStorage.setItem(EXTRA_KEY,str);if(localStorage.getItem(EXTRA_KEY)!==str)throw Error('Échec de vérification');extras=next;queueMicrotask(()=>window.dispatchEvent(new Event('printpilot:changed')));return true;}catch(e){console.error('Sauvegarde hardware:',e);notify('Impossible de sauvegarder le hardware.',true);return false;}}
 function openHardware(id){const r=id?extras.hardware.find(x=>x.id===id):null;const f=document.getElementById('hardware-form');f.reset();document.getElementById('hardware-error').textContent='';document.getElementById('hardware-dialog-title').textContent=r?'Modifier du hardware':'Ajouter du hardware';if(r){for(const [k,v] of Object.entries(r)){const inp=f.elements.namedItem(k);if(inp)inp.value=v??'';}f.elements.namedItem('originalId').value=r.id;}else{f.elements.namedItem('originalId').value='';f.elements.namedItem('initial').value='1';f.elements.namedItem('remaining').value='1';f.elements.namedItem('threshold').value='5';f.elements.namedItem('unitCost').value='0';}document.getElementById('hardware-dialog').showModal();}
 function saveHardware(e){e.preventDefault();const f=e.currentTarget;const data=Object.fromEntries(new FormData(f));const originalId=data.originalId;const id=data.id.trim();const row={...(extras.hardware.find(r=>r.id===originalId)||{}),id,name:data.name.trim(),category:data.category.trim(),initial:Number(data.initial),remaining:Number(data.remaining),threshold:Number(data.threshold),unitCost:Number(data.unitCost),supplier:data.supplier.trim(),notes:data.notes.trim()};const err=document.getElementById('hardware-error');if(!id||!row.name||!Number.isFinite(row.initial)||row.initial<0||!Number.isFinite(row.remaining)||row.remaining<0||!Number.isFinite(row.threshold)||row.threshold<0||!Number.isFinite(row.unitCost)||row.unitCost<0){err.textContent='Vérifie le nom, la référence et les valeurs numériques (0 ou plus).';return;}if(extras.hardware.some(r=>r.id===id&&r.id!==originalId)){err.textContent='Cet ID existe déjà : choisis une référence unique.';return;}const next={...extras,hardware:originalId?extras.hardware.map(r=>r.id===originalId?row:r):[...extras.hardware,row]};if(!persistExtras(next))return;document.getElementById('hardware-dialog').close();render();notify('✓ Hardware enregistré.');}
 function deleteHardware(id){const r=extras.hardware.find(x=>x.id===id);if(!r||!confirm(`Supprimer ${r.name} (${id}) ?`))return;const next={...extras,hardware:extras.hardware.filter(x=>x.id!==id)};if(persistExtras(next)){render();notify('Hardware supprimé.');}}

 // Chaque vente nouvelle porte un ID immutable; les ventes Excel restent historiques et non modifiables.
 function activeSales(){return extras.sales.filter(s=>s.status!=='cancelled');}
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
  const q=String(query).trim().toLowerCase();const records=extras.sales.slice().reverse().filter(v=>[v.product,v.productId,v.shopId,v.channel,v.notes,v.date].join(' ').toLowerCase().includes(q));
  if(!records.length)return '<p class="empty">Aucune vente. Clique sur « Enregistrer une vente » pour commencer.</p>';
  return `<div class="inventory-card-grid">${records.map(v=>{const editable=Boolean(v.id&&String(v.id).startsWith('sale-'));const canceled=v.status==='cancelled';return `<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(v.product||'Produit')}</h3><small>${esc(v.date||'Date Excel non précisée')} · ${esc(v.channel||'Autre')} · ${v.shopId?'ID #'+esc(v.shopId):'Vente Excel'}</small></div><span class="pill ${canceled?'low':'ok'}">${canceled?'Annulée':(editable?'Enregistrée':'Excel')}</span></div><div class="detail-grid"><div><small>Quantité</small><strong>${number(v.quantity)}</strong></div><div><small>Prix unitaire</small><strong>${money(v.unitPrice)}</strong></div><div><small>Vente brute</small><strong>${money(v.gross)}</strong></div><div><small>Commission</small><strong>${money(v.commission)}</strong></div><div><small>Coût total</small><strong>${money(v.cost)}</strong></div><div><small>Profit estimé</small><strong>${money(v.profit)}</strong></div></div>${v.notes?`<p class="small-hint">${esc(v.notes)}</p>`:''}${editable&&!canceled?`<div class="actions"><button type="button" class="secondary-btn" data-edit-sale="${esc(v.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-cancel-sale="${esc(v.id)}">Annuler / remettre le stock</button></div>`:''}</article>`}).join('')}</div>`;
 }
 function openSale(id=null, preselect=null){
  const prev=id?extras.sales.find(s=>s.id===id&&s.status!=='cancelled'):null;
  if(id&&!prev)return;
  if(!extras.products.length){notify('Importe d’abord tes produits pour enregistrer une vente.',true);return;}
  const f=document.getElementById('sale-form');f.reset();document.getElementById('sale-error').textContent='';document.getElementById('sale-title').textContent=prev?'Modifier la vente':'Enregistrer une vente';
  f.elements.namedItem('saleId').value=prev?.id||'';
  const select=f.elements.namedItem('productId');select.innerHTML='<option value="">Choisir un produit…</option>'+extras.products.map(p=>`<option value="${esc(p.id)}">#${esc(p.shopId)} · ${esc(p.name)} · ${esc(p.colors||'')} (${number(p.stock)} en stock)</option>`).join('');
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
 function loadExtras(){try{const raw=localStorage.getItem(EXTRA_KEY);const obj=raw?JSON.parse(raw):{};extras={products:ensureShopIds(Array.isArray(obj.products)?obj.products:[]),hardware:Array.isArray(obj.hardware)?obj.hardware:[],sales:Array.isArray(obj.sales)?obj.sales:[]};if(JSON.stringify(extras.products)!==JSON.stringify(obj.products||[])){try{localStorage.setItem(EXTRA_KEY,JSON.stringify(extras));}catch(e){console.warn('IDs numériques non persistés:',e);}}}catch(e){console.error('Extras invalides:',e);extras={products:[],hardware:[],sales:[]};}}
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
  const m=metrics(),prods=extras.products,sales=activeSales(),prod=combinedProductionMetrics();
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
  const stockDescription='La valeur commerciale utilise la quantité disponible × le prix de vente. Le coût de fabrication est une autre mesure.';
  return header('VUE D’ENSEMBLE','Tableau de bord','Statistiques de ton atelier — calculs comparables à ton Excel.',importButton())
  +warning()+(rolls.length?'<div class="notice">ⓘ &nbsp; Chiffres calculés depuis les données actuelles de PrintPilot (locales ou Firebase). Ton ancien Excel reste un instantané et peut différer après des nouvelles impressions ou ventes.</div>':excelNotice())
  +dashGroup('Production','Historique Excel + impressions ajoutées dans PrintPilot. La durée Excel est multipliée par la quantité imprimée.',[
   ['◷',clockDuration(p.minutes),'Temps total d’impression'],
   ['▤',number(p.units),'Unités imprimées'],
   ['◉',number(p.grams/1000,2)+' kg','Filament consommé estimé'],
   ['▣',number(p.recent.units),'Unités ajoutées dans PrintPilot']])
  +`<div class="pp-dash-explain">⏱ <b>Réconciliation des durées :</b> Excel historique : ${clockDuration(p.historic.minutes)}; nouvelles impressions : ${clockDuration(p.recent.minutes)}. Total : <b>${clockDuration(p.minutes)}</b>. Le calcul historique suit la formule de ton Excel (durée unitaire × nombre d’unités), sans déduire de filament supplémentaire.</div>`
  +dashGroup('Produits et valeur du stock',stockDescription,[
   ['$',money(d.retail),'Valeur des produits au prix de vente'],
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
  +`<div class="dash-grid"><section class="panel"><div class="panel-head"><div><h2>Stock par matériau</h2><p>Poids restant de tes bobines</p></div></div>${materialChart()}</section><section class="panel"><div class="panel-head"><div><h2>Actions rapides</h2><p>Pour gérer l’atelier</p></div></div><div class="quick-actions"><button type="button" data-go="filaments">◉ &nbsp; Filaments <span>→</span></button><button type="button" data-go="produits">⬡ &nbsp; Produits <span>→</span></button><button type="button" data-go="impressions">▤ &nbsp; Impressions <span>→</span></button><button type="button" data-go="finances">$ &nbsp; Finances <span>→</span></button></div></section></div>`
  +`<section class="panel recent"><div class="panel-head"><div><h2>Derniers filaments ajoutés</h2><p>Bobines de ton inventaire</p></div><button type="button" class="link-btn" data-go="filaments">Voir les bobines →</button></div>${rolls.length?`<div class="table-wrap"><table><thead><tr><th>ROULEAU</th><th>MATÉRIAU</th><th>RESTANT</th></tr></thead><tbody>${rolls.slice(-5).reverse().map(r=>`<tr><td><i class="dot" style="background:${safeColor(r.swatch)}"></i>${esc(r.brand)} — ${esc(r.color)}</td><td>${esc(r.material)}</td><td>${number(r.remaining)} g</td></tr>`).join('')}</tbody></table></div>`:`<p class="empty">Aucun filament enregistré.</p>`}</section>`;
 }
 function materialChart(){const totals={};rolls.forEach(r=>{const mat=String(r.material||'Autre');totals[mat]=(totals[mat]||0)+Number(r.remaining)});const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...entries.map(x=>x[1]));return entries.length?`<div class="bars">${entries.map(([name,value])=>`<div class="bar-row"><b>${esc(name)}</b><div class="bar-track"><span style="width:${Math.round(value/max*100)}%"></span></div><strong>${number(value/1000,2)} kg</strong></div>`).join('')}</div>`:'<p class="empty">Le graphique apparaîtra dès que tu ajouteras un rouleau.</p>';}
 function tableRows(){const filtered=rolls.filter(r=>`${r.brand} ${r.color} ${r.material} ${r.code||''}`.toLowerCase().includes(search.toLowerCase()));if(!filtered.length)return `<div class="empty">${rolls.length?'Aucun résultat pour cette recherche.':'Aucun rouleau enregistré. Clique sur « Ajouter un rouleau » pour commencer.'}</div>`;return `<div class="table-wrap"><table><thead><tr><th>FILAMENT</th><th>TYPE</th><th>RESTANT</th><th>PRIX</th><th>ÉTAT</th><th>ACTIONS</th></tr></thead><tbody>${filtered.map(r=>{const p=Math.round(Number(r.remaining)/Number(r.initial)*100);return `<tr data-roll-row="${esc(r.id)}"><td><i class="dot" style="background:${safeColor(r.swatch)}"></i><b>${esc(r.brand)} — ${esc(r.color)}</b><small class="code">${esc(r.code||'')}</small></td><td>${esc(r.material)}</td><td><b>${number(r.remaining)} / ${number(r.initial)} g</b><div class="progress"><span style="width:${p}%"></span></div></td><td>${money(r.price||0)}</td><td><span class="pill ${Number(r.remaining)<200?'low':'ok'}">${Number(r.remaining)<200?'Stock faible':'OK'}</span></td><td class="actions"><button type="button" class="secondary-btn" data-edit="${esc(r.id)}">Modifier</button><button type="button" class="secondary-btn danger" data-delete="${esc(r.id)}">Supprimer</button></td></tr>`}).join('')}</tbody></table></div>`;}
 function filaments(){const m=metrics();return header('INVENTAIRE','Mes filaments','Ajoute et gère tes rouleaux. Données enregistrées dans ce navigateur.',`<div class="header-actions"><button type="button" id="add-roll" class="primary-btn">＋ Ajouter un rouleau</button>${importButton()}</div>`)+warning()+`<div class="notice">ⓘ &nbsp; Version locale : les données ne sont pas encore synchronisées avec ton téléphone. Évite toute donnée professionnelle ou sensible.</div><div class="stats-grid three">${statCard('◉',number(m.count),'Rouleaux')}${statCard('▥',number(m.grams/1000,2)+' kg','Poids restant')}${statCard('⚠',number(m.low),'Stock faible : moins de 200 g')}</div><section class="panel"><div class="panel-head inventory-title"><div><h2>Inventaire</h2><p>Modifie ou supprime tes rouleaux à droite.</p></div><div class="inventory-tools"><input type="search" id="roll-search" placeholder="Rechercher un rouleau…" value="${esc(search)}" aria-label="Rechercher un rouleau"><button type="button" class="secondary-btn" id="export-json">Exporter JSON</button></div></div><div id="inventory-rows">${tableRows()}</div></section>`;}

 function printPage(){const active=prints.filter(p=>p.status==='active');const grams=active.reduce((a,p)=>a+p.usage.reduce((b,u)=>b+Number(u.grams),0),0);const mins=active.reduce((a,p)=>a+Number(p.minutes||0),0);const production=combinedProductionMetrics();
  const rows=prints.slice().reverse().map(p=>{const used=p.usage.map(u=>{const r=rolls.find(x=>x.id===u.rollId);return esc(r?(r.brand+' — '+r.color):(u.label||u.rollId))+' · '+number(u.grams,1)+' g'}).join('<br>');return `<tr><td><div class="print-product-cell">${thumb(p.id)}<div><b>${esc(p.product||'Impression libre')}</b><small class="code">${esc(p.date||'')} · ${esc(p.printer||'—')}</small><small class="code">${esc(p.id)}</small></div></div></td><td>${number(p.quantity||1)}</td><td>${used}</td><td>${number(p.usage.reduce((a,u)=>a+Number(u.grams),0),1)} g</td><td>${clockDuration(p.minutes||0)}</td><td><span class="pill ${p.status==='active'?'ok':'low'}">${p.status==='active'?'Enregistrée':'Annulée'}</span></td><td>${p.status==='active'?`<div class="actions"><button type="button" class="secondary-btn" data-edit-print="${esc(p.id)}">Modifier</button>${!p.productId?`<button type="button" class="secondary-btn" data-convert-print="${esc(p.id)}">📦 Créer la fiche Produit</button>`:""}<button type="button" class="secondary-btn danger" data-cancel-print="${esc(p.id)}">Annuler</button></div>`:'—'}</td></tr>`}).join('');
  return header('PRODUCTION','Mes impressions','Une seule saisie : crée ton produit au besoin, déduis les bobines et ajoute les unités au catalogue.',`<div class="header-actions"><button type="button" class="primary-btn" id="add-print">＋ Ajouter une impression terminée</button></div>`)+warning()+`<div class="notice">ⓘ &nbsp; L’enregistrement déduit immédiatement les grammes indiqués de chaque bobine. Une annulation remet ces grammes dans le stock. Les anciennes impressions sont conservées dans l’historique.</div><div class="stats-grid three">${statCard('▤',number(production.units),'Unités produites (Excel + nouvelles)')}${statCard('◉',number(production.grams,1)+' g','Filament consommé (historique + nouveau)')}${statCard('◷',clockDuration(production.minutes),'Temps de production équivalent')}</div><div class="notice">📄 &nbsp; <b>Production des fiches (Excel + PrintPilot) :</b> ${number(production.historic.units)} unités · ${number(production.historic.grams,1)} g estimés · ${clockDuration(production.historic.minutes)} recensées. &nbsp; <b>Nouvelles impressions PrintPilot :</b> ${number(active.length)} sessions (${number(production.recent.units)} unités) · ${number(grams,1)} g · ${clockDuration(mins)}. Les impressions liées à une fiche ne sont pas ajoutées deux fois. <b>Le stock historique n’est jamais déduit une deuxième fois.</b></div><section class="panel"><div class="panel-head"><div><h2>Historique des impressions</h2><p>${prints.length} entrée(s), annulations incluses</p></div><div class="pp-history-tools"><input id="print-history-search" class="table-filter" type="search" placeholder="Rechercher une impression, une bobine, une date…" aria-label="Rechercher les impressions terminées"><button class="secondary-btn" id="export-full" type="button">Exporter une sauvegarde</button><button class="secondary-btn" id="apply-reconciliation" type="button">Appliquer correction d’inventaire</button></div></div>${rows?`<div class="table-wrap"><table id="print-history-table"><thead><tr><th>PRODUIT / DATE</th><th>QTÉ</th><th>BOBINES UTILISÉES</th><th>CONSOMMATION</th><th>DURÉE</th><th>STATUT</th><th>ACTION</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="empty">Aucune impression enregistrée. Clique sur « Nouvelle impression » pour commencer.</p>'}</section><section class="panel"><div class="panel-head"><div><h2>Historique de production Excel — détails des filaments</h2><p>${extras.products.length} variantes disponibles comme références pour tes impressions. L’historique Excel est déjà reflété dans le stock : aucune déduction supplémentaire.</p></div><input id="print-catalog-search" type="search" class="table-filter" placeholder="Rechercher nom ou ID…" aria-label="Rechercher dans les produits Excel"></div>${filterToolbar('impressions')}<div id="print-catalog-results">${printCatalogRows('')}</div></section>`;
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
 function printCatalogRows(query=''){const items=filteredProducts('impressions',query);return items.length?`<div class="inventory-card-grid">${items.map(p=>`<article class="inventory-card"><div class="inventory-card-head"><div><h3>${esc(p.name)}</h3><small>ID stock #${esc(p.shopId)} · ${esc(p.id)}</small></div><strong>${money(p.price)}</strong></div><div class="detail-grid"><div><small>Couleurs</small><strong>${esc(p.colors||'—')}</strong></div><div><small>Quantité en stock</small><strong>${number(p.stock)}</strong></div><div><small>Temps d’impression (Excel)</small><strong>${esc(excelPrintDuration(p))}</strong></div><div><small>Unités fabriquées</small><strong>${number(p.printed||0)}</strong></div><div><small>Poids déclaré / unité</small><strong>${number(safeNum(p.grams),2)} g</strong></div><div><small>Matériaux détaillés / unité</small><strong>${number(excelUsageTotal(p),2)} g</strong></div></div><div class="material-history"><span class="material-heading">Bobines et grammes (Excel, par unité)</span>${excelMaterials(p)}</div><button type="button" class="secondary-btn" data-new-print-product="${esc(p.id)}">＋ Enregistrer une nouvelle impression</button></article>`).join('')}</div>`:'<p class="empty">Aucun produit pour cette recherche.</p>';}
 function usageRow(rollId='',grams=''){
  const opts=rolls.map(r=>`<option value="${esc(r.id)}" ${r.id===rollId?'selected':''}>${esc(r.brand)} — ${esc(r.color)} (${esc(r.code||r.id)}) · ${number(r.remaining,1)} g</option>`).join('');
  return `<div class="usage-line"><select class="usage-roll" aria-label="Bobine utilisée" required><option value="">Choisir une bobine…</option>${opts}</select><input type="number" class="usage-grams" aria-label="Grammes consommés" min="0.1" step="0.1" placeholder="Grammes" value="${esc(grams)}" required><button class="secondary-btn usage-remove" type="button" title="Retirer cette bobine">×</button></div>`;
 }
 // Données Excel affichées dans le formulaire; seules les mesures connues sont préremplies.
 function selectedProductInfo({prefillDuration=false}={}){
  const select=document.getElementById('print-product');
  const panel=document.getElementById('selected-product-info');
  const p=extras.products.find(item=>String(item.id)===select.value);
  if(!p){panel.hidden=true;panel.innerHTML='';if(prefillDuration){const f=document.getElementById('print-form');f.elements.namedItem('minutes').value='0';f.elements.namedItem('hours').value='0';f.elements.namedItem('minutePart').value='0';}return;}
  const rawDays=Number(p.timeDays);
  const knownTime=p.timeDays!==null&&p.timeDays!==undefined&&p.timeDays!==''&&Number.isFinite(rawDays)&&rawDays>0;
  const mins=knownTime?Math.round(rawDays*24*60):null;
  if(prefillDuration){const f=document.getElementById('print-form');f.elements.namedItem('minutes').value=mins===null?'0':String(mins);f.elements.namedItem('hours').value=mins===null?'0':String(Math.floor(mins/60));f.elements.namedItem('minutePart').value=mins===null?'0':String(mins%60);}
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
  if(!rolls.length){notify('Ajoute ou importe d’abord une bobine.',true);location.hash='filaments';return;}
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
  }else if(product){const target=nextProducts.find(p=>p.id===product.id);target.stock=safeNum(target.stock)+quantity;target.printed=safeNum(target.printed)+quantity;}
  if(nextProducts.some(p=>safeNum(p.stock)<0)){error.textContent='Modification impossible : des produits de cette impression ont déjà été vendus. Vérifie leur stock avant de modifier.';return;}
  if(!persistWorkshop(nextRolls,nextPrints,{...extras,hardware:nextHardware,products:nextProducts})){error.textContent='Impossible de sauvegarder ensemble l’impression et le catalogue.';return;}
  document.getElementById('print-dialog').close();editingPrintId=null;render();notify('✓ Impression enregistrée, bobines déduites et catalogue / stock mis à jour!');
  if(photoDraft){const pic=photoDraft;photoDraft=null;Promise.all([setPhoto('print:'+entry.id,pic),...(creating?[setPhoto('print:product:'+entry.productId,pic)]:[])]).then(()=>hydratePhotos()).catch(e=>{console.error(e);notify('Production enregistrée, mais photo non synchronisée; garde ta photo originale.',true);});}

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
  if(extras.products.length!==patch.expectedCounts.products||prints.length!==patch.expectedCounts.prints||extras.sales.length!==patch.expectedCounts.sales)throw Error('Ton inventaire a évolué depuis la sauvegarde. Il faut une nouvelle comparaison avant de corriger.');
  const byShopId=new Map(extras.products.map(p=>[String(p.shopId),p]));
  for(const base of patch.baseline){
   const curr=byShopId.get(String(base.shopId));
   if(!curr||curr.id!==base.id||String(curr.colors||'')!==String(base.colors||'')||['printed','stock','price','timeDays'].some(k=>Math.abs(safeNum(curr[k])-safeNum(base[k]))>1e-7))throw Error('Un produit a changé depuis la sauvegarde : '+(base.id||'inconnu')+'.');
  }
  if(patch.products.length<extras.products.length||!patch.products.every(p=>p&&typeof p.id==='string'&&Number.isFinite(Number(p.price))&&Number.isFinite(Number(p.stock))))throw Error('Produits invalides dans le correctif.');
  const newRetail=patch.products.reduce((sum,p)=>sum+safeNum(p.stock)*safeNum(p.price),0);
  const newMins=patch.products.reduce((sum,p)=>sum+safeNum(p.timeDays)*1440*safeNum(p.printed),0);
  const msg=`Correction vérifiée.\n\nAvant : ${extras.products.length} variantes, ${money(extras.products.reduce((s,p)=>s+safeNum(p.stock)*safeNum(p.price),0))} de stock.\nAprès : ${patch.products.length} variantes, ${money(newRetail)} de stock et ${clockDuration(newMins)} de production équivalente.\n\nLes rouleaux, les impressions, les ventes, le hardware et les photos ne seront PAS modifiés. Aucun gramme déduit.\n\nTu as bien exporté ta sauvegarde JSON avant de continuer ?`;
  if(!confirm(msg))return;
  const next={...extras,products:patch.products};
  if(!persistExtras(next))throw Error('Échec de sauvegarde des nouveaux produits.');
  render();notify('✓ Correction appliquée. Vérifie la synchronisation Firebase et les statistiques.');
 }
 function exportFull(){const data={version:2,exportedAt:new Date().toISOString(),filaments:rolls,prints,products:extras.products,hardware:extras.hardware,sales:extras.sales};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='printpilot-sauvegarde-complete.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Sauvegarde complète exportée.');}
 function financeProductRows(query=''){
  const products=extras.products.filter(p=>[p.shopId,p.id,p.name,p.category,p.colors].join(' ').toLowerCase().includes(String(query).toLowerCase()));
  if(!products.length)return '<p class="empty">Aucun produit correspondant.</p>';
  return `<div class="finance-card-grid">${products.map(p=>{
   const rate=safeNum(p.commissionRate), commission=safeNum(p.price)*rate;
   const profit=safeNum(p.price)-commission-safeNum(p.unitCost);
   return `<article class="finance-product-card">
     <div class="finance-card-head"><div class="finance-product-name"><span class="finance-shop-id">#${esc(p.shopId)}</span><div><strong>${esc(p.name)}</strong><small>ID Excel : ${esc(p.id)}</small></div></div><span class="finance-price">${money(p.price)}</span></div>
     <div class="finance-card-color"><span>Couleurs</span><b>${esc(p.colors||'—')}</b></div>
     <dl class="finance-cost-grid">
       <div><dt>Filament</dt><dd>${money(p.filamentCost)}</dd></div>
       <div><dt>Autres coûts</dt><dd>${money(p.otherCost)}</dd></div>
       <div><dt>Coût unitaire</dt><dd>${money(p.unitCost)}</dd></div>
       <div><dt>Commission (${number(rate*100,0)} %)</dt><dd>${money(commission)}</dd></div>
     </dl>
     <div class="finance-card-footer"><div><span>Profit estimé / unité</span><strong>${money(profit)}</strong></div><div><span>En stock</span><strong>${number(p.stock)}</strong></div></div>
   </article>`;
  }).join('')}</div>`;
 }
 function financePage(){
  const products=extras.products,sales=activeSales(),active=prints.filter(p=>p.status==='active');
  const gross=sales.reduce((a,x)=>a+safeNum(x.gross),0),commissions=sales.reduce((a,x)=>a+safeNum(x.commission),0),profits=sales.reduce((a,x)=>a+safeNum(x.profit),0);
  const stockRevenue=products.reduce((a,p)=>a+safeNum(p.stock)*safeNum(p.price),0);
  const stockCost=products.reduce((a,p)=>a+safeNum(p.stock)*safeNum(p.unitCost),0);
  const materials=active.reduce((a,p)=>a+printMaterialCost(p),0);
  return header('GESTION','Finances','Tous les prix, les coûts et les profits de ton Excel, produit par produit.',`<button type="button" class="secondary-btn" id="export-finance">↧ Exporter les prix CSV</button>`)
   +warning()+(!products.length?excelNotice():'')
   +`<div class="notice">ⓘ &nbsp; Prix et coûts importés de ton Excel. Les profits par produit sont des <b>estimations</b> d’après prix − commission − coût unitaire; les montants réels des ventes sont affichés séparément. Les coûts d’impression ne sont pas additionnés aux coûts des produits pour éviter de compter deux fois.</div>`
   +`<div class="stats-grid">${statCard('$',money(stockRevenue),'Valeur du stock au prix de vente')}${statCard('▣',money(stockCost),'Coût total estimé du stock')}${statCard('↗',money(profits),'Profit des ventes')}${statCard('◉',money(gross),'Ventes brutes')}</div>`
   +`<section class="panel"><div class="panel-head"><div><h2>Liste des prix et coûts (${products.length} variantes)</h2><p>Tous les prix et coûts affichés en fiches, sans défilement horizontal.</p></div><input type="search" id="finance-search" class="table-filter" placeholder="Rechercher ID, nom, couleur…" aria-label="Rechercher dans les finances"></div><div id="finance-products">${financeProductRows('')}</div></section>`
   +`<section class="panel"><div class="panel-head"><div><h2>Ventes enregistrées</h2><p>Ventes importées et nouvelles ventes enregistrées, annulations exclues.</p></div></div><div class="stats-grid three">${statCard('$',money(gross),'Ventes brutes')}${statCard('▣',money(commissions),'Commissions payées')}${statCard('↗',money(profits),'Profit déclaré')}</div><div class="table-wrap"><table><thead><tr><th>PRODUIT</th><th>QUANTITÉ</th><th>CANAL</th><th>PRIX UNIT.</th><th>VENTES</th><th>COMMISSION</th><th>COÛT</th><th>PROFIT</th></tr></thead><tbody>${sales.map(x=>`<tr><td>${esc(x.product)}</td><td>${number(x.quantity)}</td><td>${esc(x.channel)}</td><td>${money(x.unitPrice)}</td><td>${money(x.gross)}</td><td>${money(x.commission)}</td><td>${money(x.cost)}</td><td>${money(x.profit)}</td></tr>`).join('')||'<tr><td colspan="8">Aucune vente enregistrée.</td></tr>'}</tbody></table></div></section>`
   +`<section class="panel"><div class="panel-head"><div><h2>Coûts matière des impressions ajoutées</h2><p>Calculés selon le prix payé par bobine et les grammes enregistrés : ${money(materials)} au total.</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>IMPRESSION</th><th>DATE</th><th>QUANTITÉ</th><th>GRAMMES</th><th>COÛT MATIÈRE</th></tr></thead><tbody>${active.map(p=>`<tr><td>${esc(p.id)}</td><td>${esc(p.product)}</td><td>${esc(p.date)}</td><td>${number(p.quantity)}</td><td>${number(p.usage.reduce((a,u)=>a+Number(u.grams),0),1)} g</td><td>${money(printMaterialCost(p))}</td></tr>`).join('')||'<tr><td colspan="6">Aucune impression pour le moment.</td></tr>'}</tbody></table></div></section>`;
 }
 function catalogPage(){const items=extras.products;return header('PARTAGE','Catalogue à partager','ID, nom, photo, prix et stock : une vue destinée à ta partenaire de vente.',`<button type="button" class="primary-btn" id="download-catalog">↧ Catalogue HTML</button><button type="button" class="secondary-btn" id="download-catalog-csv">↧ IDs / stock CSV</button>`)+`<div class="notice">🔒 &nbsp; Le catalogue exporté est une copie publique sans tes coûts ni tes profits. Il n’est pas encore accessible par lien : pour cela, il faudra le publier sur un hébergement autorisé. Ajoute une photo à un produit ci-dessous; connecté à Firebase, elle sera visible sur tes autres appareils.</div><section class="panel"><div class="panel-head"><div><h2>Produits à présenter (${items.length})</h2></div><input type="search" id="catalog-search" class="table-filter" placeholder="Rechercher un ID ou produit…"></div>${filterToolbar('catalogue')}<div id="catalog-results">${catalogRows('')}</div></section>`;}
 function catalogRows(query){
  const items=filteredProducts('catalogue',query);
  return `<div class="catalog-grid">${items.map(p=>`<article class="catalog-card"><button type="button" class="catalog-card-open" data-view-catalog="${esc(p.id)}" aria-label="Voir la fiche de ${esc(p.name)}">${thumb('product:'+p.id,'catalog-image')}<div class="catalog-card-caption"><span class="catalog-card-name">${esc(p.name)}</span><span class="catalog-card-price">${money(p.price)}</span><small>ID stock #${esc(p.shopId)} · Stock : ${number(p.stock)}</small><span class="catalog-card-hint">Voir la fiche →</span></div></button></article>`).join('')||'<p class="empty">Aucun produit.</p>'}</div>`;
 }
 function openCatalogDetails(id){
  const p=extras.products.find(x=>String(x.id)===String(id));
  if(!p){notify('Ce produit est introuvable.',true);return;}
  const dialog=document.getElementById('catalog-detail-dialog');
  const photo=document.getElementById('catalog-detail-photo');
  const title=document.getElementById('catalog-detail-name');
  photo.innerHTML=thumb('product:'+p.id,'catalog-detail-image');
  title.textContent=p.name||'Produit';
  const details=document.getElementById('catalog-detail-fields');
  details.innerHTML=`<div><small>Prix de vente</small><strong class="catalog-detail-price">${money(p.price)}</strong></div><div><small>Quantité en stock</small><strong>${number(p.stock)}</strong></div><div><small>ID stock</small><strong>#${esc(p.shopId)}</strong></div><div><small>ID Excel / référence</small><strong>${esc(p.id)}</strong></div><div><small>Catégorie</small><strong>${esc(p.category||'—')}</strong></div><div><small>Couleur(s)</small><strong>${esc(p.colors||'—')}</strong></div>`;
  document.getElementById('catalog-detail-upload').dataset.uploadProduct=p.id;
  document.getElementById('catalog-detail-camera').dataset.cameraProduct=p.id;
  dialog.showModal();
  hydratePhotos();
 }

 function downloadText(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function exportFinance(){
  const rows=[['ID stock','ID Excel','Produit','Catégorie','Couleurs','Prix de vente CAD','Coût filament CAD','Autres coûts CAD','Coût unitaire CAD','Commission %','Commission unitaire CAD','Profit unitaire estimé CAD','Quantité stock','Valeur stock CAD'],
   ...extras.products.map(p=>[p.shopId,p.id,p.name,p.category,p.colors,safeNum(p.price).toFixed(2),safeNum(p.filamentCost).toFixed(2),safeNum(p.otherCost).toFixed(2),safeNum(p.unitCost).toFixed(2),(safeNum(p.commissionRate)*100).toFixed(0),(safeNum(p.price)*safeNum(p.commissionRate)).toFixed(2),(safeNum(p.price)*(1-safeNum(p.commissionRate))-safeNum(p.unitCost)).toFixed(2),safeNum(p.stock),(safeNum(p.stock)*safeNum(p.price)).toFixed(2)])];
  downloadText('printpilot-prix-produits.csv','\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8');
  notify('Liste complète des prix exportée en CSV.');
 }
 async function exportCatalog(){try{const cards=await Promise.all(extras.products.map(async p=>{const pic=await getPhoto('print:product:'+p.id);return `<article>${pic?`<img src="${pic}" alt="">`:'<div class="placeholder-img">Photo à venir</div>'}<small><b>ID stock : ${esc(p.shopId)}</b></small><p><small>ID Excel : ${esc(p.id)}</small></p><h2>${esc(p.name)}</h2><p>${esc(p.category||'')} • ${esc(p.colors||'')}</p><strong>${money(p.price)}</strong><p>Stock : ${number(p.stock)}</p></article>`;}));const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catalogue 3D</title><style>body{font:16px system-ui;margin:0;background:#f5f5fa;color:#222}header{background:#171a30;color:white;padding:35px 5%}main{padding:25px 5%;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}article{background:white;border-radius:14px;padding:18px;box-shadow:0 3px 18px #0001}img,.placeholder-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:#e6e5f2;display:grid;place-items:center;color:#666}h2{font-size:17px}small{color:#6a61b0}strong{font-size:20px}footer{padding:30px 5%;color:#777}</style></head><body><header><h1>Catalogue de créations 3D</h1><p>Produits, ID numérique, ID Excel et prix — copie du ${new Date().toLocaleDateString('fr-CA')}</p></header><main>${cards.join('')}</main><footer>Ce catalogue est une copie statique. Les stocks ne se mettent pas à jour automatiquement.</footer></body></html>`;downloadText('catalogue-3d-partage.html',html,'text/html;charset=utf-8');notify('Catalogue HTML créé. Il peut être envoyé comme fichier.');}catch(e){console.error(e);notify('Impossible de préparer le catalogue.',true)}}
 function placeholder(p){return header('PRINTPILOT 3D',pages[p], 'Une section du gestionnaire complet.')+`<section class="panel placeholder"><div class="placeholder-icon">⬡</div><h2>À venir</h2><p>On ajoutera ici les fonctionnalités de ${esc(pages[p].toLowerCase())}.</p><button type="button" class="primary-btn" data-go="filaments">Voir mes filaments</button></section>`;}
 function render(){const p=page();app.innerHTML=p==='dashboard'?dashboard():p==='filaments'?filaments():p==='produits'?productPage():p==='commandes'?salesPage():p==='hardware'?hardwarePage():p==='impressions'?printPage():p==='finances'?financePage():p==='catalogue'?catalogPage():placeholder(p);document.getElementById('page-name').textContent=pages[p];document.querySelectorAll('[data-page]').forEach(n=>{n.classList.toggle('active',n.dataset.page===p);n.setAttribute('aria-current',n.dataset.page===p?'page':'false')});document.getElementById('sidebar').classList.remove('open');document.querySelectorAll('#mobile-navigation [data-page]').forEach(n=>{n.classList.toggle('active',n.dataset.page===p);n.setAttribute('aria-current',n.dataset.page===p?'page':'false');});const filterCount=document.getElementById(p+'-count');if(filterCount&&uiFilters[p])filterCount.textContent=filteredProducts(p).length+' résultat(s)';document.body.classList.toggle('finance-view',p==='finances');document.querySelectorAll('.table-wrap table').forEach(table=>{const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.setAttribute('data-label',headers[i]||'')));});hydratePhotos();}
 function openRoll(id){form.reset();form.elements.namedItem('id').value='';document.getElementById('form-error').textContent='';document.getElementById('dialog-title').textContent=id?'Modifier le rouleau':'Ajouter un rouleau';if(id){const r=rolls.find(x=>x.id===id);if(!r)return;for(const [key,val] of Object.entries(r)){const input=form.elements.namedItem(key);if(input){if(key==='material'&&input.tagName==='SELECT'&&![...input.options].some(o=>o.value===String(val)))input.add(new Option(String(val),String(val)));input.value=val??'';}}}dialog.showModal();}
 function saveRoll(event){event.preventDefault();const vals=Object.fromEntries(new FormData(form).entries());const r={id:vals.id||`roll-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,brand:String(vals.brand||'').trim(),color:String(vals.color||'').trim(),material:vals.material,code:String(vals.code||'').trim(),initial:Number(vals.initial),remaining:Number(vals.remaining),price:Number(vals.price),swatch:safeColor(vals.swatch)};const error=document.getElementById('form-error');if(!r.brand||!r.color||!rollOk(r)||!Number.isFinite(r.price)||r.price<0||vals.initial===''||vals.remaining===''||vals.price===''){error.textContent='Vérifie les champs : marque, couleur, poids et prix. Le poids restant ne peut pas dépasser le poids initial.';return;}const next=rolls.slice();const idx=next.findIndex(x=>x.id===r.id);if(idx>=0)next[idx]=r;else next.push(r);if(!persist(next)){error.textContent=storageError;return;}rolls=next;search='';dialog.close();render();notify('✓ Rouleau enregistré!');}
 function removeRoll(id){const r=rolls.find(x=>x.id===id);if(prints.some(p=>p.status==='active'&&p.usage.some(u=>u.rollId===id))){notify('Cette bobine est liée à une impression active. Annule d’abord cette impression.',true);return;}if(!r||!confirm(`Supprimer ${r.brand} — ${r.color} ?`))return;const next=rolls.filter(x=>x.id!==id);if(persist(next)){rolls=next;render();notify('Rouleau supprimé.');}}
 function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),filaments:rolls},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='printpilot-filaments.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Export JSON créé.');}
 // LISTENER DIRECT permanent : il n'est jamais détruit lors d'un render().
 form.addEventListener('submit',saveRoll);
 document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
 document.getElementById('cancel-dialog').addEventListener('click',()=>dialog.close());
 document.getElementById('print-form').addEventListener('submit',savePrint);
 document.getElementById('print-product').addEventListener('change',()=>{if(!editingPrintId){selectedProductInfo({prefillDuration:true});const p=extras.products.find(x=>String(x.id)===document.getElementById('print-product').value);suggestExcelUsage(p);suggestHardwareFromProduct();if(p?.printer)setChoiceValue(document.getElementById('print-form'),'printer',p.printer);refreshPrintCreation();}else{selectedProductInfo();refreshPrintCreation();}});
 document.getElementById('print-form').addEventListener('input',updatePrintCreationCost);document.getElementById('print-form').addEventListener('change',updatePrintCreationCost);
 document.getElementById('print-form').elements.namedItem('quantity').addEventListener('change',()=>{if(!editingPrintId){const p=extras.products.find(x=>String(x.id)===document.getElementById('print-product').value);if(p)suggestExcelUsage(p);suggestHardwareFromProduct();}});
 document.getElementById('sale-form').addEventListener('submit',saveSale);
 document.getElementById('sale-form').elements.namedItem('productId').addEventListener('change',()=>updateSaleProduct(true));
 document.getElementById('sale-form').elements.namedItem('channel').addEventListener('change',()=>updateSaleChannel(true));
 document.getElementById('sale-form').addEventListener('input',updateSalePreview);
 document.getElementById('close-sale').addEventListener('click',()=>document.getElementById('sale-dialog').close());
 document.getElementById('cancel-sale-dialog').addEventListener('click',()=>document.getElementById('sale-dialog').close());
 document.getElementById('print-form').addEventListener('input',e=>{if(e.target.closest('#print-hardware-lines'))updatePrintCreationCost();});document.getElementById('print-form').addEventListener('change',e=>{if(e.target.closest('#print-hardware-lines'))updatePrintCreationCost();});document.getElementById('product-form').addEventListener('submit',saveProduct);document.getElementById('product-form').addEventListener('input',updateProductCost);document.getElementById('product-form').addEventListener('change',updateProductCost);document.getElementById('close-product').addEventListener('click',()=>{convertingPrintId=null;document.getElementById('product-dialog').close();});document.getElementById('cancel-product').addEventListener('click',()=>{convertingPrintId=null;document.getElementById('product-dialog').close();});document.getElementById('product-camera-button').addEventListener('click',()=>document.getElementById('product-new-camera').click());document.getElementById('product-new-camera').addEventListener('change',e=>{selectNewProductPhoto(e.target.files[0]);e.target.value='';});document.getElementById('product-new-photo').addEventListener('change',e=>{selectNewProductPhoto(e.target.files[0]);e.target.value='';});
 document.getElementById('hardware-form').addEventListener('submit',saveHardware);
 document.getElementById('close-hardware').addEventListener('click',()=>document.getElementById('hardware-dialog').close());
 document.getElementById('cancel-hardware').addEventListener('click',()=>document.getElementById('hardware-dialog').close());
 document.getElementById('close-print').addEventListener('click',()=>document.getElementById('print-dialog').close());
 document.getElementById('cancel-print-dialog').addEventListener('click',()=>document.getElementById('print-dialog').close());
 document.getElementById('catalog-detail-close').addEventListener('click',()=>document.getElementById('catalog-detail-dialog').close());
 document.getElementById('menu-toggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
 document.addEventListener('click',event=>{const add=event.target.closest('#add-roll');const edit=event.target.closest('[data-edit]');const del=event.target.closest('[data-delete]');const go=event.target.closest('[data-go]');if(add)openRoll();else if(edit)openRoll(edit.dataset.edit);else if(del)removeRoll(del.dataset.delete);else if(go)location.hash=go.dataset.go;else if(event.target.closest('#export-json'))exportData();else if(event.target.closest('#import-excel'))document.getElementById('excel-upload-file').click();else if(event.target.closest('#add-product')){convertingPrintId=null;openProduct();}else if(event.target.closest('[data-edit-product]'))openProduct(event.target.closest('[data-edit-product]').dataset.editProduct);else if(event.target.closest('#add-print'))openPrint();else if(event.target.closest('#add-sale'))openSale();else if(event.target.closest('[data-new-sale-product]')){location.hash='commandes';openSale(null,event.target.closest('[data-new-sale-product]').dataset.newSaleProduct);}else if(event.target.closest('[data-edit-sale]'))openSale(event.target.closest('[data-edit-sale]').dataset.editSale);else if(event.target.closest('[data-cancel-sale]'))cancelSale(event.target.closest('[data-cancel-sale]').dataset.cancelSale);else if(event.target.closest('#add-hardware'))openHardware();else if(event.target.closest('[data-edit-hardware]'))openHardware(event.target.closest('[data-edit-hardware]').dataset.editHardware);else if(event.target.closest('[data-delete-hardware]'))deleteHardware(event.target.closest('[data-delete-hardware]').dataset.deleteHardware);else if(event.target.closest('[data-new-print-product]')){location.hash='impressions';openPrint(null,event.target.closest('[data-new-print-product]').dataset.newPrintProduct);}else if(event.target.closest('[data-convert-print]'))createProductFromExistingPrint(event.target.closest('[data-convert-print]').dataset.convertPrint);else if(event.target.closest('[data-edit-print]'))openPrint(event.target.closest('[data-edit-print]').dataset.editPrint);else if(event.target.closest('#add-product-material')){document.getElementById('product-material-lines').insertAdjacentHTML('beforeend',productMaterialRow());updateProductCost();}else if(event.target.closest('.product-remove-material')){event.target.closest('.product-material-line').remove();updateProductCost();}else if(event.target.closest('#add-product-hardware')){document.getElementById('product-hardware-lines').insertAdjacentHTML('beforeend',hardwareRow('product'));updateProductCost();}else if(event.target.closest('#add-print-hardware')){document.getElementById('print-hardware-lines').insertAdjacentHTML('beforeend',hardwareRow('print'));updatePrintCreationCost();}else if(event.target.closest('.hardware-remove')){event.target.closest('.hardware-line').remove();updateProductCost();updatePrintCreationCost();}else if(event.target.closest('#add-usage'))document.getElementById('usage-lines').insertAdjacentHTML('beforeend',usageRow());else if(event.target.closest('.usage-remove')){const lines=document.querySelectorAll('#usage-lines .usage-line');if(lines.length>1)event.target.closest('.usage-line').remove();else notify('Il faut au moins une bobine.',true);}else if(event.target.closest('[data-cancel-print]'))cancelPrint(event.target.closest('[data-cancel-print]').dataset.cancelPrint);else if(event.target.closest('#export-full'))exportFull();else if(event.target.closest('#apply-reconciliation'))chooseReconciliation();else if(event.target.closest('#export-finance'))exportFinance();else if(event.target.closest('[data-view-catalog]'))openCatalogDetails(event.target.closest('[data-view-catalog]').dataset.viewCatalog);else if(event.target.closest('#download-catalog'))exportCatalog();else if(event.target.closest('#download-catalog-csv'))catalogCsv();else if(event.target.closest('[data-upload-product]')){document.getElementById('product-photo').dataset.productId=event.target.closest('[data-upload-product]').dataset.uploadProduct;document.getElementById('product-photo').click();}else if(event.target.closest('[data-camera-product]')){const file=document.getElementById('product-camera');file.dataset.productId=event.target.closest('[data-camera-product]').dataset.cameraProduct;file.click();}});
 document.addEventListener('input',event=>{if(event.target.id==='print-history-search'){const q=normFilter(event.target.value);document.querySelectorAll('#print-history-table tbody tr').forEach(row=>{row.hidden=!normFilter(row.textContent).includes(q);});}else if(event.target.id==='print-catalog-search'){uiFilters.impressions.q=event.target.value;updateFilteredView('impressions');}else if(event.target.id==='roll-search'){search=event.target.value;document.getElementById('inventory-rows').innerHTML=tableRows();}else if(event.target.id==='finance-search'){document.getElementById('finance-products').innerHTML=financeProductRows(event.target.value);}else if(event.target.id==='catalog-search'){uiFilters.catalogue.q=event.target.value;updateFilteredView('catalogue');}else if(event.target.id==='sales-search'){document.getElementById('sales-results').innerHTML=salesCards(event.target.value);}else if(event.target.id==='product-search'){uiFilters.produits.q=event.target.value;updateFilteredView('produits');}});
 async function selectPrintPhoto(file){if(!file)return;try{photoDraft=await fileToPhoto(file);const preview=document.getElementById('photo-preview');preview.replaceChildren();const img=document.createElement('img');img.src=photoDraft;img.alt='Aperçu de la photo';preview.appendChild(img);}catch(e){notify(e.message,true);}}
 document.getElementById('print-photo').addEventListener('change',event=>selectPrintPhoto(event.target.files[0]));
 document.getElementById('print-camera').addEventListener('change',event=>{selectPrintPhoto(event.target.files[0]);event.target.value='';});
 document.getElementById('print-camera-button').addEventListener('click',()=>document.getElementById('print-camera').click());
 document.getElementById('excel-upload-file').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';await importExcelFile(file);});
 async function selectProductPhoto(file,id){if(!file||!id)return;try{const data=await fileToPhoto(file);const location=await setPhoto('print:product:'+id,data);await hydratePhotos();notify(location==='cloud'?'✓ Photo sauvegardée dans le cloud et sur cet appareil.':'✓ Photo locale enregistrée. Connecte-toi à Firebase pour la partager.');}catch(e){console.error(e);notify('Photo conservée localement; envoi cloud non confirmé : '+e.message,true);}}
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
   if(el.matches('[data-filter-stock]')){const view=el.dataset.filterStock;uiFilters[view].stock=el.value;updateFilteredView(view);}
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
  exportState(){return {version:3,rolls:structuredClone(rolls),prints:structuredClone(prints),products:structuredClone(extras.products),hardware:structuredClone(extras.hardware),sales:structuredClone(extras.sales)};},
  applyState(snapshot){
   if(!snapshot || !Array.isArray(snapshot.rolls) || !Array.isArray(snapshot.prints) || !Array.isArray(snapshot.products) || !Array.isArray(snapshot.hardware) || !Array.isArray(snapshot.sales)) throw Error('Sauvegarde cloud incomplète');
   if(!snapshot.rolls.every(rollOk)||!snapshot.prints.every(validPrint)) throw Error('Données de bobines ou impressions invalides');
   const oldState=localStorage.getItem(STATE_KEY),oldExtras=localStorage.getItem(EXTRA_KEY);
   try {
    const nextState=JSON.stringify({version:2,rolls:snapshot.rolls,prints:snapshot.prints});
    const nextExtras=JSON.stringify({products:ensureShopIds(snapshot.products),hardware:snapshot.hardware,sales:snapshot.sales});
    localStorage.setItem(STATE_KEY,nextState);localStorage.setItem(EXTRA_KEY,nextExtras);
    if(localStorage.getItem(STATE_KEY)!==nextState || localStorage.getItem(EXTRA_KEY)!==nextExtras)throw Error('Écriture locale non confirmée');
   }catch(e){try{if(oldState===null)localStorage.removeItem(STATE_KEY);else localStorage.setItem(STATE_KEY,oldState);if(oldExtras===null)localStorage.removeItem(EXTRA_KEY);else localStorage.setItem(EXTRA_KEY,oldExtras);}catch(_){}throw e;}
   rolls=snapshot.rolls.map(x=>({...x}));prints=snapshot.prints.map(x=>({...x}));extras={products:ensureShopIds(snapshot.products),hardware:snapshot.hardware,sales:snapshot.sales};
   search='';render();return true;
  },
  closeAllDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
 };
 load();loadExtras();render();
})();
