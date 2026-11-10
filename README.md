# JJ3D v4.11.19 — Calendrier d’impression et livraisons Boutique

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
