# JJ3D v4.11.55 — Notifications téléphone et suppression

## Ce qui marche après publication des fichiers du site
- 🗑 Supprimer une notification, ou toutes les supprimer, sans supprimer aucune commande/facture.
- Historique lu/supprimé synchronisé entre appareils lorsque les nouvelles règles Firestore sont publiées et les Cloud Functions génèrent les événements.
- Bouton **📱 Activer les notifications sur téléphone** dans **Notifications**.
- Badge PWA via `setAppBadge` quand le navigateur/OS le prend en charge. Sur Android, un point peut remplacer le chiffre. Aucun chiffre n'est garanti par le système.

## IMPORTANT : la réception téléphone avec l’app FERMÉE exige la configuration Firebase serveur
Les fichiers HTML seuls ne peuvent pas envoyer des notifications push en arrière-plan. Il faut :

1. Dans Firebase Console, projet `printpilot-3d`, activer **Cloud Messaging** puis **Web Push certificates**. Générer une paire de clés, copier uniquement la **clé publique VAPID**.
2. ✅ Clé publique VAPID déjà insérée dans `js/firebase-config.js`. **Ne jamais partager de clé privée ni de compte de service**.
3. Activer la facturation **Blaze** Firebase si demandé (Cloud Functions v2 nécessite le plan éligible). Vérifier les coûts/quotas.
4. Sur un ordinateur où Node.js + Firebase CLI sont disponibles : installer Firebase CLI et faire :

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   cd functions && npm install && cd ..
   firebase deploy --only functions,firestore:rules --project printpilot-3d
   ```

   Le dossier `functions` et `firebase.json` sont inclus dans ce ZIP. IMPORTANT : **ne pas copier le dossier functions dans un hébergement public GitHub Pages**; le déployer uniquement via la CLI Firebase. Le site statique est publié séparément sur GitHub Pages.
5. Publier `index.html`, `sw.js`, `js/`, `css/`, `icons/`, `manifest.webmanifest` et les autres pages sur GitHub Pages.
6. Installer JJ3D depuis l'écran d'accueil du téléphone, ouvrir l'app, se connecter à son compte **administrateur JJ3D**, aller à **Notifications** et cliquer **📱 Activer les notifications sur téléphone**. Autoriser les notifications OS.
7. Depuis le compte Boutique, créer une nouvelle demande ou envoyer un message. Le téléphone admin inscrit devrait recevoir la notification même si JJ3D est fermé, et retrouver l'événement dans l'historique.

## Compatibilité mobile
- iOS : iOS/iPadOS 16.4+, Safari, application ajoutée à l'écran d'accueil, permission demandée **depuis l'app installée**; les badges PWA sont pris en charge si autorisés par le système.
- Android : Chrome/Edge PWA et permissions appareil/navigateur nécessaires; un point plutôt qu'un chiffre peut apparaître sur l'icône, selon le lanceur Android.
- Les permissions OS, les réglages de batterie et les clés VAPID peuvent empêcher l'affichage; tester sur le vrai appareil.
- Sans déploiement du backend, le bouton affiche la configuration manquante et les notifications **locales quand l'app est ouverte** continuent à fonctionner.

## Sécurité et données
- Déclencheurs Cloud Functions uniquement sur les changements Boutique Firestore.
- Jetons FCM stockés dans `workspaces/{ownerUid}/pushTokens`, privés au propriétaire.
- Notifications enregistrées dans `workspaces/{ownerUid}/notifications`; elles peuvent être lues ou supprimées par le propriétaire. Seules les fonctions serveur peuvent créer un événement.
- Les créations de notifications ne modifient ni l'inventaire, ni les commandes, ni les factures.
- Pour supprimer les anciennes notifications purement locales de v4.11.53, utilise le bouton de suppression.
- **Sauvegarde JSON avant la mise à jour** et test sur une vraie nouvelle commande.

## Limites connues
- Si les fonctions ne sont pas déployées, les nouvelles notifications n'apparaîtront pas sur le téléphone fermé.
- Badge de l'icône : meilleure tentative via l'API Badging; ne peut pas forcer un chiffre sur tous les téléphones.
- Les notifications créées dans l'ancien cache local de l'ordinateur ne sont pas rétro-synchronisées sur le téléphone; les nouveaux événements serveur le sont.
