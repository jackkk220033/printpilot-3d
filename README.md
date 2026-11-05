# PrintPilot 3D v3.6 — Produits, prix et coûts

Cette version conserve les fonctions de la v3.5 (cloud, photos, XLSM, inventaires, ventes, finances, catalogue) et ajoute :

- **Produits > Ajouter un produit** avec identifiant interne et ID stock numérique automatique.
- Modification des produits existants, notamment du prix et de la durée.
- Bobines et grammes **par unité** avec calcul du prix réel du filament selon `prix de la bobine / grammes initiaux × grammes utilisés`.
- Autres coûts, prix de vente, commission et estimation du profit.
- Durée saisie en heures et minutes, dans les fiches produits **et** les impressions.
- Photo prise avec le téléphone ou sélectionnée dans le navigateur, enregistrée sous la référence du produit puis synchronisée si Firebase est connecté et les règles photo v3.5 sont publiées.
- Les nouveaux produits s'affichent dans **Produits, Catalogue à partager, Finances et sélection des impressions**.

## Important : stock et prix

**Créer une fiche produit ne déduit pas de filament.** La déduction réelle a lieu quand une nouvelle impression est enregistrée dans **Impressions**. Cela évite de déduire deux fois la matière. La quantité initiale en stock se renseigne manuellement à la création du produit; la gestion des impressions n'augmente pas encore automatiquement le nombre de produits finis.

Les coûts sont une **estimation des matériaux** et autres frais saisis. Ils n'incluent pas l'électricité ou l'amortissement sauf si ajoutés aux « autres coûts ». La commission de 30 % est modifiable.

## Publication GitHub Pages

1. Faire une sauvegarde JSON complète dans l'ancienne version.
2. Mettre les fichiers `index.html`, `css/style.css` et les fichiers `js/` du dossier de cette v3.6 à la **racine de la branche main** (ne pas créer uniquement une Release).
3. Éviter de publier l'Excel, les photos privées ou les sauvegardes JSON.
4. Conserver les règles Firestore v3.5 en place. Les photos v3.6 utilisent le même format et les mêmes règles.
5. Après publication, actualiser le site, se connecter à Firebase, ouvrir **Produits > Ajouter un produit**, renseigner les coûts et sauvegarder.
6. Vérifier la nouvelle fiche dans **Catalogue à partager**, puis confirmer sa présence depuis un autre appareil connecté.

## Tests effectués

Syntaxe JavaScript vérifiée et fichiers ZIP testés. Le navigateur automatisé de cet environnement bloque les pages locales; les interactions réelles (Firebase, photo, téléphone) doivent être testées depuis votre navigateur avant usage de production.
