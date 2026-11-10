# JJ3D v4.11.12 — Factures clients

Version complète basée sur JJ3D v4.11.11.

## Fonctions
- Nouvelle section Factures (administration uniquement) dans le menu Outils.
- Numéro séquentiel JJ3D-AAAA-0001, saisie client, produits catalogue + lignes libres, livraison, remise, taxes facultatives, échéance et notes.
- PDF : ouvrir la facture imprimable, puis choisir **Enregistrer en PDF** dans la boîte d'impression du navigateur.
- Courriel : ouvre un brouillon dans l'application de messagerie. **Le PDF n'est pas joint automatiquement**; joindre soi-même le PDF enregistré.
- Brouillon / envoyée / payée / annulée; statistiques et historique.
- Créer une facture à partir d'une vente déjà enregistrée (sans doubler la vente ni retirer du stock).
- Factures, coordonnées d'émetteur et statuts inclus dans le snapshot de synchronisation Firebase, sans nouvelles règles Firestore.

## Attention
- Configurer ses renseignements commerciaux via « Coordonnées de facturation ».
- Taxes : 0 % par défaut, ne pas percevoir de taxe sans configuration appropriée; valider obligations applicables.
- La facture n'envoie PAS automatiquement un email et n'encaisse PAS de paiement.
- Les factures n'affectent pas les stocks ni le journal de ventes.
- Le PDF s'obtient via Impression du navigateur (destination Enregistrer en PDF), y compris sur téléphone si cette option est disponible.
- Sauvegarder son JSON avant la première migration et vérifier la synchronisation cloud.
