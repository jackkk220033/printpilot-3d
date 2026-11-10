# JJ3D v4.11.18 — Documents, expédition et transferts

Site et application installable complets, basés sur la dernière version fonctionnelle v4.11.17.

## Nouveautés

1. Transfert de stock par bon d’envoi : sur « Envoyer le stock », JJ3D déduit le stock local une seule fois et le place « En transit ». Les brouillons n’ont aucun effet sur le stock. Les quantités doivent exister et sont validées.
2. Réception Boutique : indique les quantités réellement reçues. Le stock en transit diminue et le stock Boutique augmente du montant reçu. Les différences restent dans « Écarts »; elles ne sont pas automatiquement considérées comme revenues chez nous. Les documents portent un statut Préparé / Envoyé / Reçu.
3. Création d’une facture à partir d’une commande Boutique Firestore : ouvre Factures → Facture depuis une commande Boutique. Nécessite une connexion au cloud administrateur; les prix proviennent du catalogue actuel et doivent être confirmés. Les commandes Boutique sont des demandes de réapprovisionnement de la boutique, pas automatiquement des ventes clients.
4. Date et moyen de paiement : argent comptant, Interac, carte ou autre. Une facture payée conserve son estampille rouge PAYÉ.
5. Bon de livraison client : depuis la liste des factures, génère un document sans prix à joindre au colis.
6. Historique des changements sur factures et bons, conservation des annulations, boutons Supprimer pour les tests. Les bons qui ont modifié le stock ne peuvent être supprimés sans annulation du transfert.
7. Correction de synchronisation : stockSlips et packingSlips sont inclus dans exportState/applyState, et dans l’export et l’import JSON. Lorsqu’un ancien document cloud n’a pas ces champs, la copie locale existante n’est pas effacée automatiquement.

## Important — source Boutique
Le stock Boutique suivi par ces bons d’envoi dans JJ3D (`boutiqueStock`, `inTransitStock`, `stockDiscrepancy`) **n’est pas le même registre que celui géré manuellement dans Atelier+** (`boutiques/{uid}/management/current.stock`). La v4.11.18 ne modifie pas ce registre Atelier+ séparé. Pour une vue cohérente, ne comptabilise pas les mêmes unités dans les deux systèmes sans rapprochement manuel.

## Guide conseillé
- Avant la mise à jour, fais une sauvegarde complète JSON dans l’ancienne version.
- Publie tout le nouveau dossier sur GitHub Pages sans changer ta configuration Firebase.
- Vérifie que JJ3D charge bien tes produits/factures puis reconnecte ou recharge le cloud au besoin.
- Crée un bon test (stock limité), enregistre le brouillon, envoie-le, constate le stock en transit, reçois-le avec une quantité différente, puis teste l’annulation.
- Les anciens bons restent des brouillons jusqu’à ce que tu confirmes un envoi. Aucun ancien bon ne déduit du stock lors de la migration.
- Le PDF est obtenu par Imprimer → Enregistrer en PDF. Le bouton Courriel ouvre un courriel prérempli, la pièce jointe PDF reste manuelle.
- La synchronisation n’est pas un contrôle de stock transactionnel multi-appareils. Évite de confirmer deux mouvements en même temps depuis deux téléphones.

## Tests
Vérification de syntaxe JavaScript et scénarios de logique locale : envoi unique, prévention du double envoi, annulation et restauration du stock. Les tests avec comptes et règles Firebase réels restent à effectuer après publication.

## Amélioration des photos À imprimer
- Les captures de slicer sont affichées entières (`contain`) sans couper le bas, contrairement à l’ancienne présentation.
- Aperçu plus grand (340 px de largeur, 290 px de hauteur sur ordinateur).
- Cliquer sur une photo pour la voir en grand; clic extérieur ou X pour fermer.
- Les images Firebase déjà enregistrées sont réutilisées sans modification.
