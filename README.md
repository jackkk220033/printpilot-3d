# JJ3D v4.11.52 — Centre de notifications

- Cloche globale dans JJ3D (bureau et téléphone) ouvrant un panneau avec historique, date, liens et compteur de notifications non lues.
- Alerte de nouvelle demande personnalisée, changement de statut de demande, message Boutique non lu, nouvelle commande et demande Boutique, via les écouteurs Firestore existants.
- Les premiers résultats Firestore servent de référence et ne déclenchent pas de notifications rétroactives.
- Boutons « Tout marquer comme lu » et « Activer les alertes du navigateur ».
- Notifications système lorsque l'onglet est ouvert en arrière-plan et que l'autorisation est accordée (Service Worker quand disponible).
- Historique local au navigateur, isolé par UID administrateur et limité à 100 éléments. Ne change aucune commande, facture, stock ni règle Firestore.

## Limite importante
Les notifications push **lorsque le site est complètement fermé** ne sont pas encore activées. Elles nécessitent un backend événementiel Firebase Cloud Functions/FCM, l'enregistrement des appareils et des clés Web Push, plus un déploiement serveur. Ne pas confondre ce centre de notifications avec le push permanent.

## Installation
1. Exporter une sauvegarde JSON de JJ3D.
2. Publier le dossier complet sur Firebase Hosting.
3. Ouvrir JJ3D connecté comme admin, cliquer sur la cloche, autoriser les notifications via le bouton.
4. Faire un essai depuis le compte Boutique pendant que JJ3D est ouvert (sur un autre appareil ou onglet).
