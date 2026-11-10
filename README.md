# JJ3D v4.11.24 — Publication Boutique automatique corrigée

Corrige un oubli de branchement dans js/cloud.js : `detectPublishedCatalogue()` était définie, mais jamais appelée au moment de la connexion. Ainsi `cataloguePublishedKnown` restait toujours à false, empêchant toute mise à jour automatique.

Après connexion au compte administrateur, JJ3D vérifie désormais si un catalogue existe déjà. Quand il existe, il programme une publication automatique; ensuite chaque sauvegarde cloud réussie réactualise le catalogue. Le bouton de publication manuelle reste disponible.

Conserver le dossier complet; publier sur GitHub Pages comme avant. Vérifier l’état Firebase et le compte propriétaire. Les photos sont mises à jour seulement si elles ont changé. Aucun changement de règles Firestore demandé.
