# PrintPilot 3D v4.10.6 — ID variantes et photos séparées

Base v4.10.5. Remplacer ensemble `index.html`, `boutique.html`, `js/app.js`, `js/cloud.js`, `js/boutique.js` et `css/style.css` sur GitHub; ou envoyer tous les fichiers du ZIP au bon emplacement.

Avant tout : exporter une sauvegarde JSON depuis PrintPilot.

## Résolution
- Les photos Produit sont stockées par **ID stock #** au lieu de l'ID Excel, y compris dans le catalogue Boutique après publication. Une nouvelle photo pour #75 ne modifie plus #76.
- Fallback : les anciennes photos restent lisibles grâce à leur ancien ID; si elles étaient partagées, les deux fiches peuvent encore montrer la même image tant que tu n'as pas remplacé les photos individuellement.
- Bouton Produits → « Réparer ID variantes » : aperçu et confirmation. Corrige #20–22 (Bleu, Blanc, Or/Mauve), #28–30 (Blanc, Noir, Rouge), #70–71 (Rouge, Rose), #75–76 (Or/Mauve, Or). Ne modifie pas les stocks, ventes, coûts, grammes ni filaments. Refuse de modifier les références utilisées par des historiques.
- Une fois les photos corrigées, Synchronisation → Portail Boutique → Publier / actualiser le catalogue.

Le ZIP n'est pas connecté à ton Firebase réel; vérifier l'aperçu de migration et faire un essai photo avant de publier le catalogue. Aucune modification de règles Firebase nécessaire.
