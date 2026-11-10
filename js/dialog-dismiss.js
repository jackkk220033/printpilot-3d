/* PrintPilot 3D — ferme les dialogs natifs par clic sur le fond */
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('click', e=>{
  if(e.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close();
 });
});
