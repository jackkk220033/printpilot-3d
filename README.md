# JJ3D v4.11.43 — Demandes Boutique synchronisées et alertes

Site complet, basé sur v4.11.42.

- Supprimer une demande personnalisée non payée depuis **Boutique** ou **Administration**, avec retrait en temps réel dans les deux interfaces. Une facture déjà créée est conservée : la suppression n'efface pas la comptabilité.
- Les demandes payées ne peuvent pas être supprimées depuis le formulaire (protection de l’historique).
- Les deux portails utilisent Firestore `onSnapshot` pour refléter immédiatement les changements de statut et la suppression lorsque l'application est connectée.
- Nouveau badge et alertes visibles dans les deux applications lors de nouvelles demandes ou changements de statut.
- Bouton optionnel d'autorisation des notifications **du navigateur pendant que l'application est ouverte**.
- **IMPORTANT : les notifications push lorsque le téléphone est verrouillé ou lorsque l'app est fermée ne sont PAS encore implémentées.** Elles demandent un serveur de confiance, Firebase Cloud Messaging, un service worker de réception et une gestion des jetons appareils. Les permissions navigateur seules ne suffisent pas.
- Le flux approbation → attente de paiement → paiement déclaré → validation admin utilise toujours le document partagé `customRequests` et ses états existants.

## INSTALLATION OBLIGATOIRE
1. Exporter une sauvegarde JSON de JJ3D.
2. Déployer **tous** les fichiers sur GitHub Pages.
3. Dans Firebase Console → Firestore Database → Rules, publier le fichier `firestore.rules` de cette version. Nécessaire pour permettre à la Boutique de supprimer ses demandes non payées.
4. Recharger les deux applications.
5. Tester une demande fictive, le changement de statut et la suppression sur les deux comptes.

Attention : les interactions réelles avec Firestore ne peuvent pas être testées hors de votre projet Firebase. Les commandes et factures déjà payées doivent rester archivées.
