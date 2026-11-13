# JJ3D v4.11.53 — Notifications corrigées

- Section Notifications dans le menu PC et téléphone.
- Les alertes de demandes et commandes sont marquées lues en ouvrant « Demandes Boutique » ou « Commandes personnalisées ».
- Les notifications liées à des demandes supprimées / qui ne sont plus en attente sont automatiquement marquées lues à la prochaine synchronisation Firestore.
- Badge corrigé : la synchronisation des tickets Boutique ne remplace plus le nombre de notifications non lues.
- En cliquant une notification, elle est marquée lue, avec compteur mis à jour.
- Bouton « Tout marquer comme lu ».
- Synchronisation de l'état lu entre onglets du même navigateur.

**Limitation :** le statut lu est conservé dans le navigateur utilisé (localStorage), pas encore globalement sur tous les téléphones/ordinateurs. Les notifications push avec l'application fermée ne sont pas encore configurées : elles nécessitent Firebase Cloud Messaging et un serveur d'envoi.

## Installation
1. Sauvegarde JSON avant publication.
2. Remplacer les fichiers de GitHub Pages par ceux du ZIP.
3. Actualiser avec Ctrl+F5 sur PC et rouvrir la PWA sur téléphone.
4. Ouvrir « Notifications » dans le menu et tester avec une nouvelle demande Boutique.
