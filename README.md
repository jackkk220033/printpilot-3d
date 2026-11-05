# PrintPilot 3D v4.5.1 — correction inventaire

## Correction
L’importateur réconcilie maintenant les champs visés (`printed`, `stock`, `price`, `timeDays`) avec une comparaison à trois voies :
- si la valeur actuelle correspond au point de départ, elle est corrigée;
- si elle correspond déjà à la valeur finale, elle est préservée;
- si elle est différente des deux, la correction est refusée sans modifier les données.

La fusion conserve les autres propriétés des produits ainsi que les nouvelles fiches qui auraient été créées; elle ne touche pas aux bobines, à l’historique des impressions, aux ventes, au hardware ou aux photos.

## Installation
1. Exporte une sauvegarde JSON complète depuis Impressions.
2. Remplace `index.html`, `js/app.js` et `css/style.css` ensemble sur GitHub Pages (les fichiers Firebase restent ceux du site).
3. Recharge le navigateur après le déploiement.
4. Dans Impressions → Appliquer correction d’inventaire, choisis `correction-inventaire.json`, vérifie l’aperçu et confirme.
5. Attends la synchronisation et vérifie les totaux.

Aucune déduction de filament n’est effectuée. Ne pas utiliser « Importer Excel » pour cette correction.
