# PrintPilot 3D v3.7 — Une seule saisie

## Nouveau parcours
- Impressions → Ajouter une impression terminée → « Nouveau produit » (choisi par défaut).
- Nom, prix, commission, catégorie, temps heures/minutes, bobines et grammes, photo.
- Enregistrer crée ENSEMBLE le produit et l’impression, déduit les bobines, augmente le stock des produits, associe la photo à l’impression et au catalogue.
- Produit existant → l’impression augmente le stock du produit et déduit les bobines.
- Une impression libre déjà enregistrée → bouton « Créer la fiche Produit » ; recopier les matériaux et la durée ; ajouter seulement le prix, sans seconde déduction.
- Modification / annulation : les quantités du stock de produits sont ajustées avec le stock des bobines. Les annulations sont refusées si des unités ont déjà été vendues.
- La section Produits permet toujours de modifier la fiche commerciale sans consommer du filament.

## Installation
1. Exporter une sauvegarde JSON depuis ton PrintPilot actuel et garder l’ancien dossier.
2. Sur GitHub, remplacer index.html, js/app.js et css/style.css dans la branche main, à la racine. NE PAS téléverser un ZIP dans Releases pour actualiser GitHub Pages.
3. Vérifier la coche verte de GitHub Pages Actions. Rafraîchir la page.
4. Se reconnecter à ☁ Synchronisation si nécessaire, et vérifier le statut « Synchronisé ».
5. Tester une impression fictive de 5 g puis annuler; vérifier les deux stocks et le catalogue.

Aucune modification des règles Firestore ni de firebase-config.js. Les données privées restent dans Firestore. Photos enregistrées séparément dans Firestore si connecté.


## v3.8 — Menus déroulants
Dans « Impressions → Nouveau produit » et « Produits → Ajouter/Modifier », les champs Catégorie, Couleurs et Imprimante sont maintenant des menus déroulants. Ils reprennent les catégories, les couleurs et les imprimantes de tes données déjà importées, plus des choix courants. « Autre… » permet de créer une nouvelle valeur; elle sera proposée lors des prochaines créations après sauvegarde. Les anciennes valeurs restent utilisables à l'édition. Aucun changement aux règles Firebase ni au stockage, stocks et calculs.


## v3.9 — Clickers et autres composants hardware
- Le formulaire de création de produit inclut une section « Hardware / composants par unité » (par exemple un clicker bleu ou rouge).
- Dans Impressions → Nouveau produit (saisie unique), la section Hardware permet de sélectionner des composants et leurs quantités totales pour le lot.
- Le coût des composants est ajouté au coût de fabrication et au profit estimé.
- Le stock hardware n'est pas déduit quand on crée seulement une fiche Produit; il est déduit lorsqu'on enregistre une vraie impression.
- Lors d'une modification ou d'une annulation, l'application restitue les pièces de l'ancienne impression et applique les nouvelles quantités.
- Pour une fiche Produit existante, la quantité de hardware est proposée automatiquement selon le nombre d'unités imprimées.
- Avant publication, exporte une sauvegarde JSON et teste sur une impression fictive.


## v4.0 — Fiches détaillées dans le catalogue

- Les cartes montrent la photo puis le nom, le prix, l'ID stock et le stock (aucun texte superposé).
- Cliquer une carte ouvre une fiche modale avec la grande photo au-dessus et les données en dessous : prix, quantité, ID stock, ID Excel, catégorie et couleurs.
- Les boutons Choisir une photo et Prendre une photo sont dans la fiche. Fermer avec × ou Échap.
- Aucun changement au calcul des stocks, aux données Firestore, ni aux règles de sécurité.
- Sur GitHub, publier les fichiers à la RACINE de main, puis vérifier GitHub Pages.
