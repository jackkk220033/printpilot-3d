# JJ3D v4.11.51 — Photo directe dans les demandes Boutique

## Nouveauté
- Dans Boutique → Commandes spéciales → Nouvelle demande personnalisée, **Prendre une photo** ouvre la caméra du téléphone compatible (caméra arrière privilégiée); **Choisir une photo** ouvre les images existantes.
- Aperçu instantané et option Retirer; une seule photo par demande. La photo est compressée puis envoyée dans le champ `photo` **existant** de `boutiques/{owner}/customRequests`. JJ3D lira donc la photo comme avant.
- La caméra dépend du navigateur et du système du téléphone; certains navigateurs peuvent afficher un choix caméra/galerie à la place. Sur ordinateur, elle peut ouvrir le sélecteur de fichiers.
- Le formulaire ne crée aucune commande ni facture en cas d'échec de l'envoi photo.

## Installation
1. Sauvegarder/exporter les données JSON avant toute mise à jour.
2. Publier le dossier complet sur Firebase Hosting; rafraîchir Boutique sur le téléphone.
3. Tester avec une **nouvelle demande test**, vérifier la photo côté Boutique et JJ3D, puis supprimer ce test seulement une fois confirmé.

Aucun changement aux règles Firestore n'est nécessaire pour cette fonctionnalité. Le parcours complet Firebase doit être validé sur vos comptes réels.
