# PrintPilot 3D — v4.6.3

## Correction

Le formulaire « Déplacer un produit déjà comptabilisé » n’ouvrait pas la confirmation. Son écouteur est attaché à `document` pour fonctionner après un re-rendu de la page, mais `moveProductOff()` lisait `event.currentTarget` (`document`) au lieu de `event.target` (le formulaire). L’erreur JavaScript empêchait toute action. La v4.6.3 corrige cette référence sans changer les données existantes.

## Installation

1. Faire une sauvegarde JSON complète avant toute opération.
2. Dans GitHub remplacer ensemble `index.html`, `js/app.js` et `css/style.css` (ou tous les fichiers du ZIP).
3. Actualiser, vérifier l’onglet `PrintPilot 3D v4.6.3`.
4. Sous Personnel / Échecs / Tests, sélectionner le dragon, quantité 1, « Impression ratée », puis cliquer une seule fois. Une confirmation devrait apparaître avant tout changement.
5. Vérifier le nouveau registre hors production et le retrait du dragon du stock à vendre. Aucune nouvelle déduction de bobine lors du reclassement historique.

Les anciennes sauvegardes ne sont pas automatiquement importées par cette mise à jour.


## v4.6.3
- Le bouton Déplacer hors du stock à vendre déclenche maintenant un clic explicite, au lieu de dépendre de la soumission HTML du formulaire.
- Messages de validation sous le bouton et capture des erreurs JavaScript.
- Ne déduit pas de filament historique lors du reclassement.
- Tester d’abord sur une sauvegarde et vérifier le stock / historique.
