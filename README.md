# PrintPilot 3D v4.8.1 — Notifications et suppression de messages

Version basée sur la v4.8 (portail boutique + messages fonctionnels).

## Changements
- Badge rouge en direct dans le menu « Messages Boutique » (bureau et menu Plus sur mobile) : nombre de messages **non lus**.
- Le badge se met à jour dès qu’un commentaire est reçu, marqué lu/non lu ou supprimé via Firestore onSnapshot. Pas besoin de rafraîchir ou d’ouvrir la boîte de réception.
- Bouton « Supprimer » par commentaire dans `messages.html`, avec confirmation avant suppression définitive.
- Titre `v4.8.1` dans les onglets.
- Règles Firestore complètes avec suppression des **messages seulement par le propriétaire**; création également autorisée au propriétaire (en accord avec la correction v4.8 déjà effectuée manuellement).

## Installation
1. Exporter une sauvegarde JSON du site administrateur.
2. Mettre à jour les fichiers du site GitHub (index.html, messages.html, boutique.html, css/style.css, css/boutique.css, js/cloud.js, js/messages.js). Garder les autres fichiers du ZIP à l'identique ou remplacer le dossier complet.
3. Dans Firebase Console → Firestore Database → Rules, remplacer **tout** par le `firestore.rules` joint puis publier. Ces règles préservent les collections privées et la sécurité du portail.
4. Après déploiement GitHub Pages, recharger le site (Ctrl+Shift+R sur PC) et vérifier `v4.8.1`.
5. Envoyer un message test via le compte boutique ; confirmer le badge `1`, puis marquer lu ou supprimer et confirmer le retour à zéro.

Le badge apparaît tant que PrintPilot est ouvert, la connexion Firebase est active et le propriétaire est connecté. Il ne s'agit pas d'une notification système ou d'un email. Les messages supprimés sont définitivement effacés de Firestore.

**Attention :** le ZIP contient une copie statique de `js/firebase-config.js` depuis la v4.8 source. Vérifier que ce fichier correspond au projet Firebase actuel (ne pas changer de projet).
