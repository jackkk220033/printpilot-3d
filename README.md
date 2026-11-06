# PrintPilot 3D v4.10.4 — Produits admin et couleurs Noël

## Modifications
- La photo des produits côté admin est cliquable et ouvre la fiche agrandie existante.
- Images admin en `object-fit: contain` pour éviter les recadrages trop serrés.
- Tri par ID stock (par défaut), par catégorie et par nom sur la page Produits.
- Action **Corriger couleurs Noël (#20–22)**, avec confirmation : #20 Bleu, #21 Blanc, #22 Or / Mauve. N’altère ni le stock, ni les ID, ni les ventes, ni le filament.
- Conserve le correctif v4.10.3 pour pouvoir donner des ID différents aux variantes via « Modifier ».

## IMPORTANT — ID et photos en double
Les sets #20–22 et les sapins zigzag #28–30 ont des ID partagés importés d’Excel. Il faut attribuer un ID distinct à chaque fiche via **Modifier**, avec validation des liens d’historique. Les photos liées à un ID partagé resteront identiques tant que vous n’aurez pas réimporté la bonne photo sur chaque variante après correction de l’ID. La v4.10.4 n’essaie pas de deviner quelle photo appartient à quelle couleur.

## Installation
Sauvegarder JSON dans Impressions. Remplacer ensemble `index.html`, `js/app.js`, `css/style.css` sur GitHub. Aucun changement des règles Firebase. Rafraîchir Ctrl+Shift+R.

Cette mise à jour est validée syntaxiquement mais n’a pas été testée sur le compte Firebase réel.
