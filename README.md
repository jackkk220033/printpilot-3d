# JJ3D v4.11.31 — Commandes personnalisées et suivi de production

Version complète basée sur JJ3D v4.11.29, avec le correctif connu de synchronisation automatique Boutique (v4.11.27) et le filigrane PAYÉ sur les factures mobiles conservés.

## Commandes personnalisées saisies par l'administrateur

Le menu **Commandes personnalisées** permet de saisir immédiatement une demande reçue en personne, par téléphone ou par Messenger : client, contact, projet, quantité, couleurs, produit lié éventuel, date de demande, date souhaitée, prix, acompte, remise, statut, notes et photo de référence. Ces commandes ont des états (nouvelle, soumission, confirmée, en production, prête, remise, annulée), peuvent être modifiées et apparaissent dans un rappel sur le tableau de bord. Elles sont **privées**, enregistrées dans `customOrders` et incluses dans le flux de sauvegarde Firebase privé et les exports JSON. Elles ne deviennent PAS des ventes ou des déductions de stock automatiquement.

## Production

- Boutons de suivi **Démarrer/Reprendre, Pause, Terminer, Échec** dans **À imprimer**. Chronométrage estimé entre les actions (il ne s'agit pas d'un relevé machine).
- **Calendrier de production** par jour et imprimante dans **À imprimer**. Les estimations de début et fin sont publiées au portail Boutique via le flux existant.
- **Avertissement filament** avant de planifier/démarrer une tâche liée à un produit connu. Compare les besoins saisis à l'inventaire numérique; si les informations sont absentes, le contrôle ne peut pas conclure.
- **Statistiques de production par imprimante** basées sur les tâches conservées (les tâches supprimées ne sont plus comptabilisées).
- Sur la page **Finances**, séparation du tarif horaire facturé et des coûts matériels; le tarif facturé n'est PAS soustrait du montant restant.

## Boutique

- **Demande personnalisée** avec photo, quantité, couleurs et date souhaitée dans le portail. Les demandes sont reçues dans **Demandes Boutique** côté Atelier+, où elles peuvent être acceptées et ajoutées à la file de production (durée à préciser), ou refusées. Les règles Firestore incluses doivent être publiées pour autoriser ce nouveau flux.
- **Avis Boutique** sur impressions terminées, bons envoyés et réceptions en attente de validation, selon les données visibles au portail.

## Sauvegardes

Nouvelle page **Sauvegardes**. L'application conserve jusqu'à huit états précédents localement (au plus une capture toutes les deux minutes) et propose une restauration avec confirmation. **Ce n'est pas une sauvegarde cloud indépendante** : elle peut disparaître en vidant les données du navigateur. Exporter un JSON reste recommandé.

## Installation et précautions

1. Avant mise à jour, exporter une sauvegarde JSON complète depuis JJ3D.
2. Publier **le contenu entier** du dossier sur GitHub Pages, sans modifier les réglages Firebase existants.
3. Publier les règles incluses dans `firestore.rules` depuis Firestore Database → Rules pour que les demandes personnalisées Boutique puissent être créées.
4. Actualiser avec Ctrl+Shift+R; sur téléphone fermer et rouvrir la PWA si nécessaire.
5. Vérifier une commande d'essai de bout en bout avant d'enregistrer une vraie demande. Ne pas considérer les dates d'impression comme horaires réels de l'imprimante.

Les photos de commandes admin sont sauvegardées séparément de l'état JSON et synchronisées avec le système de photos privé quand celui-ci est prêt. La restauration JSON ne recrée pas automatiquement les images perdues.

## Nouveauté v4.11.31 : commandes personnalisées
- Forme vase/rond (hauteur et diamètre) ou rectangulaire (L × l × H).
- Conversion automatique et aperçu en millimètres, saisie libre `1'`, `6"`, `1' 6"`, `30 cm`, `304.8 mm`, `6 in`; nombres sans unité selon le menu sélectionné.
- Dimensions originales et conversions conservées dans les données privées des commandes, modifiables plus tard.
- Photo du produit et photo de la couleur séparées (Firestore photos).
- Case à cocher d'achat spécial de filament, prix d'achat affiché conditionnellement.
- Exemple : 1 pied = 304,8 mm ; 6 pouces = 152,4 mm.
