# JJ3D v4.11.34 — Commandes personnalisées et suivi de production

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

## Nouveauté v4.11.34 : commandes personnalisées
- Forme vase/rond (hauteur et diamètre) ou rectangulaire (L × l × H).
- Conversion automatique et aperçu en millimètres, saisie libre `1'`, `6"`, `1' 6"`, `30 cm`, `304.8 mm`, `6 in`; nombres sans unité selon le menu sélectionné.
- Dimensions originales et conversions conservées dans les données privées des commandes, modifiables plus tard.
- Photo du produit et photo de la couleur séparées (Firestore photos).
- Case à cocher d'achat spécial de filament, prix d'achat affiché conditionnellement.
- Exemple : 1 pied = 304,8 mm ; 6 pouces = 152,4 mm.


## v4.11.34 — correctif enregistrement commandes
- Formulaire sans validation navigateur silencieuse; erreurs visibles avec notification et focus sur le champ concerné.
- Commande possible avant fixation du prix final, même si un acompte a été reçu.
- Champs filament séparés : type et couleur.
- Confirmation d’enregistrement, traitement des photos séparé et gestion des exceptions.
- Synchronisation automatique Boutique et filigrane PAYÉ de v4.11.29 conservés.


## v4.11.34 — Erreur FormData et modification des commandes
- Correction de la cible de l'événement `submit`: `event.target` désigne le vrai `<form>`; `event.currentTarget` désignait `document` dans l'écouteur délégué, ce qui faisait échouer `new FormData(...)`.
- Les commandes enregistrées comportent **Modifier la commande**. Le formulaire recharge les informations, la forme, les dimensions, le filament et l'état Oui/Non pour achat spécial.
- Après modification, l'identifiant d'origine est conservé, donc aucune commande doublon.
- Les photos existantes restent associées à la commande si aucune nouvelle photo n'est choisie.
- L'enregistrement reste local + synchronisation Firebase privée déjà existante; aucun changement aux règles.


## v4.11.34 — Commande → facture, achat de filament

- Toute nouvelle commande personnalisée crée une facture **brouillon privée**, liée à la commande, dans la section Factures. Elle n'est ni envoyée ni payée automatiquement.
- Bouton « Ouvrir la facture » dans chaque commande. Une facture déjà liée est réutilisée et ne sera jamais dupliquée.
- Le brouillon suit les modifications de commande ; une facture envoyée, payée ou annulée n'est pas écrasée automatiquement.
- Pour chaque commande avec achat spécial de filament, entrer prix de la bobine, pourcentage facturé (0–100 %) et choisir « ajouter au prix » ou « déjà inclus ». Si le projet est 50 $ et le supplément 15 $, la facture brouillon fait 65 $ (taxes par défaut à 0 %, à régler selon obligations applicables).
- Le montant d'acompte est conservé dans le suivi de commande et rappelé dans les notes de facture, **mais n'est pas automatiquement déduit ni considéré comme un paiement**. Vérifier tout solde avant d'envoyer.
- Facture et commande sont écrites ensemble au même endroit avant les photos, puis incluses dans les sauvegardes JSON/Firebase existantes.
- La création de facture ne crée pas de vente et ne déduit pas le stock.
- Le coût de la bobine et le supplément de prix sont deux informations distinctes; attention à ne pas refacturer le filament déjà inclus dans le prix convenu.

**Test recommandé** : enregistrement d'une commande test avec 20 $ de filament à 50 % ajouté et 40 $ de prix de projet → brouillon à 50 $ ; modifier à 25 % → brouillon à 45 $ ; passer la facture « envoyée » et modifier à nouveau la commande → la facture envoyée reste inchangée.
