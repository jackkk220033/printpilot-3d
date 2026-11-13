# JJ3D v4.11.64 — Fiches clients et suivi des factures

Version complète fondée sur v4.11.63, avec Kanban, Finances, Boutique, QR, Sauvegardes et Entretien conservés.

## Nouveauté : Outils et statistiques > Clients
- Répertoire des clients calculé automatiquement depuis les commandes personnalisées et factures existantes.
- Recherche par nom, courriel, téléphone ou produit de commande.
- Fiche détaillée : historique des commandes, factures, statut, total factures payées et non payées.
- Export CSV compatible Excel.
- Accès rapide aux sections Commandes personnalisées (soumissions existantes) et Factures.
- Adapté à l'ordinateur et au téléphone, sans grand défilement horizontal.
- Version v4.11.64 synchronisée dans l'Atelier, la Boutique, les titres HTML et les caches PWA.

## Précisions importantes
- Aucune migration Firebase ni réécriture de commandes et factures : la vue Clients est en lecture seule.
- Les clients sont regroupés selon le **nom normalisé** (accents et casse ignorés); deux personnes portant le même nom pourraient être fusionnées visuellement. Leurs données enregistrées ne sont jamais fusionnées.
- Les ventes Excel et ventes directes sans identité client ne sont pas rattachées à un client.
- Les totaux sur la page Clients sont les montants des factures TTC. Les profits et revenus hors taxes restent dans Finances.
- Cette version n'automatise pas encore les devis ni les envois de courriel; les soumissions existantes restent dans Commandes personnalisées.
- Avant publication, exporter une sauvegarde JSON. Tester en situation réelle : seules des vérifications statiques sont possibles ici.
