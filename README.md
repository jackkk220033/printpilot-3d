# JJ3D v4.11.61 — Catalogue QR PDF automatique

Version complète à publier (ZIP avec toutes les pages, images, scripts et fichiers Firebase existants) basée sur v4.11.60.

**Nouveau :** Atelier → Étiquettes QR → « Télécharger le catalogue QR — PDF ».
JJ3D lit la liste de produits/variantes courants de Firestore et produit directement dans le navigateur un PDF A4 avec une couverture d’instructions puis **4 fiches QR par page**, incluant nom, ID et prix. Lorsqu’un nouveau produit est créé, il sera inclus lors du prochain téléchargement. Pas de mise à jour manuelle du document.

Le téléchargement PNG individuel et ZIP des PNG reste identique. Les QR ouvrent la fiche Boutique (compte autorisé requis) où la personne peut laisser un message « Vendu ». Les QR ne déclenchent **pas** automatiquement une vente ni une modification de stock ; c’est le fonctionnement actuel de la messagerie Boutique.

Bibliothèque de création PDF : jsPDF 2.5.2 via CDN ; la connexion Internet est nécessaire pour charger la bibliothèque ainsi que QRCodeJS. Aucune donnée n’est envoyée au CDN lors de la génération du PDF. Les numéros de version Atelier/Boutique/Factures/Messages ont été harmonisés à v4.11.61. Le Kanban et les finances existants sont conservés.

Avant publication, sauvegarder le JSON JJ3D. Syntaxe JS vérifiée ; le téléchargement et les QR doivent être testés avec votre navigateur et vos données Firebase.
