/* PrintPilot 3D — installation facultative */
(function(){
  'use strict';
  let deferredPrompt = null;
  const toast = (msg) => {
    const t = document.getElementById('pwa-install-help');
    if(t){ t.textContent = msg; t.hidden = false; }
    else alert(msg);
  };
  function showInstall() {
    const button=document.getElementById('pwa-install');
    if(!button) return;
    const standalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
    button.hidden=standalone;
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    showInstall();
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;showInstall();});
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('pwa-install');
    if(button){
      button.addEventListener('click',async()=>{
        if(deferredPrompt){
          const prompt=deferredPrompt;
          deferredPrompt=null;
          try {await prompt.prompt();await prompt.userChoice;}
          catch(e){console.warn('Installation non disponible',e);}
          showInstall();
        }else{
          const ios=/iPad|iPhone|iPod/i.test(navigator.userAgent);
          toast(ios
            ? 'Sur iPhone ou iPad : ouvre le site dans Safari, touche Partager, puis « Sur l’écran d’accueil » et « Ajouter ».'
            : 'Sur Android : ouvre le menu ⋮ du navigateur et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Sur ordinateur : utilise l’icône Installer dans la barre d’adresse.');
        }
      });
    }
    showInstall();
  });
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Mode application indisponible :',e));
    });
  }
})();
