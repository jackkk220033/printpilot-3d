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
