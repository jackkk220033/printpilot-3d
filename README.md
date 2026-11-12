# JJ3D v4.11.42 — Demandes Boutique / dates / règlement

Version complète à publier sur GitHub Pages, issue de v4.11.40.

- Correctif d’envoi des demandes personnalisées Boutique : `f.elements.item` désignait la méthode `item()` du navigateur au lieu du champ « Projet à fabriquer ». Utilise `namedItem('item')`.
- Messages visibles en cas d’échec; ne vide pas le formulaire si l’envoi échoue.
- Bouton calendrier à côté de « Date souhaitée » dans le formulaire Boutique; calendrier natif du navigateur.
- Case de confirmation Boutique mieux alignée.
- Commandes administrateur : la case « J’ai reçu ma part de la Boutique » est maintenant expliquée et n’apparaît que si l’encaissement est effectué par la Boutique. Elle ne signifie **pas** que le client a payé.
- Dates administrateur : ouverture du sélecteur natif lors du clic, lorsque le navigateur le prend en charge.

Aucun changement aux règles Firestore. Conserve la synchronisation automatique catalogue et le filigrane PAYÉ corrigé. Faire une sauvegarde JSON avant déploiement. Vérifier avec les comptes réels après publication.


## v4.11.42 — Boutique : impressions séparées
- Onglet À venir · Boutique : impressions du stock et commandes du catalogue, plus tâches libres explicitement marquées « Pour la Boutique ».
- Onglet Commandes spéciales : tâches de demandes personnalisées provenant de la Boutique et historique des demandes envoyé par son compte.
- Projets personnels et commandes personnalisées privées non publiés dans le document de planification Boutique. Par défaut, toute nouvelle impression libre est **Personnel / atelier**.
- Sur la page administrateur À imprimer, le champ Destination peut être modifié pour les impressions libres.
- Les changements sont publiés par les deux chemins Firebase : Atelier+ et synchronisation commande.
- Aucune modification aux règles Firestore nécessaire.

Attention : les anciennes tâches libres sont considérées personnelles par défaut; pour les afficher à la Boutique, ouvrir Modifier puis choisir « Pour la Boutique ».
