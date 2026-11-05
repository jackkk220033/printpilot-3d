# PrintPilot 3D v4.9 — Atelier +

Cette version est basée sur la v4.8.1 qui fonctionnait, avec un module supplémentaire `atelier-plus.html` et deux formulaires de demande dans `boutique.html`.

## Installation

1. Exporte une **sauvegarde JSON** de PrintPilot avant tout changement.
2. Sauvegarde tes règles Firestore actuelles dans un fichier texte.
3. Remplace ensemble **tous les fichiers** du site GitHub par ceux du dossier de cette version (en conservant les chemins, notamment `js/` et `css/`). Ne supprime pas tes anciens fichiers inutilisés sauf si tu sais ce que tu fais.
4. Dans Firebase Console > Firestore Database > Rules, remplace **la totalité** des règles par le fichier `firestore.rules` de cette archive et clique **Publier**. Ce fichier préserve les règles v4.8.1 (messages/badges/photos), et ajoute les demandes Boutique et le document privé Atelier +.
5. Attend le déploiement GitHub Pages, puis actualise le site (Ctrl + Shift + R). L'onglet doit afficher v4.9.
6. Dans le menu PrintPilot, ouvre **Atelier + (8 outils)**. Utilise le compte Firebase ADMIN.
7. Côté Boutique, ouvre **le même lien boutique.html?atelier=... que d'habitude** avec le compte Boutique autorisé; le formulaire de demande est situé sous le catalogue. Aucune synchronisation manuelle n'est requise pour envoyer une demande.

## Modules disponibles

1. **Stock Boutique** : quantités détenues chez la boutique, à saisir et à corriger par l'administrateur. Ce suivi est distinct du stock commercial principal.
2. **Demandes Boutique** : vente ou réapprovisionnement envoyés automatiquement. L'administrateur peut accepter/refuser. Une vente acceptée décrémente le *suivi boutique*, non le stock commercial principal. Une demande de réapprovisionnement acceptée crée une tâche « À imprimer ».
3. **À imprimer** : planning avec quantités, priorité, quatre statuts.
4. **Prévisions** : calcul des besoins en filament et en composants à partir des fiches produits et des bobines disponibles; lecture seule.
5. **Étiquettes QR** : impression avec ID, nom, prix, lien vers le produit dans le portail Boutique (connexion requise). La génération QR nécessite le chargement de `qrcodejs` par CDN.
6. **Statistiques** : résumé de l'inventaire et graphique comparatif de valeur par catégorie; évite d'ajouter artificiellement les ventes boutique aux ventes historiques.
7. **Entretien** : journal des entretiens des imprimantes, avec date, compteur d'heures et notes.
8. **Rapports** : montant des ventes boutique approuvées, commissions 30 %, montant net 70 %, export CSV, impression PDF via le navigateur.

## Différences importantes / limitations

- **Aucune écriture automatique dans les stocks/ventes de l'application principale** lors d'une vente déclarée ou d'une saisie de consignation. Le suivi Atelier + est volontairement séparé pour ne pas altérer les stocks corrigés de la v4.8.1. Reporte les ventes approuvées dans ton flux commercial habituel une seule fois; ne double-compte pas les revenus entre les deux pages.
- Le catalogue Boutique affiche les quantités de la **dernière publication** depuis Synchronisation. Il ne sera pas instantanément modifié par une demande de vente : une demande n'est pas encore une vente confirmée.
- Les membres Boutique **ne peuvent pas lire** les demandes des autres comptes, les rapports, les bobines ou les données privées.
- Les listes de gestion sont conservées dans un document Firestore distinct : `boutiques/{ownerUid}/management/current`. Un grand historique devrait à terme être déplacé dans des documents séparés afin de respecter la limite Firestore de 1 Mio/document.
- L'approbation d'une vente utilise une transaction Firestore pour protéger le suivi Boutique et empêche les doublons sur la même demande. Si une approbation échoue partiellement, vérifier la ligne de rapport avant de réessayer.
- L'envoi par courriel des demandes n'est **pas** intégré (notifications uniquement dans PrintPilot quand il est ouvert).
- Le graphique présente la valeur du stock par catégorie, pas encore des tendances historiques mensuelles puisque la v4.8.1 ne stocke pas d'historique temporel complet.

## Contrôles recommandés

- Se connecter au compte Boutique et soumettre une demande **réapprovisionnement** de 1 unité. Elle doit s'afficher automatiquement dans Atelier + > Demandes.
- Accepter la demande; vérifier qu'elle crée une tâche dans « À imprimer » et ne touche pas à l'inventaire principal.
- Pour une vente, configurer d'abord un nombre réellement présent dans le **Stock Boutique**, puis envoyer une vente et l'accepter. Vérifier les rapports.
- Vérifier que les messages, badge rouge, photos, impression ratée du dragon et stocks actuels sont inchangés.

## Versions / cache

Les titres des onglets, les références JS/CSS et la version affichée ont été actualisés en v4.9.
