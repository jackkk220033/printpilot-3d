# JJ3D v4.11.45 — Approbation du prix ET du fichier 3D dans la Boutique

Correction du flux de commandes personnalisées :
1. Boutique : envoyer la demande → JJ3D : importer, renseigner le prix sur la facture et le **lien HTTPS du fichier / aperçu** dans Commandes personnalisées.
2. JJ3D, Atelier > Demandes : « Envoyer prix et fichier à valider » publie l’offre.
3. Boutique > Commandes spéciales > Mes demandes : voir facture, prix total, lien de fichier, **Approuver** ou **Demander une modification**.
4. Après approbation seulement, Boutique : déclarer un paiement. JJ3D vérifie le paiement et libère l'impression.
5. La tâche À imprimer demeure verrouillée jusqu’à cette vérification. La référence `Commande JJ-B-...` et l’horaire à préciser sont normaux : il faut saisir la durée de l'impression.

## Installation
- Sauvegarder les données JSON avant mise à jour.
- **IMPORTANT : republier `firestore.rules` dans Firebase Console → Firestore Database → Rules**, sinon les boutons de validation seront refusés par Firebase.
- Mettre en ligne **tout le dossier** sur l'hébergement habituel. Forcer l’actualisation avec Ctrl+Shift+R, ou recharger l'application PWA.
- Le fichier 3D n’est pas téléversé automatiquement : l’administrateur doit fournir un lien HTTPS accessible à la Boutique, par exemple vers une page d’aperçu ou un fichier partagé. Ne partage pas de lien privé.
- L'aperçu de facture côté Boutique reste un résumé; les documents financiers privés et coûts fournisseurs ne sont pas exposés.
- Pas de serveur de test Firebase dans cet environnement : le parcours doit être vérifié avec les deux comptes après déploiement.
