# JJ3D v4.11.27 — Correction de l’auto-publication à la connexion Firebase

## Cause identifiée dans v4.11.26

La fonction `resetCloud()` était appelée lors de chaque événement `onAuthStateChanged()` et remettait `window.JJ3DAutoPublishCatalogue` et `window.JJ3DPublishCatalogueAfterSave` à `null`.

Ces fonctions étaient pourtant enregistrées une seule fois au chargement de `cloud.js`. Elles étaient donc effacées lors de la connexion Firebase et jamais réinstallées. Le badge pouvait annoncer « publication automatique active », alors que les événements `printpilot:changed` n'avaient plus de callback à appeler. Cela explique pourquoi les prix restaient différents entre la page Produits et la Boutique malgré les actualisations.

## Correction

- Ne plus effacer les callbacks permanents durant la réinitialisation de session.
- La déconnexion ne publie pas : les callbacks vérifient déjà `currentUser` avant chaque requête.
- La publication est lancée dès l'événement de sauvegarde locale `printpilot:changed`, sans ouvrir Synchronisation.
- Elle reste sérialisée en cas d'enregistrements rapprochés ; un échec est signalé dans le badge Boutique.
- Aucune action manuelle de publication initiale n'est requise si Firebase est connecté et les règles autorisent le compte administrateur à écrire son catalogue.

## Vérification recommandée

Après publication GitHub Pages et recharge forcée (`Ctrl + Shift + R`), changer le prix d'une variante, cliquer Enregistrer, vérifier la transition du badge « publication automatique prévue » → « Boutique : à jour ✓ » et comparer côté Boutique. Ne pas cliquer sur la publication manuelle pendant le test. Si erreur : copier le message exact du badge.

Les fichiers JS ont été vérifiés statiquement. Impossible de valider une écriture réelle sur la base Firebase privée depuis cet environnement.
