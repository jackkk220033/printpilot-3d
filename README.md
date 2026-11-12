# JJ3D v4.11.39 — Boutique → Soumission → Facture → Paiement → Production

## Changements
- Navigation rapide : Commandes personnalisées dans Espace de travail; accès aussi depuis Produits.
- Commandes : détails en panneaux, résumé type facture et approbation client, lien vers aperçu et commission Boutique.
- Finances : Ventes → Coûts matière → Liste des prix. Doublons possibles identifiés par produit/montant/quantité : action **Masquer** explicite et réversible (aucune suppression automatique des vraies ventes).
- Portail Boutique : nom complet du client, téléphone, email, projet, quantité, couleur, date souhaitée, photo, précisions, consentement à l'évaluation. Mes demandes envoyées, prix confirmé, lien aperçu et déclaration d'un paiement reçu par la Boutique.
- Admin demandes Boutique : importer sans lancer d'impression, approuver modèle/prix, demander paiement, vérifier paiement déclaré. Une facture PAYÉE crée une vente (sans nouvelle déduction de stock); la commission Boutique est incluse dans le profit estimé si configurée.
- Autorisation production : les commandes importées ont `productionHold:true`, donc ne créent une tâche dans À imprimer qu'après vérification administrative du paiement.

## Installation
1. Sauvegarder le JSON JJ3D actuel.
2. Publier tous les fichiers du ZIP sur GitHub Pages.
3. **IMPORTANT : remplacer les règles Firestore par le fichier `firestore.rules` du ZIP et les publier**. Sinon les nouveaux champs Boutique et déclarations de paiement seront refusés.
4. Recharger la PWA et le portail Boutique (Ctrl+Shift+R). Mettre à jour les deux côtés.

## Tests de validation recommandés
- Créer une demande Boutique avec nom complet/téléphone/email. Vérifier qu'elle apparaît dans Atelier → Demandes Boutique.
- Importer; ouvrir Commandes personnalisées, indiquer le prix, le lien d'aperçu et approbation; la demande ne doit pas apparaître dans À imprimer.
- Revenir dans Demandes Boutique et cliquer « Client a approuvé — demander paiement »; vérifier le montant dans le portail Boutique.
- Signaler paiement dans la Boutique; l'admin doit le voir sans qu'il soit encore validé.
- Vérifier paiement en admin; contrôler facture PAYÉE, une vente financière unique, commission, puis tâche À imprimer.
- Masquer et rétablir un doublon de vente directe (conserver la vente historique).
- Vérifier facture PDF et timbre PAYÉ, auto-publication du catalogue et utilisation mobile.

**Limites** : la Boutique peut déclarer qu'elle a encaissé un montant, mais JJ3D ne vérifie pas automatiquement le mouvement bancaire. L'administrateur doit le vérifier. Le modèle/aperçu est partagé par lien HTTPS, pas par envoi automatique de fichier/email. Les demandes anciennes sans téléphone/courriel restent lisibles. L'application ne comptabilise pas automatiquement les remboursements.
