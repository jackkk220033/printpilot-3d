# JJ3D v4.11.59 — Étiquettes QR, photos Boutique et version uniformisée

Version complète de JJ3D basée sur la v4.11.58. Conserve le Kanban vertical, les finances, les commandes, les factures et Firebase Spark.

## Corrections
- Génération du QR : une seule image visible par étiquette. La librairie QRCodeJS produit un `<canvas>` et un `<img>` ; le CSS ne doit pas afficher les deux.
- La Boutique met à jour la photo dans une fiche déjà ouverte via un QR même lorsque la lecture Firestore prend du temps.
- Versions affichées uniformisées à v4.11.59 (Boutique, Atelier, factures, messages, bon boutique, écran principal) ; paramètres des ressources mis à jour pour contourner les anciens caches.
- Le cache du service worker est versionné v4.11.59.

## À savoir
- Les fiches Boutique demandent toujours une connexion à un compte autorisé : le QR n'expose pas les produits publiquement.
- Si une photo n'existe pas dans Firestore ou si la connexion manque, la fiche affiche toujours « Aucune photo disponible » ; cette mise à jour n'invente pas de photos.
- L'impression de deux **étiquettes distinctes** par rangée sur A4 reste intentionnelle; pour une seule étiquette, garder « Nombre d’étiquettes = 1 ».
- Faites une sauvegarde JSON avant publication. Aucun enregistrement Firestore n'est modifié par cette mise à jour.
- Fichiers JavaScript vérifiés syntaxiquement, mais test réel du scan / photo à faire sur téléphone après déploiement.

