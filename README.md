# PrintPilot 3D v4.10.7 — Photos admin restaurées

**Correctif ciblé de la v4.10.6.** Bug corrigé dans `js/app.js` : `hydratePhotos()` recherchait uniquement `[data-photo-id]`, alors que les fiches produits utilisent maintenant `[data-photo-shop]`. Il n'affichait plus les images des produits, même quand elles étaient encore dans Firebase ou IndexedDB.

**Installer :** remplacer seulement `index.html` et `js/app.js` dans GitHub (mêmes chemins). Les autres fichiers du ZIP sont repris de v4.10.6 et ne doivent pas être remplacés pour ce correctif. Faire une sauvegarde JSON avant toute mise à jour. Après déploiement vert, recharger en forçant le cache (`Ctrl+Shift+R`).

**Aucune modification Firestore, des règles Firebase ou du stock.** Le correctif restaure le chargement des images selon leurs clés uniques (`product-shop`) avec repli sur leurs anciennes clés d'ID Excel. Une image remplacée précédemment reste enregistrée, sans récupération automatique de la photo qu'elle aurait écrasée.

Test statique JavaScript: OK. La connexion au compte Firebase en production n'a pas été testée.
