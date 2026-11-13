/* JJ3D v4.11.53 — Notifications vues et nettoyées automatiquement. */
(()=>{'use strict';
 const prefix='jj3d-notifications-v1:';let owner='',entries=[];
 const byId=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function save(){if(!owner)return;try{localStorage.setItem(prefix+owner,JSON.stringify(entries.slice(0,100)));}catch(e){console.warn('Sauvegarde des notifications:',e);}}
 function setRead(predicate){let changed=false;entries.forEach(x=>{if(!x.read&&predicate(x)){x.read=true;changed=true;}});if(changed){save();render();}}
 function onPageViewed(page){if(page==='atelier-demandes'||page==='commandes-perso')setRead(x=>x.link!=='messages.html');else render();}
 function itemHtml(x){let when='';try{when=new Date(x.at).toLocaleString('fr-CA');}catch(_){}const isMessage=x.link==='messages.html';return `<div class="jj3d-notify-item ${x.read?'':'unread'}" role="listitem"><b>${esc(x.title)}</b><span>${esc(x.message)}</span><time>${esc(when)}</time><a href="${isMessage?'messages.html':'#atelier-demandes'}" data-notif-id="${esc(x.id)}">Voir ${isMessage?'le message':'la demande'}</a></div>`;}
 function render(){const list=byId('jj3d-notify-items'),bell=byId('jj3d-live-bell-count'),button=byId('jj3d-live-bell');const unread=entries.filter(x=>!x.read).length;if(bell)bell.textContent=unread>99?'99+':String(unread);
  document.querySelectorAll('[data-jj3d-notif-count]').forEach(el=>{el.textContent=unread>99?'99+':String(unread);el.hidden=unread===0;});
  if(button)button.classList.toggle('is-alert',unread>0);
  document.title=document.title.replace(/^\(\d+\) /,'');if(unread)document.title='('+unread+') '+document.title;
  const content=entries.length?entries.map(itemHtml).join(''):'<p class="jj3d-notify-none">Aucune notification pour le moment.</p>';
  if(list)list.innerHTML=content;const full=byId('jj3d-notify-page-items');if(full)full.innerHTML=content;
 }
 function connect(uid){owner=String(uid||'');entries=[];if(owner)try{const a=JSON.parse(localStorage.getItem(prefix+owner)||'[]');if(Array.isArray(a))entries=a.filter(x=>x&&typeof x.id==='string').slice(0,100);}catch(_){}render();}
 function notify({id,title,message,link='#atelier-demandes'}){if(!owner||!id||entries.some(x=>x.id===id))return;
  entries.unshift({id:String(id),title:String(title||'JJ3D'),message:String(message||''),link:link==='messages.html'?'messages.html':'#atelier-demandes',at:Date.now(),read:false});entries=entries.slice(0,100);save();render();
  if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){
   const options={body:String(message||''),icon:'icons/icon-192.png',tag:'jj3d-'+String(id).slice(0,70)};
   if(navigator.serviceWorker?.ready)navigator.serviceWorker.ready.then(reg=>reg.showNotification(String(title||'JJ3D'),options)).catch(()=>{try{new Notification(String(title||'JJ3D'),options)}catch(_){}});
   else try{new Notification(String(title||'JJ3D'),options)}catch(_){}
  }
 }
 // Every live Firestore snapshot is authoritative for items that should still trigger alerts.
 // Removed / accepted / read requests are considered handled, so the unread badge clears.
 function syncCollection(name,rows,options={}){
  if(!owner||!['messages','requests','orders','customRequests'].includes(name))return;
  const live=new Set(rows.map(r=>String(r.id)));
  let changed=false;
  entries.forEach(x=>{
   if(x.read||!x.id.startsWith(name+':'))return;
   // Exact record IDs can contain ':'; match the known inserted created/status IDs by prefix.
   let linked=false;
   for(const id of live){if(x.id.startsWith(name+':'+id+':')){linked=true;break;}}
   if(!linked){x.read=true;changed=true;}
  });
  // Visiting an order/demand page counts as viewing its incoming alerts.
  const page=(location.hash||'').replace(/^#/,'');
  if(page==='atelier-demandes'||page==='commandes-perso')entries.forEach(x=>{if(x.link!=='messages.html'&&!x.read){x.read=true;changed=true;}});
  if(changed)save();render();
 }
 window.JJ3DNotifications={connect,notify,render,onPageViewed,syncCollection};
 document.addEventListener('DOMContentLoaded',()=>{
  const bell=byId('jj3d-live-bell'),panel=byId('jj3d-notify-panel');if(!bell||!panel)return;
  bell.addEventListener('click',()=>{const show=panel.hidden;panel.hidden=!show;bell.setAttribute('aria-expanded',String(show));render();});
  byId('jj3d-notify-close')?.addEventListener('click',()=>{panel.hidden=true;bell.setAttribute('aria-expanded','false');});
  function readAll(){setRead(()=>true);}
  byId('jj3d-notify-read')?.addEventListener('click',readAll);
  async function askPermission(){const status=byId('jj3d-notify-status');const pageStatus=document.querySelector('[data-jj3d-permission]');const show=t=>{if(status)status.textContent=t;if(pageStatus)pageStatus.textContent=t;};
   if(!('Notification'in window)){show('Ce navigateur ne prend pas en charge les notifications.');return;}
   if(!isSecureContext){show('Les notifications nécessitent une connexion HTTPS.');return;}
   try{const permission=await Notification.requestPermission();show(permission==='granted'?'✓ Notifications autorisées quand JJ3D est ouvert.':permission==='denied'?'Notifications bloquées dans les paramètres du navigateur.':'Autorisation non accordée.');}catch(err){show('Autorisation impossible : '+err.message);}
  }
  byId('jj3d-notify-enable')?.addEventListener('click',askPermission);
  document.addEventListener('click',e=>{
   if(e.target.closest('[data-jj3d-enable]'))askPermission();
   if(e.target.closest('[data-jj3d-read]'))readAll();
   const a=e.target.closest('[data-notif-id]');if(a){const x=entries.find(x=>x.id===a.dataset.notifId);if(x)setRead(y=>y.id===x.id);panel.hidden=true;bell.setAttribute('aria-expanded','false');}
   if(!panel.hidden&&!panel.contains(e.target)&&!bell.contains(e.target)){panel.hidden=true;bell.setAttribute('aria-expanded','false');}
  });
  window.addEventListener('storage',e=>{if(owner&&e.key===prefix+owner){try{const a=JSON.parse(e.newValue||'[]');if(Array.isArray(a)){entries=a;render();}}catch(_){}}});
  render();
 });
})();
