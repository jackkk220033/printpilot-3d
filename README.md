# JJ3D v4.11.66 — Boutique, ventes, soumissions et rapports

## Nouveautés

1. **Vente rapide par QR** dans la fiche produit Boutique : après scan et connexion, quantité, note et bouton « Déclarer vendu ». Cela crée une **demande** Firebase et ne déduit rien avant approbation administrateur. Les demandes approuvées utilisent la transaction existante, idempotente par ID de demande, pour éviter les doublons.
2. **Soumission PDF** depuis les commandes personnalisées (tableau Kanban et liste détaillée). Générée localement, sans changer le statut d’une facture ni créer de vente. La soumission présente un total estimé hors taxes, distinct de la facture.
3. **Rapport des ventes PDF** depuis Finances : utilise les filtres de mois et de canal déjà présents et exclut les ventes annulées, doublons masqués et factures non payées.
4. **Rapports Boutique** : filtre par mois, export CSV du mois sélectionné et PDF de consignation (ventes approuvées, commission 30 %, revenu 70 %). Le rapport Boutique reste dans la section Boutique du menu.
5. **Versions synchronisées** dans l'atelier, la Boutique, les pages et les chemins d'assets.

## À savoir

- Les ventes de la Boutique validées dans **Atelier → Demandes Boutique** décrémentent **le stock Boutique**, pas le stock principal. Ne pas les re-saisir manuellement dans Ventes : le journal Boutique et le journal privé sont deux sources différentes, la validation ne crée pas de deuxième vente privée.
- Les devis sont informatifs; ils ne créent ni paiement ni facture.
- Les PDF sont générés par jsPDF chargé depuis CDN. Connexion Internet nécessaire lors du premier chargement.
- La synchronisation Firebase et les règles de sécurité ne changent pas.
- Vérifier avec un compte Boutique et un compte Atelier avant usage réel. Aucune opération de vente en direct n'a été exécutée pour ces tests.
- Sauvegarder les données JSON avant de publier cette version.

# JJ3D v4.11.66 — Nouvelle section Gestion & finances

- Nouvelle catégorie **💼 Gestion & finances** dans les menus ordinateur et téléphone.
- Pages déplacées : Finances, Clients et Ventes, avec leurs liens et leurs données inchangés.
- **Factures** demeure un raccourci principal au même endroit.
- **Rapports Boutique** demeure dans Boutique.
- Outils & statistiques conserve Sauvegardes, Impressions, Imprimantes, Prévisions filament, Étiquettes QR, Statistiques atelier et Entretien.
- Tous les titres HTML, scripts, caches et Boutique à jour en v4.11.66.
- Aucun changement aux données ni aux règles Firebase.

Sauvegarde JSON conseillée avant publication.
