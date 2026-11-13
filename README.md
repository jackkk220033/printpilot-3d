# JJ3D v4.11.70 — Voir et modifier les factures depuis Clients

- Chaque facture dans Gestion & finances → Clients → Voir la fiche offre deux boutons indépendants.
- 🧾 Voir la facture : ouvre le document de facturation imprimable dans un nouvel onglet.
- ✎ Modifier la facture : ouvre la fenêtre de modification existante, sans quitter Clients.
- Aucun changement aux données, aux factures, aux stocks ni aux règles Firebase.
- Les versions affichées (y compris Boutique) sont synchronisées à v4.11.70.
- Vérifié : syntaxe JavaScript et intégrité ZIP; tester les deux boutons avec les données réelles après publication.


## v4.11.70 — Paiements, clients, boutique, rapports et contrôles
- Registre de paiements **sur les factures existantes** (montant, date, méthode, note), calcul du solde, statut payé automatique seulement une fois soldé. Les anciennes factures déjà payées restent acquittées sans inventer d'ancien versement. L'enregistrement ne touche pas au stock.
- Fiches clients : coordonnées de contact modifiables et notes privées. Le profil est persisté avec le workspace Firebase et inclus dans les sauvegardes complètes. Les factures d'origine restent inchangées.
- Accès rapide à la création d'un bon d'envoi dans Stock Boutique, utilisant **le système de transfert existant**. Le transfert réel est confirmé ensuite dans les bons d'envoi; aucune sortie de stock à la création du brouillon.
- Rapport PDF financier : soldes et encaissements TTC sur factures, unités Boutique et en transit, séparés du chiffre d'affaires enregistré pour éviter les doubles comptages. Dates des factures filtrées par date d'émission et non par date des versements.
- Vérification en lecture seule dans Finances : doublons de numéro de facture, paiements supérieurs au total, IDs de vente répétés et stocks négatifs. Ce contrôle n'est **pas** un audit complet de sécurité des règles Firestore.
- Factures reste à sa place, Kanban identique, Boutique et fichiers du site à la même version.

**Précautions :** sauvegarde JSON avant la mise à jour, teste avec une facture brouillon et un bon d'envoi de test. Ne crée pas de doubles écritures pour les paiements passés. Les paiements partiels sur les factures Boutique confirmées séparément doivent être rapprochés manuellement.
