# PrintPilot 3D v4.11.4 — Nouveautés, bobines vides, correction des saisies et suppressions

Basé sur la v4.11.3 (photos À venir). Aucun changement aux règles Firestore.

## Modifications

- **Boutique / Catalogue** : filtre « Nouveautés (7 jours) » et badge « NOUVEAU » sur les produits publiés pour la première fois dans la semaine. Une première publication avec cette version ne transforme pas tous les produits existants en nouveautés. La première date reste la même aux publications suivantes. Une modification de prix ou de stock ne réinitialise pas la date. Après installation, l'admin doit republier le catalogue dans Synchronisation pour initialiser les dates.
- **Saisie** : plusieurs champs numériques des nouvelles impressions et nouveaux produits utilisent des exemples en gris plutôt que des zéros préremplis. Les modifications d'entrées existantes continuent d'afficher leurs valeurs réelles.
- **Filaments** : bobines à 0 g archivées visuellement sous « Bobines vides » et cachées dans les nouveaux choix de consommation. Elles restent enregistrées dans Firebase et réapprovisionnables par « Modifier ». Une bobine historique vide reste sélectionnable lors de l'édition d'une entrée existante, mais une consommation excédentaire est refusée par la validation de stock.
- **Personnel / Échecs / Tests** : bouton « Supprimer » avec confirmation. Il efface seulement le suivi, sans remettre le filament ni rétablir le stock de vente. Pour annuler une fausse consommation saisie récemment et récupérer le filament, utiliser « Annuler et restituer » existant. Pour une impression reclassée depuis le stock commercial, utiliser « Remettre en production » si le but est de retrouver la vente/stock.

## Installation

1. Exporter une sauvegarde JSON de PrintPilot.
2. Remplacer les fichiers de GitHub par le contenu du ZIP, en respectant les dossiers `css/` et `js/`.
3. Attendre que GitHub Pages termine son déploiement; recharger avec Ctrl+Shift+R.
4. Vérifier que l'onglet affiche v4.11.4.
5. Pour activer la chronologie des nouveautés, republier une fois le catalogue dans Synchronisation. Les produits historiques ne deviennent pas nouveaux; les futurs seront affichés 7 jours à partir de leur première publication.

**Aucune règle Firebase à changer.** Ce ZIP ne contient aucune sauvegarde utilisateur et ne modifie pas directement le compte Firebase. Testez sur une nouvelle entrée simple avant production.
