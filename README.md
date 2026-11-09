# PrintPilot 3D v4.11.3 — Photos « À venir »

Deux corrections ciblées sur la présentation, sans changer le stockage Firebase, les commandes ni les statuts.

- **Boutique / À venir** : photo limitée à 240 px de haut (195 px sur téléphone), détails placés en dessous, barre de défilement visuellement masquée si un texte exceptionnellement long dépasse. Même fenêtre de fiche que Catalogue.
- **Admin / À imprimer** : miniature de capture plus grande et cadrée vers le bas de la capture (là où apparaît généralement l'objet). La photo originale est intacte et reste complète côté Boutique.

## Sur GitHub, remplacer uniquement ces 4 fichiers :
- `boutique.html`
- `css/boutique.css`
- `atelier-plus.html`
- `css/atelier-plus.css`

Les deux fichiers JavaScript inchangés sont fournis comme références, pas besoin de les uploader. Rien à changer dans Firestore. Recharger le site après le déploiement.
