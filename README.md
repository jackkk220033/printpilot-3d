# JJ3D v4.11.57 — Tableau visuel des commandes

Version complète pour remplacer la version précédente dans le dépôt GitHub Pages, sans modifier les données Firebase.

## Nouveautés
- **Commandes personnalisées** : tableau Kanban sur 8 colonnes correspondant aux statuts déjà existants.
- Glisser-déposer des cartes entre les colonnes sur ordinateur.
- Changement de statut par menu déroulant sur téléphone, clavier ou ordinateur.
- Bascule « Tableau / Liste détaillée », mémorisée dans le navigateur.
- Affichage du client, produit, quantité, échéance, prix, état de facture, accès à Modifier.
- Les anciens formulaires, factures et la liste détaillée sont conservés sans créer de deuxième registre de commandes.
- Une modification de statut utilise `updateCustomOrderStatus` existant, et tente la synchronisation de la file À imprimer.

## Important
- Une carte déplacée **ne valide pas le paiement de la facture**.
- Sauvegarde JSON complète conseillée avant publication; ne supprime aucune donnée Firebase.
- Cette version se concentre sur le Kanban. Finances, impression QR, sauvegardes et entretien feront l'objet de versions suivantes.
- Les notifications push téléphone avec application fermée exigent toujours un service d'envoi serveur ; cette version ne change pas cette limitation.

## v4.11.57 — tableau plus compact
- Colonnes adaptatives qui passent sur plusieurs rangées selon la largeur disponible.
- Défilement vertical normal de la page : plus de longue barre horizontale.
- Glisser-déposer et changement de statut conservés.
- Aucune migration de données Firebase.
