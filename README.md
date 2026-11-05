# PrintPilot 3D v4.8 — Boutique : fiches agrandies et messages automatiques

Cette version reprend v4.7 et ne modifie aucune donnée d’inventaire.

## Installation

1. Sauvegarde JSON de l’app principale.
2. Remplace sur GitHub TOUS les fichiers correspondants à la même version. En plus des fichiers existants, ajoute `messages.html` et `js/messages.js`. Préserve `js/firebase-config.js` (configuration actuelle du projet).
3. Dans Firebase Console > Firestore Database > Rules, remplace les anciennes règles par le contenu COMPLET de `firestore.rules`, puis Publier. Sans cette étape, l’envoi des notes sera refusé.
4. Sur ton site admin ouvre « Messages Boutique » dans le menu. Si le navigateur demande une connexion, utilise le compte admin. Les messages arrivent automatiquement avec un abonnement temps réel Firestore.
5. Sur `boutique.html?atelier=TON_UID`, le compte Boutique déjà autorisé ouvre une fiche en cliquant une carte, peut écrire une note sur cette fiche ou envoyer un commentaire général, puis cliquer « Enregistrer et envoyer ». Le navigateur envoie directement le message à Firestore sans passer par Synchronisation ni publier de nouveau le catalogue.

## Sécurité

- Le compte Boutique peut uniquement créer de nouveaux messages; il ne peut pas lire les messages existants ou ceux des autres.
- Seul le propriétaire lit les messages et change leur statut lu/non lu.
- L’inventaire, les revenus, les achats et les coûts restent dans `/workspaces/{ownerUid}`, privés au compte propriétaire.
- Le lien Boutique et son identifiant `atelier` restent identiques.
- L’envoi d’email automatique n’est **pas** inclus : un email déclenché par Firebase nécessite une fonction serveur / extension ou un fournisseur tiers. Les nouveaux messages arrivent immédiatement dans « Messages Boutique ».

## Test suggéré

Envoie une note test depuis le compte Boutique; attends « Message envoyé »; ouvre Messages Boutique en admin; elle doit y apparaître. Marque comme lu pour confirmer le droit de mise à jour. Laisse une sauvegarde JSON avant installation.
