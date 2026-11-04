# PrintPilot 3D v3.0 — sans Node.js

La v2.3 reste inchangée et sert de point de retour. La v3.0 ajoute l’accès en ligne via GitHub Pages et une synchronisation Firebase Firestore **facultative**. Les données déjà présentes dans Edge ne sont pas envoyées tant que tu n’actives pas explicitement la migration.

## 1. AVANT TOUT : sauvegarder

Dans la v2.3, utilise l’option **Exporter une sauvegarde complète JSON**. Conserve le dossier v2.3 et son fichier JSON. **Ne vide jamais les données du site ni Local Storage.** Le stockage de `127.0.0.1:5500` est différent du futur site GitHub Pages.

## 2. Créer Firebase (une fois, depuis un appareil autorisé)

1. Va sur https://console.firebase.google.com/ et crée un projet.
2. Dans **Build > Authentication > Sign-in method**, active **Email/Password**.
3. Dans **Build > Firestore Database**, crée une base en mode production.
4. Ouvre **Firestore Database > Rules**, colle `firestore.rules` et clique sur **Publish**. **N’utilise pas** de règle `allow read, write: if true` ni `if request.auth != null` pour tout le projet.
5. Dans **Project settings > Your apps**, enregistre une app **Web (</>)**. Copie `apiKey`, `authDomain`, `projectId`, `appId` dans `js/firebase-config.js`. Ces quatre paramètres sont publics; ne copie PAS de mot de passe, clé privée ou fichier de compte de service.
6. Dans Authentication > Settings > Authorized domains, ajoute le domaine de publication si nécessaire (par ex. `<pseudo>.github.io`).

**Attention** : un nouveau projet peut nécessiter une configuration de facturation ou des quotas selon les produits; vérifie ton plan et les limites dans Firebase. Les photos IndexedDB ne sont **pas** synchronisées en v3.0.

## 3. Tester localement avec Live Server

- Ouvre la v3.0 sur l’**adresse exacte** utilisée pour la v2.3 : `http://127.0.0.1:5500` (ne passe pas à `localhost` si tu utilisais `127.0.0.1`).
- Ouvre **☁ Synchronisation**, crée ou connecte ton compte privé.
- Vérifie tes 63 bobines, les produits, le hardware et les impressions avant de cliquer **Activer / envoyer mes données locales**.
- Au **premier** envoi, la sauvegarde cloud est créée. Sur un autre appareil, connecte-toi au même compte, puis clique **Charger les données cloud**.
- Une fois relié, le navigateur synchronise automatiquement les changements de stocks, impressions et hardware. En cas de conflits ou de perte de réseau, il s’arrête et conserve les données locales sans écrasement silencieux. Conserve tes exports JSON.

## 4. Publier avec GitHub Pages (sans ligne de commande)

1. Crée un dépôt GitHub, par ex. `printpilot-3d`. Sur un compte GitHub Free, le dépôt Pages doit généralement être **public**. **Ne publie jamais ton Excel, tes sauvegardes JSON, tes photos ou des données privées** dans ce dépôt.
2. Téléverse le contenu du dossier `printpilot-3d-v3.0` : `index.html`, `css/`, `js/`, `.nojekyll`. Le fichier privé `js/import-data.js` a été **exclu de cette version** pour éviter la publication de ton Excel.
3. Confirme que le dépôt ne contient pas ton Excel ni `import-data.js`. Les données privées restent dans Firestore après migration.
4. Dans GitHub > Settings > Pages, choisis **Deploy from a branch** > `main` > `/(root)` puis **Save**.
5. Ouvre l’URL Pages depuis ton téléphone, connecte-toi à Firebase et clique **Charger les données cloud**. Tu peux ajouter un raccourci sur l’écran d’accueil.

## Limitations et sécurité

- **Très important : `js/import-data.js` (présent dans les anciennes versions) embarque le contenu du classeur Excel. Il est volontairement absent de la v3.0. Ne le publie jamais.**
- Le site web publié est public (interface + configuration Firebase publique), mais la base de données **privée** est protégée par Firebase Authentication et les règles Firestore.
- La v3.0 synchronise le contenu stocké dans `localStorage` (filaments, impressions, produits, ventes, hardware), **pas les photos** stockées dans `IndexedDB`.
- Le cloud est actuellement un espace **personnel par compte**. **Ne donne pas ton mot de passe à ta belle-mère** : on construira ensuite un catalogue public séparé avec uniquement ID, photo, prix et quantité à partager.
- Synchronisation optimiste : le système détecte une version cloud modifiée au lieu de la remplacer silencieusement. Ce n’est pas une garantie transactionnelle à travers plusieurs écritures hors ligne. Pour les inventaires critiques, fais régulièrement un export JSON.
- Le document Firestore doit rester inférieur à 1 Mio; pour un grand catalogue, il faudra migrer vers des collections par produit/bobine (v3.1+).


## v3.1 : Suivi des ventes

Dans **Ventes**, clique **Enregistrer une vente**. Choisis un produit par son ID stock ou son ID Excel, la quantité, le canal, le prix et la commission (30 % par défaut pour la boutique). Le coût et le profit sont calculés à partir de la fiche produit. La vente et la réduction du **stock de produits** sont sauvegardées ensemble dans `printpilot-excel-extras-v1`. Le stock de **filament ne change pas à la vente** : il a déjà été consommé à la fabrication.

Chaque vente peut être modifiée ou annulée; les quantités sont alors recalculées. Les ventes importées de l'Excel restent en lecture seule pour éviter une double soustraction. Les ventes annulées restent visibles mais ne sont pas comprises dans les statistiques et finances. Un export JSON complet reste disponible dans Impressions.

**Test recommandé** : avant de vendre réellement, utilise un produit avec 2 unités en stock; enregistre une vente de 1 unité, puis annule-la pour confirmer le retour de 2 unités.

**Cloud** : Les ventes sont incluses dans les snapshots Firebase existants. Lorsque la configuration Cloud n'est pas terminée, les ventes restent locales au navigateur.


## v3.2 : bouton d’importation Excel restauré (sans exposition publique)

- Le bouton « Importer mon Excel » est de retour sur Tableau de bord, Filaments et Produits.
- Pour la sécurité du site publié sur GitHub Pages, il ouvre un **fichier JSON personnel** préparé à partir de ton Excel original (`PrintPilot-Donnees-Excel-PRIVEES.json`, fourni séparément). Il ne lit **pas directement le .xlsm**.
- Garde le JSON sur ton ordinateur personnel : **ne le téléverse jamais vers GitHub / le dépôt public**. Aucune donnée privée Excel n'est incluse dans le ZIP du site.
- L'importation ajoute uniquement les références manquantes. Elle n'écrase pas les poids restants, quantités vendues, stocks modifiés, prix déjà édités ni les nouvelles ventes. Les impressions existantes restent intactes.
- La synchronisation Cloud est une configuration indépendante : l'importation s'effectue d'abord localement, puis le flux Cloud peut être activé explicitement.
- Effectue un export JSON avant l'import et garde une copie v3.1.


## v3.3 — Import direct du classeur XLSM

Clique sur **Importer mon Excel (.xlsm)** et choisis le fichier Excel original `Inventaire3D_Hardware.xlsm`. Le site lit dans ton navigateur les onglets « Filaments », « Produits 3D », « Hardware - Supplies » et « Ventes » grâce à SheetJS. Les macros VBA du fichier ne sont **jamais exécutées**. Aucune conversion JSON manuelle n'est nécessaire.

La bibliothèque SheetJS est chargée par CDN : il faut avoir accès à `cdn.sheetjs.com` sur ce réseau. Si le site ne peut pas charger cette bibliothèque, il affiche une explication au lieu d'effacer les données. L'import reste **non destructif** : il ne remplace pas les références existantes et demande une confirmation. Vérifie les décomptes avant validation.

Les calculs Excel (notamment les quantités calculées par formule) sont lus à partir des **valeurs enregistrées dans le fichier**; avant d'importer, enregistre le classeur dans Excel pour que les valeurs soient à jour. L'application ne reproduit pas et n'exécute pas les macros Excel.


## Configuration Firebase v3.4
La configuration Web publique du projet printpilot-3d est deja inseree dans js/firebase-config.js. Ne pas coller le snippet HTML de Firebase dans index.html. Connecte-toi depuis le bouton Synchronisation de PrintPilot, puis fais une sauvegarde JSON et envoie la copie locale vers le cloud seulement apres verification des donnees. Les photos ne sont pas encore synchronisees.
