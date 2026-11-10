# JJ3D v4.11.15 — Factures + stock boutique

- Factures clientes imprimables avec estampille diagonale **PAYÉ** lorsque le statut est « Payée ».
- Nouveau **bon d’envoi / transfert de stock boutique** avec logo JJ3D, destination, # stock, ID produit, description et quantité.
- Les deux documents s’impriment via le navigateur et peuvent être enregistrés en PDF.
- Aucun retrait automatique de stock ni création automatique de vente.
- Les bons d’envoi sont sauvegardés avec les autres données JJ3D et inclus dans l’export JSON complet.

## Correctif v4.11.15
- Estampille « PAYÉ » rouge diagonale, affichée à l'écran et sur la facture imprimée si son statut est « Payée ».
- Nouveau cache PWA pour éviter le chargement de la facture précédente.
- Lien de facture avec version explicite pour éviter le cache navigateur.
- Après publication : ouvrir la nouvelle facture depuis le menu Factures et recharger avec Ctrl+F5 si besoin.

## v4.11.15 — Résumé des montants de facture
Le texte compact des totaux du formulaire de facture est remplacé par une carte à lignes séparées (sous-total, rabais, expédition, taxes) et un total violet bien visible. Les mêmes calculs qu'auparavant sont conservés.

## v4.11.16 — Correctifs
- Correction du bon d’envoi bloqué sur « Chargement » (erreur de syntaxe JavaScript dans bon-boutique.html).
- Ajout de **Supprimer** avec confirmation dans les listes Factures et Bons d’envoi.
- La suppression retire seulement le document, sans toucher aux produits, ventes ou stocks.
- Rafraîchir les pages après publication pour mettre à jour le cache de l’application.
