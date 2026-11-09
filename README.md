# PrintPilot 3D v4.11 — Commandes Boutique, À venir et statistiques

Basé sur la v4.10.7 stable, avec restauration des photos et ID indépendants.

## Nouveautés

- **Boutique → Commander** : sélectionne jusqu’à 25 types de produits, une quantité par produit, envoie la commande en **une seule opération Firestore**. Pas besoin de synchroniser.
- **Admin → Demandes Boutique** : commandes groupées, acceptation et création de tâches d’impression, refus ou suppression. Ni stock ni vente automatiquement modifiés.
- **Admin → À imprimer** : nouveau projet sans fiche Produit possible, 4 statuts (En attente / En impression / En pause / Terminé), plus Échec facultatif, photo du slicer par tâche, note visible.
- **Boutique → À venir** : aperçu en direct des projets et de leurs captures JPEG. Aucun accès au document de gestion privé ni aux finances.
- **Dashboard** : valeur du stock invendu, valeur théorique de toute la production et revenus des ventes explicitement séparés.

## Installation

1. Exporte une sauvegarde JSON actuelle de PrintPilot.
2. Sur GitHub, remplace les fichiers du site par le contenu du ZIP **en gardant les chemins css/ et js/**.
3. Dans Firebase Console → Firestore Database → Rules, remplace les règles actuelles par **l’intégralité** du `firestore.rules` inclus et publie. Le fichier conserve les permissions existantes pour les messages, ventes et photos.
4. Recharge le site après le déploiement, vérifie le titre **v4.11**. Le lien Boutique (atelier=...) reste le même.
5. Teste avec une petite commande fictive et une tâche d’impression, puis supprime le test. La boutique ne doit jamais voir les finances.

## Sécurité et précisions

- L’accès aux commandes et au planning est limité aux comptes explicitement autorisés.
- Une commande n’est **pas** une vente. Elle n’ajuste ni le filament ni l’inventaire. Une commande acceptée crée uniquement des tâches planifiées.
- La capture JPEG est compressée côté navigateur et sauvegardée dans `planningPhotos`, collection Boutique autorisée en lecture. **N’ajoute aucune information sensible dans tes captures.**
- Le suivi Boutique en temps réel se met à jour lorsqu’une tâche est ajoutée, modifiée ou supprimée; les anciennes tâches déjà en place sont publiées lors de leur prochaine modification.
- « Valeur théorique de toute la production » est calculée à partir des quantités fabriquées et des **prix de vente actuels**, pas des prix historiques. Les revenus enregistrés restent indépendants.
- La section Atelier + reste intégrée dans l’interface principale. Les nouvelles commandes sont affichées dans l’onglet Demandes Boutique existant.

Vérifications : syntaxe JavaScript par `node --check`, intégrité de l’archive ZIP. **La connexion Firebase de production et la navigation réelle restent à tester après déploiement.**
