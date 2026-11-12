# JJ3D v4.11.28 — Photos dans À imprimer

**Version complète** fondée sur JJ3D v4.11.27, sans retirer le correctif Firebase de publication automatique confirmé fonctionnel.

## Ajouter une impression

- Cliquer dans la zone « Ctrl+V » puis coller une capture copiée du slicer.
- Ou choisir une photo depuis le PC.
- Ou prendre une photo directement depuis un téléphone compatible (« Prendre une photo »).
- Glisser-déposer une image sur la zone est aussi accepté.
- L'aperçu s'affiche avant d'ajouter la tâche. La photo est enregistrée dans Firebase en même temps que la tâche.

## Impression existante / Modifier

Les mêmes options sont proposées. Sur les tâches existantes, l'envoi de l'image se fait dès la sélection/le collage et l'image apparaît dans la Boutique. Sur le formulaire Modifier, les autres changements attendent le bouton Enregistrer.

## Informations importantes

- Pour le collage sur ordinateur, copier une **image** ou une capture d'écran (touche Windows+Maj+S, puis Ctrl+V). Copier uniquement le fichier dans l'Explorateur de fichiers n'est pas toujours interprété comme une image par le navigateur.
- La caméra apparaît selon les capacités du navigateur et de l'appareil; si elle n'est pas disponible, le sélecteur d'images est utilisé.
- Les photos sont compressées et enregistrées dans Firestore (planningPhotos), sous les mêmes règles que les captures existantes. Une connexion Internet est nécessaire à l'enregistrement.
- Maintient le code JS de synchronisation Boutique v4.11.27; pas de changement aux règles Firebase.
- Après installation, rafraîchir la PWA et les onglets avec Ctrl+Shift+R.
