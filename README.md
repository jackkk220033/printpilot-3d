# JJ3D v4.11.58 — Tableau de finances et profits réels

Version complète de JJ3D à publier sur GitHub Pages, issue de v4.11.57. Le tableau Kanban adaptatif et toutes les sections existantes restent inchangés.

## Nouveau dans Finances
- Quatre indicateurs : ventes hors taxes, coûts enregistrés, commissions, profits estimés.
- Sélection de la période mensuelle et du canal. Les ventes historiques sans date restent dans l'ensemble des périodes.
- Graphique des ventes mensuelles, comparaison par canal et top 5 produits, en cartes responsive sans barre horizontale.
- Export CSV des ventes filtrées, en plus de l'export existant des prix.
- Les montants proviennent exclusivement des ventes actives existantes : les brouillons de factures ne deviennent pas du revenu.
- Aucune nouvelle collection Firestore, aucune clé API et aucun service additionnel.

## Comptabilité et prudence
- Les coûts et commissions sont les montants enregistrés au moment de chaque vente, pas une estimation inventée.
- Les factures payées sont réconciliées avec les ventes; vérifier les possibles ventes directes doublonnées, et utiliser l'option de masquage des doublons déjà présente.
- Le profit reste une **estimation de marge enregistrée**, et non le profit net comptable, car certaines charges (électricité, frais non saisis, etc.) ne sont pas suivies.
- Le filtre porte sur les dates des ventes enregistrées. Les anciennes ventes sans date apparaissent dans « Toutes les périodes » et « Sans date ».
- Pas de migration ni de suppression des données. Faire une sauvegarde JSON avant la publication par sécurité.
- Notifications push avec application fermée : pas de changement ni de coût supplémentaire.
