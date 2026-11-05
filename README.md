# PrintPilot v4.7 — Portail Boutique sécurisé

## Installation
1. Faire **Exporter une sauvegarde** JSON depuis PrintPilot v4.6.3.
2. Envoyer à GitHub Pages tous les fichiers du ZIP en conservant les chemins, y compris **boutique.html, css/boutique.css, js/boutique.js et firestore.rules**.
3. **ESSENTIEL** : dans console.firebase.google.com → projet printpilot-3d → Firestore Database → Rules, remplacer les règles existantes par le contenu complet de `firestore.rules` et cliquer Publish. GitHub Pages ne déploie pas les règles Firestore.
4. Depuis le site principal, se connecter avec le compte administrateur Firebase qui contient l'inventaire, et vérifier `☁ Synchronisation active`.
5. Créer le compte Boutique depuis Firebase Authentication → Users → Add user. Choisir un vrai mot de passe unique (pas 123). Copier son UID (identifiant utilisateur), pas le mot de passe.
6. Dans PrintPilot → Synchronisation → Portail Boutique, coller l'UID dans le champ, puis cliquer **Autoriser ce compte**.
7. Cliquer **Publier / actualiser le catalogue**, attendre la fin. Seules les données autorisées sont copiées.
8. Copier le lien `boutique.html?atelier=<UID_ADMIN>` depuis le champ et l'envoyer à la boutique. La boutique s'y connecte avec son compte.
9. Republier après changements de produits, stocks, prix ou photos. Pour retirer l’accès, saisir le même UID et **Révoquer ce compte**.

## Protection
- Le document `/workspaces/{ownerUid}` reste strictement accessible à son propriétaire.
- Le compte boutique ne peut lire que `/boutiques/{ownerUid}/catalogue/current` et ses photos publiées; il n'a pas accès aux finances, profits, ventes, commandes, filaments, historique ni aux photos privées.
- Autorisation par UID, révocable dans l’interface admin. Un nouveau compte sans autorisation ne peut rien consulter.
- Catalogue de lecture seule. Les quantités sont un **instantané** de la dernière publication, pas une modification de l'inventaire réel.
- Ne pas ouvrir l'index.html principal avec le compte Boutique sur l'ordinateur administrateur; le portail dédié fonctionne indépendamment.
- Les photos visibles dans le portail sont seulement celles déjà synchronisées dans le cloud admin. Les photos locales non synchronisées ne seront pas incluses.
- Aucun changement à la logique des stocks, du temps ou aux objets Firebase historiques.
