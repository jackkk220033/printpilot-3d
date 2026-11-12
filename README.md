# JJ3D v4.11.50 — Commandes et factures Boutique automatiques

## Changements
- Les tickets reçus de la Boutique sont rapprochés automatiquement du registre Commandes personnalisées.
- Une facture brouillon liée est créée une seule fois par ticket.
- Après ajout du prix, la facture est partagée automatiquement dans le suivi Boutique (également pour les anciens tickets approuvés).
- Une fois le paiement **vérifié**, les statuts de la facture et de la commande sont rapprochés et la copie Boutique affiche un gros tampon PAYÉ à l'impression.
- Un bouton `Synchroniser commandes et factures` dans Atelier > Demandes permet de relancer la mise en correspondance.
- Aucun effacement ou reconstruction des autres commandes existantes.

## Important
Avant de déployer, faire une sauvegarde JSON complète. Déployer tout le dossier (y compris js, sw.js et boutique.html), puis forcer une actualisation des deux portails. Cette mise à jour ne nécessite pas de nouvelles règles Firestore.

**Condition :** l'administrateur doit ouvrir JJ3D avec sa session Firebase active afin que les nouveaux tickets soient enregistrés dans l'espace privé. Le portail Boutique peut continuer à collecter les tickets quand JJ3D est fermé. La synchronisation privée se fait à la prochaine connexion administrateur.

La facturation réelle, les taxes et la validité d'un paiement restent à vérifier par l'administrateur. Les notifications push en arrière-plan ne sont pas incluses ici.
