# JJ3D v4.11.21 — Calendrier d’impression et livraisons Boutique

## À imprimer (administration)
- Ajout/modification des durées **totales prévues** (heures/minutes), imprimante, quantité, priorité, nom, note et début minimal optionnel.
- Estimation du début et de la fin des tâches, calculée en série **par imprimante** dans l’ordre de création. Les imprimantes différentes peuvent fonctionner en parallèle.
- Les tâches sans durée, en pause, ou les tâches précédées d’une durée inconnue n’affichent pas de fin garantie.
- Photos conservées et agrandissement au clic.
- Les heures sont des estimations manuelles, pas une télémétrie en direct.

## Portail Boutique
- Nouvelle section Livraisons : historique, quantités cumulées reçues via bons, déclarations de réception.
- Les membres autorisés peuvent **transmettre** une réception avec quantités réelles; seul l’administrateur confirme le mouvement final dans Factures.
- Les bons sont publiés en copie filtrée et les rapports de réception en collection séparée.
- La réception ne déclenche pas de double déduction automatique.
- Les quantités reçues cumulées ne sont PAS un inventaire temps réel corrigé par les ventes.
- Estimations de fin visibles dans les cartes et les fiches À venir.

## Déploiement requis
Publier les fichiers du ZIP sur GitHub Pages **ET** publier les nouvelles règles `firestore.rules` dans Firebase Console → Firestore Database → Rules. Sans les nouvelles règles, le suivi des livraisons ne pourra pas fonctionner.

Conserver les versions précédentes et exporter une sauvegarde JSON avant de tester les transferts.

## v4.11.21 — Positionnement Modifier dans « À imprimer »
Le formulaire Modifier s’ouvre dans la partie visible de la page intégrée, près de la tâche sélectionnée. Le défilement n’est pas remis en haut. Les formulaires, l’inventaire, le calendrier et Firebase sont inchangés.


## v4.11.21
Champs heures/minutes de À imprimer vides par défaut avec exemples de saisie; durées déjà renseignées conservées en modification.

## v4.11.23 — Tarification horaire correcte
Le tarif d'impression en $/h est un montant facturé, non un coût. Chaque produit peut avoir un tarif distinct. Le simulateur affiche le montant du temps facturé, les coûts réels, un prix suggéré pour couvrir le tarif désiré après la commission Boutique, et le montant restant après coûts et commission. Les produits enregistrés sous l'ancienne logique sont normalisés sans toucher aux ventes historiques. Les prix de vente déjà saisis ne changent pas.

## v4.11.23 — Catalogue Boutique automatique
Après une synchronisation Firebase réussie, les produits, prix et stocks sont publiés dans le catalogue Boutique sans intervention manuelle, pour les ateliers ayant déjà publié au moins une fois. Les photos modifiées sont aussi mises à jour. Si Firebase signale un conflit ou une erreur, la synchronisation n’est pas affirmée comme réussie : le bouton manuel reste accessible.
