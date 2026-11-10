# PrintPilot 3D v4.11.8 — Application installable (PWA)

Version complète basée sur la v4.11.7. Tous les modules existants et les règles Firestore sont conservés.

## Installation
1. Publier le contenu complet de ce dossier sur Firebase Hosting HTTPS.
2. Ouvrir `index.html` dans Chrome/Edge sur Android ou ordinateur; utiliser « 📲 Installer PrintPilot ».
3. Sur iPhone/iPad, ouvrir dans Safari puis Partager → Sur l'écran d'accueil → Ajouter.
4. La personne avec accès Boutique continue de se connecter au moyen de ses identifiants habituels; les autorisations Firebase ne changent pas.

## Notes importantes
- La PWA ouvre dans une fenêtre autonome avec son icône. Elle reste le même site et utilise le même Firebase.
- Le bouton explique aussi l'installation manuelle si le navigateur n'offre pas de fenêtre native.
- L'application n'est pas publiée dans Google Play ou App Store.
- La connexion est nécessaire pour les données Firebase. L'utilisation hors connexion et la synchronisation de données différée ne sont pas garanties.
- Les pages sont récupérées d'abord via le réseau pour éviter des versions périmées, avec secours de cache limité.
- Sur un hébergement sous-répertoire, conserver tous les fichiers ensemble dans ce même dossier.
- Si l'ancienne version persiste après publication, fermer puis rouvrir l'application et rafraîchir le site dans le navigateur.
