# JJ3D v4.11.26 — Boutique automatiquement mise à jour après Enregistrer

La publication Boutique ne dépend plus de l’état « modifications privées Firebase en attente ».

- Chaque sauvegarde locale déclenche la publication des produits vers le catalogue Boutique, avec un court regroupement de 650 ms.
- Les nouvelles fiches produit, leurs prix et leurs quantités sont publiées automatiquement même pendant une sauvegarde privée Firestore.
- Si une deuxième modification survient pendant la publication, elle sera publiée juste après.
- Les photos enregistrées dans le cloud déclenchent une actualisation des photos Boutique.
- La publication attend une authentification administrateur Firebase, mais ne requiert pas l'ouverture du panneau Synchronisation.
- Une erreur est affichée directement dans le badge Boutique ; le bouton manuel reste disponible en secours.
- Attention : les données privées /workspaces ont leur propre synchronisation et leurs propres éventuels conflits. La mise à jour Boutique ne résout pas un conflit privé.

Pour tester : connecter le compte administrateur, créer/modifier un produit, cliquer sur Enregistrer, puis observer « Boutique : à jour ✓ » et ouvrir boutique.html. Si le badge affiche une erreur, vérifier les autorisations Firestore.
