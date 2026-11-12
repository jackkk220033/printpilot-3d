# JJ3D v4.11.44 — suivi Boutique / facture / À imprimer

- Les fiches de demandes Boutique affichent le résumé de facture partagé (prix, lignes, statut, référence), sans les données comptables privées.
- Lorsqu’une commande provenant de la Boutique est enregistrée dans l’administration, les données de facture partageables sont envoyées dans `customRequests` sur Firebase.
- À l’arrivée d’une demande, le compte administrateur connecté crée une tâche de préproduction `🔒 En attente de validation` dans À imprimer ; elle est liée par ID et son démarrage est bloqué jusqu’au paiement confirmé. L’automatisation nécessite qu’au moins un espace administrateur soit ouvert/connecté. Si l’administration est fermée, la demande est conservée dans Firestore et la tâche sera créée lors de la prochaine connexion.
- Lorsque la commande est importée, l’ancienne tâche de demande est réutilisée plutôt que dupliquée ; la validation du paiement libère la tâche.
- Le formulaire Boutique et les notifications dans le navigateur restent disponibles. Les notifications push téléphone quand JJ3D est fermé requièrent encore Firebase Cloud Messaging et un service d’envoi serveur : elles ne sont PAS installées dans cette version.
- IMPORTANT : publier `firestore.rules` dans Firebase Console > Firestore Database > Rules pour les nouveaux champs de résumé de facture.
- Sauvegarder les données JSON avant mise à jour. Après publication GitHub Pages, faire Ctrl+Shift+R.
- Les factures originales privées ne sont pas directement exposées ; l'aperçu Boutique n'est pas le PDF juridique complet.
