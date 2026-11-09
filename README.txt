PRINTPILOT 3D — CORRECTIF POPUPS

Ce correctif apporte :
1. Le X devient rouge au survol (ou au focus clavier).
2. Cliquer à l'extérieur d'un popup <dialog> le ferme, sans fermer au clic dans le formulaire.

Pour installer sur ta DERNIÈRE version sans perdre les changements :
1. Copie js/popup-behavior.js dans le dossier js/ de ton site.
2. Dans index.html, juste AVANT </body>, ajoute :
   <script defer src="js/popup-behavior.js?v=1"></script>
3. Republie les fichiers du site comme d'habitude.

Il n'est pas nécessaire de modifier les données ni les paramètres Firebase.

ATTENTION : ce correctif prend en charge les fenêtres natives <dialog> de PrintPilot.
Certaines fenêtres créées autrement nécessiteraient un traitement spécifique.
