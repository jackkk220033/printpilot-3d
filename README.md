# JJ3D v4.11.25 — Publication Boutique après sauvegarde Firebase

- Après **Enregistrer**, JJ3D enregistre les données privées dans Firebase, puis **attend la fin de cette sauvegarde** avant de publier le même état vers le document `boutiques/{uid}/catalogue/current`.
- La publication des prix/noms/quantités **ne dépend plus de la disponibilité des photos**. Les photos seront diffusées lorsqu’elles deviennent disponibles.
- Un état visible en haut (« Boutique : à jour ✓ », « en attente » ou « erreur ») permet de vérifier le résultat sans ouvrir Synchronisation.
- La publication manuelle reste une solution de secours et la toute première publication reste volontaire.
- Les règles Firestore, comptes, données, factures et fonctionnalités existantes ne sont pas modifiés.

## Test sur GitHub Pages
1. Publier **tout le dossier** et recharger l’application administrateur (Ctrl+Shift+R).
2. Vérifier que la Synchronisation Firebase privée est active. Sinon, elle devra être réactivée manuellement pour des raisons de protection contre les conflits.
3. Modifier le prix d’un produit et cliquer Enregistrer.
4. Attendre l’indicateur « Boutique : à jour ✓ » (la sauvegarde et la publication peuvent prendre quelques secondes).
5. Ouvrir le portail Boutique sur un autre appareil et vérifier ce produit.
6. En cas de « Boutique : erreur », ouvrir Synchronisation pour voir le message; ne pas supposer la publication réussie.

Ne pas modifier les règles Firestore pour cette version.
