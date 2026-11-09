/* PrintPilot 3D — corrections des fenêtres (compatible v4.10.7 et suivantes).
   À charger avec <script defer src="js/popup-behavior.js?v=1"></script>.
   Ne modifie pas les données ni les comportements de validation. */
(() => {
  'use strict';

  // Appliquer l'effet rouge aux X, y compris ceux créés dynamiquement.
  const css = document.createElement('style');
  css.textContent = `
    button.close:hover, button.close:focus-visible,
    button.modal-close:hover, button.modal-close:focus-visible,
    button.pp-close:hover, button.pp-close:focus-visible,
    button[aria-label="Fermer"]:hover, button[aria-label="Fermer"]:focus-visible,
    button[aria-label="Fermer la fiche"]:hover,
    button[aria-label="Fermer la fiche"]:focus-visible {
      color: #ff4d5f !important;
      background-color: rgba(255,77,95,.12);
      border-radius: 8px;
      transition: color .15s ease, background-color .15s ease;
    }
  `;
  document.head.appendChild(css);

  // Un clic sur le fond noir (backdrop), mais jamais dans le contenu, ferme le dialogue.
  // Le point de départ ET de fin doit être à l'extérieur : évite la fermeture pendant
  // la sélection de texte ou un glissement depuis le formulaire.
  const startedOutside = new WeakMap();
  const isOutside = (dialog, event) => {
    if (event.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right ||
           event.clientY < r.top || event.clientY > r.bottom;
  };
  document.addEventListener('pointerdown', (event) => {
    const dialog = event.target instanceof HTMLDialogElement ? event.target : null;
    if (dialog?.open) startedOutside.set(dialog, isOutside(dialog, event));
  }, true);
  document.addEventListener('click', (event) => {
    const dialog = event.target instanceof HTMLDialogElement ? event.target : null;
    if (!dialog?.open || !isOutside(dialog, event)) return;
    if (event.detail !== 0 && startedOutside.get(dialog) !== true) return;
    // Respecter toute logique existante de fermeture, par exemple les handlers 'close'.
    dialog.close();
  });
})();
