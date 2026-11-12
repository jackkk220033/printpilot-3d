# JJ3D v4.11.38 — Ergonomie et ventes liées aux factures

## Nouveautés

- Commandes personnalisées en fiches compactes avec détails repliables, photos, infos, acompte, facture et actions.
- « À imprimer » : cartes compactes, photo miniature cliquable, contrôle de statut regroupé dans Actions. Le collage/import photo reste dans Modifier.
- Champ « Date et heure de début souhaitées » clarifié.
- Finances : tableau sur grands écrans, fiches de ventes compactes sur écrans plus petits.
- Navigation : À imprimer et Factures directement en Espace de travail; Impressions, Imprimantes et Ventes dans Outils & statistiques.
- Factures PAYÉES : création automatique d’un enregistrement de vente liée **sans retirer de stock**. Édition répétée de la facture ne crée pas de vente en double. Une facture annulée/non payée n’est pas comptée dans les ventes actives.
- Les factures brouillons ne sont pas des ventes et les acomptes ne sont pas comptés comme revenus distincts.
- Le coût des ventes issues de factures est estimé uniquement si les lignes sont reliées à un produit de stock identifié ; vérifier les profits si la facture contient des lignes libres.
- Les taxes facturées ne sont pas incluses dans le revenu brut des ventes automatiques.

## Mise à jour
1. Exporter une sauvegarde JSON depuis la version précédente.
2. Publier le contenu de ce dossier sur GitHub Pages.
3. Recharger les deux interfaces. Aucune modification des règles Firebase n’est nécessaire pour ces changements.
4. Tester une commande puis une facture brouillon, payée, modifiée et annulée. Vérifier qu’une seule entrée de vente automatique s’affiche et que le stock ne change pas.

La publication automatique de la Boutique et le filigrane PAYÉ de la facture mobile viennent de la base v4.11.38. Les changements de vente sont des écritures de données privées synchronisées par le système existant ; tester sur les comptes Firebase réels.
