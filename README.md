# PrintPilot 3D v3.5 — photos et caméra mobile

Version construite depuis la v3.4 Firebase. Aucune installation Node.js requise.

## Avant de publier

1. Sauvegarder PrintPilot (JSON) et garder les photos originales.
2. Dans Firebase Console → Firestore → **Règles**, remplacer les règles par le contenu exact de `firestore.rules` puis cliquer **Publier**. Sans cette étape, le cloud refuse les photos; le reste de l’inventaire demeure utilisable.
3. Sur GitHub, remplacer les fichiers du site avec ceux du dossier v3.5 (index.html, css, js et .nojekyll). Ne publier ni Excel, ni JSON privées. Les règles peuvent rester hors du dépôt public.
4. Ouvrir le site HTTPS GitHub Pages, se connecter au compte Firebase existant via « Synchronisation ».
5. **Sur le téléphone qui possède les photos anciennes** : ouvrir « Synchronisation » puis cliquer « ↑ Envoyer mes anciennes photos locales vers le cloud ». Le site conserve toutes les photos cloud déjà présentes; il ne les remplace pas.
6. Sur ordinateur, ouvrir Produits ou Catalogue. Les photos cloud se chargent après la connexion.

## Utilisation

- **Produits** et **Catalogue** : « Prendre photo » pour proposer l’appareil photo du téléphone; « Choisir photo » pour importer une image depuis l’appareil.
- **Impressions** : lors d’une nouvelle impression, « Prendre une photo » ou « Choisir une image ». La photo d’impression est enregistrée lorsque l’impression elle-même est enregistrée. Pour des impressions antérieures, ouvrir « Modifier ».
- Les photos sont compressées en JPEG jusqu’à 720 px sur le côté le plus long et moins de 285 kB en chaîne Base64.
- Sur certains navigateurs mobiles, le choix appareil photo / photothèque appartient au système; `capture=environment` est un indice, pas une garantie.

## Stockage et coûts

Cette version utilise les documents d’une sous-collection **Firestore** (`workspaces/{uid}/photos`), et NON Firebase Storage. Elle ne nécessite donc pas l’activation de Firebase Storage/Blaze pour cette fonctionnalité, mais consomme les quotas Firestore, les lectures et le stockage disponibles sur Spark. Elle convient aux petites photos de produits et non aux originaux haute résolution. Un document par photo; une photo par produit ou impression pour le moment. Si le projet grossit, migrer les fichiers image vers une solution de stockage dédiée.

## Sécurité / partage

Les règles limitent la lecture et l’écriture des photos au compte propriétaire (comme pour les inventaires). Les utilisateurs connectés à des comptes séparés n'accèdent pas encore au même inventaire. Ne donne pas l’accès à ta belle-mère avant le développement d’un accès Boutique limité.

## Notes importantes

- Ne pas réimporter l’Excel si le stock est déjà dans le cloud.
- Ne pas effacer les données du téléphone ni le cache tant que le transfert photo n’est pas confirmé sur l’ordinateur.
- La version utilise le même Firestore et les mêmes clés de données que la v3.4. Photos conservées localement même en cas d’échec réseau; le panneau Synchronisation permet leur migration ensuite.
- Les tests de syntaxe des fichiers sont faits localement, mais la connexion au projet Firebase et les permissions doivent être testées sur le vrai site après la publication des nouvelles règles.
