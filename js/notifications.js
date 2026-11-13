/* JJ3D v4.11.52 — Centre local de notifications, sans toucher aux commandes. */
(()=>{'use strict';
 const prefix='jj3d-notifications-v1:'; let owner='';let entries=[];
 const byId=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function save(){if(!owner)return;try{localStorage.setItem(prefix+owner,JSON.stringify(entries.slice(0,100)));}catch(e){console.warn('Notifications: stockage local indisponible',e);}}
 function render(){const list=byId('jj3d-notify-items'),bell=byId('jj3d-live-bell-count'),button=byId('jj3d-live-bell');if(!list||!button)return;
  const unread=entries.filter(x=>!x.read).length;if(bell)bell.textContent=unread>99?'99+':String(unread);
  button.classList.toggle('is-alert',unread>0);document.title=document.title.replace(/^\(\d+\) /,'');if(unread)document.title='('+unread+') '+document.title;
  list.innerHTML=entries.length?entries.map(x=>`<div class="jj3d-notify-item ${x.read?'':'unread'}" role="listitem"><b>${esc(x.title)}</b><span>${esc(x.message)}</span><time>${esc(new Date(x.at).toLocaleString('fr-CA'))}</time><a href="${x.link==='messages.html'?'messages.html':'#atelier-demandes'}" data-notif-id="${esc(x.id)}">Ouvrir ${x.link==='messages.html'?'les messages':'les demandes Boutique'}</a></div>`).join(''):'<p class="jj3d-notify-none">Aucune notification pour le moment.</p>';
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
 window.JJ3DNotifications={connect,notify};
 document.addEventListener('DOMContentLoaded',()=>{
  const bell=byId('jj3d-live-bell'),panel=byId('jj3d-notify-panel');if(!bell||!panel)return;
  bell.addEventListener('click',()=>{const show=panel.hidden;panel.hidden=!show;bell.setAttribute('aria-expanded',String(show));render();});
  byId('jj3d-notify-close')?.addEventListener('click',()=>{panel.hidden=true;bell.setAttribute('aria-expanded','false')});
  byId('jj3d-notify-read')?.addEventListener('click',()=>{entries.forEach(x=>x.read=true);save();render();});
  byId('jj3d-notify-items')?.addEventListener('click',e=>{const a=e.target.closest('[data-notif-id]');if(!a)return;const item=entries.find(x=>x.id===a.dataset.notifId);if(item){item.read=true;save();render();}panel.hidden=true;bell.setAttribute('aria-expanded','false');});
  byId('jj3d-notify-enable')?.addEventListener('click',async()=>{const status=byId('jj3d-notify-status');if(!('Notification'in window)){status.textContent='Ce navigateur ne prend pas en charge les notifications.';return;}if(!isSecureContext){status.textContent='Les notifications nécessitent un site HTTPS.';return;}try{const permission=await Notification.requestPermission();status.textContent=permission==='granted'?'✓ Autorisation accordée : alertes tant que JJ3D est ouvert sur un appareil.':permission==='denied'?'Notifications bloquées dans les réglages du navigateur.':'Autorisation non accordée.';}catch(err){status.textContent='Autorisation impossible : '+err.message;}});
  document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!bell.contains(e.target)){panel.hidden=true;bell.setAttribute('aria-expanded','false');}});
  render();
 });
})();
