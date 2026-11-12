# JJ3D v4.11.47 — Suppression synchronisée des demandes personnalisées

Depuis **Atelier → Demandes**, clique **Supprimer des deux côtés** sur la demande, même si elle est marquée « Payée ». Le même bouton figure dans **Boutique → Mes demandes personnalisées**. La suppression du document partagé Firestore retire la demande des deux affichages. Les tâches d’impression associées sont aussi retirées de la file de l’Atelier par synchronisation.

⚠️ Une demande réellement payée ne devrait pas être supprimée par erreur. Une confirmation spécifique apparaît. Les factures, paiements et rapports comptables déjà créés **ne sont pas effacés**.

**Installation :** publier tous les fichiers et mettre à jour `firestore.rules` dans Firebase Console. Recharger l’application installée au besoin.

**Notifications mobiles :** cette version ne crée pas de service Firebase Cloud Messaging. Les notifications push en arrière-plan ne sont pas encore prises en charge.
