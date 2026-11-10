# PrintPilot 3D v4.11.6 — Nouveautés, bobines vides, correction des saisies et suppressions

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
4. Vérifier que l'onglet affiche v4.11.6.
5. Pour activer la chronologie des nouveautés, republier une fois le catalogue dans Synchronisation. Les produits historiques ne deviennent pas nouveaux; les futurs seront affichés 7 jours à partir de leur première publication.

**Aucune règle Firebase à changer.** Ce ZIP ne contient aucune sauvegarde utilisateur et ne modifie pas directement le compte Firebase. Testez sur une nouvelle entrée simple avant production.

## Nouveautés v4.11.5 — Tarif horaire et fenêtres
- Dans Ajouter / Modifier un produit : champ « Tarif d’impression ($/h) » (2 $/h par défaut).
- Montant calculé à partir du nombre d'heures et de minutes déjà saisi. Le coût total estimé et le profit incluent le tarif horaire; le prix de vente reste librement modifiable.
- Tarif sauvegardé **par produit** (`hourlyRate`) et coût du temps sauvegardé (`printTimeCost`); anciennes fiches: 2 $/h suggérés à leur prochaine modification.
- Les boutons X deviennent rouges au survol; cliquer sur l'arrière-plan des dialogues natifs les ferme.
- Attention : une fiche ancienne ne voit pas son coût réécrit tant que vous ne l'avez pas enregistrée à nouveau.
- Déploiement : publier **tout le contenu** de ce dossier; données Firestore conservées.


## Nouveautés v4.11.6 — Gestion des imprimantes

- La section Imprimantes n'affiche plus « À venir » : vraie fiche pour chaque imprimante (3 noms de référence existants + noms utilisés dans les journaux + nouvelles fiches).
- Ajouter et modifier des fiches : modèle, état déclaré, emplacement, volume, matériaux, compteur antérieur, intervalle d'entretien et notes.
- Compteurs calculés depuis les impressions enregistrées et Personnel/Échecs/Tests (minutes, grammes, activités et échecs). Les impressions antérieures importées qui n'ont pas de journal ne sont pas estimées.
- Historique par imprimante et raccourci vers la section Entretien existante. L'entretien est enregistré dans Atelier+ / Firebase et reste distinct du compteur/rappel estimatif.
- Profils enregistrés dans le même stockage que les produits, inclus dans export JSON complet et dans la synchronisation Firebase du gestionnaire principal.
- Aucun accès direct au statut des imprimantes; les états sont manuels et les compteurs issus du suivi PrintPilot seulement.
- Aucun changement de règles Firestore. Avant publication, exporter une sauvegarde JSON.
